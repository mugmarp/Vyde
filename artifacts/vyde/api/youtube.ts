/**
 * Vyde Unified YouTube Provider API
 *
 * This module is the single entry point for all YouTube data operations.
 * It executes directly via client-side InnerTube for native (Android/iOS) builds,
 * and falls back to the Express proxy server for web builds where CORS prevents
 * direct InnerTube calls.
 *
 * Data flow:
 *   1. Try direct InnerTube client-side (IOS → ANDROID → TV_EMBEDDED → WEB cascade)
 *   2. On failure, fall back to /api/youtube/* Express proxy (if EXPO_PUBLIC_API_URL is set)
 *   3. Surface errors with descriptive messages so the UI can show retry options
 *
 * No YouTube Data API v3 quota is consumed for discovery, search, or playback.
 */

import { Platform } from 'react-native';
import {
  extractBrowse,
  extractSearch,
  extractPlayer,
  extractComments,
} from '@/services/innertube';

// ─── Public types ─────────────────────────────────────────────────────────────

/** Minimal video card data needed to render a feed or search result. */
export interface LiveVideo {
  id: string;
  title: string;
  description: string;
  channel: string;
  channelId: string;
  publishedAt: string;
  thumbnail: string;
  watchUrl: string;
  views?: string;
  duration?: string | null;
}

/**
 * A resolved, playable media stream candidate.
 *
 * contentType values:
 *   - `hls`            — HLS master manifest (.m3u8); adaptive audio+video; preferred for iOS/Android
 *   - `progressive`    — Muxed MP4 with both audio and video; best for simple playback and downloads
 *   - `audio`          — Audio-only adaptive stream (M4A/AAC); for background play / audio-only downloads
 *   - `adaptive-video` — Video-only adaptive stream (1080p+); requires paired audio stream for full playback
 */
export interface NativePlaybackSource {
  uri: string;
  contentType: 'progressive' | 'hls' | 'audio' | 'adaptive-video';
  qualityLabel: string;
  bitrate?: number;
  width?: number;
  height?: number;
  contentLength?: string;
  isAdaptive?: boolean;
}

/** Full video detail including streaming candidates and related videos. */
export interface LiveVideoDetails extends LiveVideo {
  views: string;
  likes: string;
  duration: string | null;
  /** Ordered list of playable streams. HLS is first when available. */
  nativePlaybackCandidates: NativePlaybackSource[];
  relatedVideos: LiveVideo[];
  livestream: boolean;
  /** Which data path was used: 'innertube-direct' | 'proxy' */
  provider: string;
}

/** A single comment as returned by InnerTube /next. */
export interface LiveComment {
  id: string;
  author: string;
  authorUrl: string;
  text: string;
  published: string;
  likes: number;
  thumbnail: string;
}

/** Comments response including total count. */
export interface LiveComments {
  commentCount: number | null;
  items: LiveComment[];
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Returns the base URL of the Express proxy API, or null if not configured.
 * On web builds, defaults to localhost:3000 when no env var is set.
 */
function getApiBase(): string | null {
  const domain = process.env.EXPO_PUBLIC_API_URL || process.env.EXPO_PUBLIC_DOMAIN;
  if (!domain) {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      return 'http://localhost:3000/api/youtube';
    }
    return null;
  }
  const clean = domain.replace(/\/$/, '');
  const prefix = clean.startsWith('http://') || clean.startsWith('https://') ? clean : `https://${clean}`;
  return prefix.endsWith('/api/youtube') ? prefix : `${prefix}/api/youtube`;
}

/**
 * Makes a GET request to the Express proxy server.
 * Throws if the proxy is not configured or returns a non-OK status.
 */
async function apiProxyGet<T>(path: string): Promise<T> {
  const base = getApiBase();
  if (!base) {
    throw new Error('API server proxy is not configured.');
  }
  const response = await fetch(`${base}${path}`);
  const body = (await response.json()) as T & { message?: string };
  if (!response.ok) {
    throw new Error(body.message ?? 'Proxy request failed.');
  }
  return body;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Fetches the trending / home feed.
 *
 * Strategy:
 *   1. Direct InnerTube /browse?browseId=FEtrending (IOS client first)
 *   2. Proxy fallback → /api/youtube/feed
 *   3. Final fallback: /browse?browseId=FEwhat_to_watch
 *
 * @param region - ISO 3166-1 alpha-2 country code (default 'US')
 */
export async function fetchLiveFeed(region = 'US'): Promise<{ items: LiveVideo[]; provider: string }> {
  try {
    const items = await extractBrowse('FEtrending');
    if (items && items.length > 0) {
      return { items, provider: 'innertube-direct' };
    }
  } catch (err) {
    console.warn('[YouTube API] Direct InnerTube feed failed, attempting fallback...', err);
  }

  try {
    return await apiProxyGet<{ items: LiveVideo[]; provider: string }>(
      `/feed?region=${encodeURIComponent(region)}`,
    );
  } catch {
    // Both primary and proxy failed — try alternate browse token
    const items = await extractBrowse('FEwhat_to_watch');
    return { items, provider: 'innertube-direct' };
  }
}

/**
 * Searches YouTube for videos matching the given query.
 *
 * Strategy:
 *   1. Direct InnerTube /search (IOS client)
 *   2. Proxy fallback → /api/youtube/search
 *
 * @param query - Search string (must be ≥ 2 characters)
 */
export async function searchYouTube(query: string): Promise<{ items: LiveVideo[]; provider: string }> {
  const normalized = query.trim();
  if (normalized.length < 2) {
    throw new Error('Search must be at least 2 characters.');
  }

  try {
    const items = await extractSearch(normalized);
    if (items && items.length > 0) {
      return { items, provider: 'innertube-direct' };
    }
  } catch (err) {
    console.warn('[YouTube API] Direct InnerTube search failed, attempting fallback...', err);
  }

  return apiProxyGet<{ items: LiveVideo[]; provider: string }>(
    `/search?q=${encodeURIComponent(normalized)}`,
  );
}

/**
 * Fetches full video details and resolves all playable streaming candidates.
 *
 * This is the core playback function. It:
 *   1. Calls InnerTube /player with cascade: IOS → ANDROID → TV_EMBEDDED → WEB
 *   2. Extracts the YouTube player JS ID and fetches base.js for cipher deciphering
 *   3. Resolves signature-ciphered URLs and defeats n-parameter throttling
 *   4. Returns HLS manifests, progressive MP4s, adaptive video streams, and audio streams
 *
 * The returned `nativePlaybackCandidates` are ordered:
 *   HLS → Progressive MP4 → Adaptive-Video → Audio-only
 *
 * @param id - YouTube video ID (11 characters, e.g. "dQw4w9WgXcQ")
 */
export async function fetchYouTubeVideo(id: string): Promise<LiveVideoDetails> {
  if (!/^[\w-]{6,20}$/.test(id)) {
    throw new Error('Invalid YouTube video ID.');
  }

  try {
    const details = await extractPlayer(id);
    return {
      ...details,
      nativePlaybackCandidates: details.nativePlaybackCandidates.map(c => ({
        uri: c.uri,
        contentType: c.contentType,
        qualityLabel: c.qualityLabel,
        bitrate: c.bitrate,
        width: c.width,
        height: c.height,
        contentLength: c.contentLength,
        isAdaptive: c.isAdaptive,
      })),
      provider: 'innertube-direct',
    };
  } catch (err) {
    console.warn('[YouTube API] Direct InnerTube player failed, attempting proxy fallback...', err);
  }

  // Fallback to proxy
  return apiProxyGet<LiveVideoDetails>(`/videos/${encodeURIComponent(id)}`);
}

/**
 * Fetches comments for a video via InnerTube /next.
 *
 * Comments require the web client context. Falls back gracefully to proxy.
 * Returns an empty list (not an error) when the video has comments disabled.
 *
 * @param id - YouTube video ID
 */
export async function fetchYouTubeComments(id: string): Promise<LiveComments> {
  if (!/^[\w-]{6,20}$/.test(id)) {
    throw new Error('Invalid YouTube video ID.');
  }

  try {
    const result = await extractComments(id);
    if (result && result.items.length > 0) {
      return result;
    }
  } catch (err) {
    console.warn('[YouTube API] Direct InnerTube comments failed, attempting proxy fallback...', err);
  }

  return apiProxyGet<LiveComments>(`/comments/${encodeURIComponent(id)}`);
}

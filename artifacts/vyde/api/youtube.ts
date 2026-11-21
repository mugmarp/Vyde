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
import { runBoundedRequest, cancellationError } from '@/services/innertube/request';
import type { RequestOptions } from '@/services/innertube/request';
import type { PlaybackSource } from '@/domain/media';
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
export type NativePlaybackSource = PlaybackSource;

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
  nextPage?: string | null;
  disabled?: boolean;
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
async function apiProxyGet<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const base = getApiBase();
  if (!base) {
    throw new Error('API server proxy is not configured.');
  }
  const response = await fetch(`${base}${path}`, { signal: options.signal });
  const body = (await response.json()) as T & { message?: string };
  if (!response.ok) {
    throw new Error(body.message ?? 'Proxy request failed.');
  }
  return body;
}

// Native direct extraction is sufficient configuration. An absent or failing
// optional proxy must never replace the original provider failure.
async function withOptionalProxy<T>(direct: () => Promise<T>, path: string, options: RequestOptions = {}): Promise<T> {
  try {
    return await direct();
  } catch (originalError) {
    if (options.signal?.aborted || !getApiBase()) throw originalError;
    try {
      return await apiProxyGet<T>(path, options);
    } catch {
      throw originalError;
    }
  }
}

export interface DiscoveryOptions extends RequestOptions {
  forceRefresh?: boolean;
}
type DiscoveryResult = { items: LiveVideo[]; provider: string };
const discoveryCache = new Map<string, { expiresAt: number; result: DiscoveryResult }>();

async function discover(key: string, operation: 'feed' | 'search', options: DiscoveryOptions,
  load: (request: RequestOptions) => Promise<DiscoveryResult>): Promise<DiscoveryResult> {
  const startedAt = Date.now();
  let outcome = 'error';
  try {
    let cacheHit = false;
    const result = await runBoundedRequest(async signal => {
      const cached = discoveryCache.get(key);
      if (!options.forceRefresh && cached && cached.expiresAt > Date.now()) {
        cacheHit = true;
        return { ...cached.result, items: [...cached.result.items] };
      }
      return load({ ...options, signal });
    }, { ...options, timeoutMs: options.timeoutMs ?? 20000 });
    // Commit cache effects only AFTER the lifetime helper validates success.
    if (options.signal?.aborted) throw cancellationError();
    if (!cacheHit && result.items.length) {
      discoveryCache.delete(key);
      if (discoveryCache.size >= 24) discoveryCache.delete(discoveryCache.keys().next().value!);
      discoveryCache.set(key, { expiresAt: Date.now() + 60000, result: { ...result, items: [...result.items] } });
    }
    outcome = cacheHit ? 'cache' : 'success';
    return result;
  } catch (error) {
    outcome = error instanceof Error ? error.name : 'error';
    throw error;
  } finally {
    console.log('[Discovery] request', { operation, elapsedMs: Date.now() - startedAt, outcome });
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Home browse first, then a legacy trending attempt, within one total budget. */
export async function fetchLiveFeed(region = 'US', options: DiscoveryOptions = {}): Promise<DiscoveryResult> {
  const country = region.toUpperCase();
  if (!/^[A-Z]{2}$/.test(country)) throw new Error('A two-letter content region is required.');
  return discover(`feed:${country}`, 'feed', options, request => withOptionalProxy(async () => {
    let firstError: unknown;
    let failed = false;
    for (const browseId of ['FEwhat_to_watch', 'FEtrending']) {
      try {
        const items = await extractBrowse(browseId, undefined, { ...request, region: country });
        if (items.length) return { items, provider: 'innertube-direct' };
      } catch (error) {
        if (request.signal?.aborted) throw error;
        if (!failed) firstError = error;
        failed = true;
      }
    }
    // An empty fallback must not erase an earlier request/schema failure.
    if (failed) throw firstError;
    return { items: [], provider: 'innertube-direct' };
  }, `/feed?region=${encodeURIComponent(country)}`, request));
}

/**
 * Searches YouTube for videos matching the given query.
 *
 * Strategy:
 *   1. Direct InnerTube /search (ANDROID client)
 *   2. Proxy fallback → /api/youtube/search
 *
 * @param query - Search string (must be ≥ 2 characters)
 */
export async function searchYouTube(query: string, options: DiscoveryOptions = {}): Promise<DiscoveryResult> {
  const normalized = query.trim();
  if (normalized.length < 2) {
    throw new Error('Search must be at least 2 characters.');
  }

  return discover(`search:${options.region ?? 'US'}:${normalized}`, 'search', options, request => withOptionalProxy(async () => ({
    items: await extractSearch(normalized, request), provider: 'innertube-direct',
  }), `/search?q=${encodeURIComponent(normalized)}`, request));
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

  return withOptionalProxy(async () => {
    const details = await extractPlayer(id);
    return { ...details, provider: 'innertube-direct' };
  }, `/videos/${encodeURIComponent(id)}`);
}

/**
 * Fetches comments for a video via InnerTube /next.
 *
 * Comments require the web client context. Falls back gracefully to proxy.
 * Returns an empty list (not an error) when the video has comments disabled.
 *
 * @param id - YouTube video ID
 */
export async function fetchYouTubeComments(id: string, continuation?: string): Promise<LiveComments> {
  if (!/^[\w-]{6,20}$/.test(id)) {
    throw new Error('Invalid YouTube video ID.');
  }

  // Continuation tokens belong to their originating direct session; do not
  // send them to another provider with potentially different session state.
  if (continuation) return extractComments(id, continuation);
  return withOptionalProxy(() => extractComments(id), `/comments/${encodeURIComponent(id)}`);
}

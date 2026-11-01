/**
 * Vyde Unified YouTube Provider API
 * Direct Client-Side InnerTube Integration with Server Fallback
 */

import { Platform } from 'react-native';
import {
  extractBrowse,
  extractSearch,
  extractPlayer,
  extractComments,
} from '@/services/innertube';

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

export interface NativePlaybackSource {
  uri: string;
  contentType: 'progressive' | 'hls' | 'audio';
  qualityLabel: string;
  bitrate?: number;
  width?: number;
  height?: number;
  contentLength?: string;
  isAdaptive?: boolean;
}

export interface LiveVideoDetails extends LiveVideo {
  views: string;
  likes: string;
  duration: string | null;
  nativePlaybackCandidates: NativePlaybackSource[];
  relatedVideos: LiveVideo[];
  livestream: boolean;
  provider: string;
}

export interface LiveComment {
  id: string;
  author: string;
  authorUrl: string;
  text: string;
  published: string;
  likes: number;
  thumbnail: string;
}

export interface LiveComments {
  commentCount: number | null;
  items: LiveComment[];
}

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

/**
 * Fetches the live / trending feed.
 * Executes directly via client-side InnerTube, with proxy fallback.
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

  // Fallback to proxy if configured
  try {
    return await apiProxyGet<{ items: LiveVideo[]; provider: string }>(`/feed?region=${encodeURIComponent(region)}`);
  } catch {
    // If proxy also fails or not available, retry browse with FEwhat_to_watch
    const items = await extractBrowse('FEwhat_to_watch');
    return { items, provider: 'innertube-direct' };
  }
}

/**
 * Searches YouTube videos.
 * Executes directly via client-side InnerTube, with proxy fallback.
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

  return apiProxyGet<{ items: LiveVideo[]; provider: string }>(`/search?q=${encodeURIComponent(normalized)}`);
}

/**
 * Fetches video details and playable streaming candidates.
 * Executes directly via client-side InnerTube with multi-client resolution.
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
  const payload = await apiProxyGet<LiveVideoDetails>(`/videos/${encodeURIComponent(id)}`);
  return payload;
}

/**
 * Fetches comments for a video.
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

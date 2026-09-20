import { Platform } from 'react-native';

/**
 * Anonymous YouTube content provider.
 *
 * This adapter intentionally handles discovery and metadata only. It does not
 * return media URLs, decipher signatures, create PoTokens, or authenticate a
 * Google account. Account sync remains a separate official OAuth/Data API
 * concern.
 */
export interface LiveVideo {
  id: string;
  title: string;
  description: string;
  channel: string;
  channelId: string;
  publishedAt: string;
  thumbnail: string;
  watchUrl: string;
}

export interface LiveVideoDetails extends LiveVideo {
  views: string;
  likes: string;
  duration: string | null;
}

interface InnertubeResponse {
  contents?: unknown;
  onResponseReceivedActions?: unknown;
  onResponseReceivedEndpoints?: unknown;
  currentVideoEndpoint?: unknown;
  videoDetails?: {
    videoId?: string;
    title?: string;
    shortDescription?: string;
    author?: string;
    channelId?: string;
    viewCount?: string;
    lengthSeconds?: string;
    thumbnail?: { thumbnails?: Array<{ url?: string }> };
  };
}

const CLIENT_NAME = process.env.EXPO_PUBLIC_INNERTUBE_CLIENT_NAME ?? 'WEB';
const CLIENT_VERSION = process.env.EXPO_PUBLIC_INNERTUBE_CLIENT_VERSION ?? '2.20260820.01.00';
// This is the public client identifier used by YouTube's web client. It is
// not an account credential or an OAuth secret; it is embedded in client apps.
const CLIENT_KEY = process.env.EXPO_PUBLIC_INNERTUBE_API_KEY
  ?? 'AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8';
const INNERTUBE_BASE = 'https://www.youtube.com/youtubei/v1';

function context() {
  const client = {
    clientName: CLIENT_NAME,
    clientVersion: CLIENT_VERSION,
    hl: 'en',
    gl: 'US',
  };
  return {
    client: CLIENT_NAME === 'ANDROID' ? { ...client, androidSdkVersion: 34 } : client,
  };
}

async function innertube(path: string, body: Record<string, unknown>) {
  const response = await fetch(`${INNERTUBE_BASE}${path}?key=${encodeURIComponent(CLIENT_KEY)}&prettyPrint=false`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-youtube-client-name': CLIENT_NAME === 'ANDROID' ? '3' : '1',
      'x-youtube-client-version': CLIENT_VERSION,
      'user-agent': CLIENT_NAME === 'ANDROID'
        ? 'com.google.android.youtube/19.29.37 (Linux; U; Android 14) gzip'
        : 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
    },
    body: JSON.stringify({ context: context(), ...body }),
  });
  const text = await response.text();
  let payload: InnertubeResponse;
  try {
    payload = JSON.parse(text) as InnertubeResponse;
  } catch {
    throw new Error(`YouTube returned an invalid response (${response.status}).`);
  }
  if (!response.ok) {
    throw new Error(`YouTube discovery failed (${response.status}).`);
  }
  return payload;
}

function text(value: unknown): string {
  if (!value || typeof value !== 'object') return '';
  const node = value as { simpleText?: string; runs?: Array<{ text?: string }> };
  return node.simpleText ?? node.runs?.map(run => run.text ?? '').join('') ?? '';
}

function thumbnails(value: unknown): string {
  if (!value || typeof value !== 'object') return '';
  const node = value as { thumbnails?: Array<{ url?: string }> };
  return node.thumbnails?.at(-1)?.url ?? node.thumbnails?.[0]?.url ?? '';
}

function findVideoRenderers(value: unknown, output: LiveVideo[] = []): LiveVideo[] {
  if (!value || typeof value !== 'object') return output;
  if (Array.isArray(value)) {
    value.forEach(item => findVideoRenderers(item, output));
    return output;
  }
  const record = value as Record<string, unknown>;
  const renderer = (record.videoRenderer ?? record.compactVideoRenderer) as Record<string, unknown> | undefined;
  if (renderer) {
    const id = typeof renderer.videoId === 'string' ? renderer.videoId : '';
    if (id) {
      const owner = renderer.ownerText ?? renderer.shortBylineText ?? renderer.longBylineText;
      output.push({
        id,
        title: text(renderer.title),
        description: text(renderer.detailedMetadataSnippets),
        channel: text(owner),
        channelId: text(renderer.channelId),
        publishedAt: text(renderer.publishedTimeText),
        thumbnail: thumbnails(renderer.thumbnail),
        watchUrl: `https://www.youtube.com/watch?v=${id}`,
      });
    }
  }
  Object.values(record).forEach(child => findVideoRenderers(child, output));
  return output;
}

function uniqueVideos(videos: LiveVideo[]) {
  return videos.filter((video, index, all) => all.findIndex(item => item.id === video.id) === index);
}

function apiBase() {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  if (!domain) throw new Error('EXPO_PUBLIC_DOMAIN is not configured.');
  return `https://${domain}/api/youtube`;
}

async function webProxy<T>(path: string): Promise<T> {
  const response = await fetch(`${apiBase()}${path}`);
  const body = await response.json() as T & { message?: string };
  if (!response.ok) throw new Error(body.message ?? 'Could not reach YouTube.');
  return body;
}

export async function fetchLiveFeed() {
  if (Platform.OS === 'web') return webProxy<{ items: LiveVideo[] }>('/feed');
  // Logged-out browse responses vary by client and may contain only shell
  // configuration. A trending search gives a stable anonymous discovery feed.
  const response = await innertube('/search', { query: 'trending' });
  return { items: uniqueVideos(findVideoRenderers(response)).slice(0, 24) };
}

export async function searchYouTube(query: string) {
  if (query.trim().length < 2) throw new Error('Search must be at least 2 characters.');
  if (Platform.OS === 'web') {
    return webProxy<{ items: LiveVideo[] }>(`/search?q=${encodeURIComponent(query.trim())}`);
  }
  const response = await innertube('/search', { query: query.trim() });
  return { items: uniqueVideos(findVideoRenderers(response)).slice(0, 20) };
}

export async function fetchYouTubeVideo(id: string): Promise<LiveVideoDetails> {
  if (!/^[\w-]{6,20}$/.test(id)) throw new Error('Invalid YouTube video ID.');
  if (Platform.OS === 'web') {
    return webProxy<LiveVideoDetails>(`/videos/${encodeURIComponent(id)}`);
  }
  const response = await innertube('/player', { videoId: id });
  const details = response.videoDetails;
  if (!details?.videoId) throw new Error('YouTube video details were not found.');
  return {
    id: details.videoId,
    title: details.title ?? '',
    description: details.shortDescription ?? '',
    channel: details.author ?? '',
    channelId: details.channelId ?? '',
    publishedAt: '',
    thumbnail: thumbnails(details.thumbnail),
    watchUrl: `https://www.youtube.com/watch?v=${details.videoId}`,
    views: details.viewCount ?? '0',
    likes: '0',
    duration: details.lengthSeconds ? formatDuration(details.lengthSeconds) : null,
  };
}

function formatDuration(seconds: string) {
  const total = Number(seconds);
  if (!Number.isFinite(total)) return null;
  const minutes = Math.floor(total / 60);
  const remainder = total % 60;
  return `${minutes}:${remainder.toString().padStart(2, '0')}`;
}
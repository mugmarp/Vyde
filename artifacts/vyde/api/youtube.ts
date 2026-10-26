/**
 * Vyde's normalized YouTube-compatible provider API.
 *
 * The API server uses the configured Piped backend for discovery, video
 * details, related videos, comments, and native playback sources. Media source
 * URIs are passed only to the native player; screens must never render or log
 * them.
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
  views?: string;
  duration?: string | null;
}

export interface NativePlaybackSource {
  uri: string;
  contentType: 'progressive' | 'hls';
  qualityLabel: string;
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

function apiBase() {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  if (!domain) throw new Error('EXPO_PUBLIC_DOMAIN is not configured.');
  return `https://${domain}/api/youtube`;
}

function httpsUri(value: unknown): string {
  if (typeof value !== 'string') return '';
  try {
    const uri = new URL(value);
    return uri.protocol === 'https:' ? uri.toString() : '';
  } catch {
    return '';
  }
}

async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(`${apiBase()}${path}`);
  const body = await response.json() as T & { message?: string };
  if (!response.ok) throw new Error(body.message ?? 'Could not reach the video provider.');
  return body;
}

export function fetchLiveFeed(region = 'UG') {
  return apiGet<{ items: LiveVideo[]; provider: string }>(`/feed?region=${encodeURIComponent(region)}`);
}

export function searchYouTube(query: string) {
  const normalized = query.trim();
  if (normalized.length < 2) throw new Error('Search must be at least 2 characters.');
  return apiGet<{ items: LiveVideo[]; provider: string }>(`/search?q=${encodeURIComponent(normalized)}`);
}

export function fetchYouTubeVideo(id: string) {
  if (!/^[\w-]{6,20}$/.test(id)) throw new Error('Invalid YouTube video ID.');
  return apiGet<unknown>(`/videos/${encodeURIComponent(id)}`).then(payload => {
    if (!payload || typeof payload !== 'object') {
      throw new Error('The video provider returned an invalid player response.');
    }
    const data = payload as Record<string, unknown>;
    if (data.id !== id || typeof data.title !== 'string') {
      throw new Error('The video provider returned invalid video details.');
    }

    const candidates = Array.isArray(data.nativePlaybackCandidates)
      ? data.nativePlaybackCandidates.flatMap((item): NativePlaybackSource[] => {
          if (!item || typeof item !== 'object') return [];
          const candidate = item as Record<string, unknown>;
          if (typeof candidate.uri !== 'string' ||
              (candidate.contentType !== 'hls' && candidate.contentType !== 'progressive')) return [];
          try {
            if (new URL(candidate.uri).protocol !== 'https:') return [];
          } catch {
            return [];
          }
          return [{
            uri: candidate.uri,
            contentType: candidate.contentType,
            qualityLabel: typeof candidate.qualityLabel === 'string' ? candidate.qualityLabel : 'Auto',
          }];
        })
      : [];

    const relatedVideos = Array.isArray(data.relatedVideos)
      ? data.relatedVideos.flatMap((item): LiveVideo[] => {
          if (!item || typeof item !== 'object') return [];
          const related = item as Record<string, unknown>;
          if (typeof related.id !== 'string' || typeof related.title !== 'string') return [];
          return [{
            id: related.id,
            title: related.title,
            description: typeof related.description === 'string' ? related.description : '',
            channel: typeof related.channel === 'string' ? related.channel : '',
            channelId: typeof related.channelId === 'string' ? related.channelId : '',
            publishedAt: typeof related.publishedAt === 'string' ? related.publishedAt : '',
            thumbnail: httpsUri(related.thumbnail),
            watchUrl: `https://www.youtube.com/watch?v=${related.id}`,
            views: typeof related.views === 'string' ? related.views : undefined,
            duration: typeof related.duration === 'string' ? related.duration : null,
          }];
        })
      : [];

    return {
      id,
      title: data.title,
      description: typeof data.description === 'string' ? data.description : '',
      channel: typeof data.channel === 'string' ? data.channel : '',
      channelId: typeof data.channelId === 'string' ? data.channelId : '',
      publishedAt: typeof data.publishedAt === 'string' ? data.publishedAt : '',
      thumbnail: httpsUri(data.thumbnail),
      watchUrl: `https://www.youtube.com/watch?v=${id}`,
      views: typeof data.views === 'string' ? data.views : '0',
      likes: typeof data.likes === 'string' ? data.likes : '0',
      duration: typeof data.duration === 'string' ? data.duration : null,
      nativePlaybackCandidates: candidates,
      relatedVideos,
      livestream: data.livestream === true,
      provider: typeof data.provider === 'string' ? data.provider : 'unknown',
    } satisfies LiveVideoDetails;
  });
}

export function fetchYouTubeComments(id: string) {
  if (!/^[\w-]{6,20}$/.test(id)) throw new Error('Invalid YouTube video ID.');
  return apiGet<LiveComments>(`/comments/${encodeURIComponent(id)}`);
}

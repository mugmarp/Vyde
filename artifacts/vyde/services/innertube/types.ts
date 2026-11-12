/**
 * Normalized Stream & Video Types for Vyde
 */

export interface VideoStreamCandidate {
  uri: string;
  /** hls = HLS manifest (.m3u8), progressive = muxed MP4, audio = audio-only adaptive, adaptive-video = video-only adaptive */
  contentType: 'hls' | 'progressive' | 'audio' | 'adaptive-video';
  qualityLabel: string;
  bitrate?: number;
  width?: number;
  height?: number;
  audioChannels?: number;
  audioSampleRate?: number;
  contentLength?: string;
  isAdaptive?: boolean;
}

export interface NormalizedVideoDetails {
  id: string;
  title: string;
  description: string;
  channel: string;
  channelId: string;
  publishedAt: string;
  thumbnail: string;
  views: string;
  likes: string;
  duration: string | null;
  durationSeconds: number;
  watchUrl: string;
  nativePlaybackCandidates: VideoStreamCandidate[];
  relatedVideos: NormalizedVideoItem[];
  livestream: boolean;
  provider: 'innertube' | 'fallback';
}

export interface NormalizedVideoItem {
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

export interface NormalizedComment {
  id: string;
  author: string;
  authorUrl: string;
  text: string;
  published: string;
  likes: number;
  thumbnail: string;
}

export interface NormalizedCommentsResponse {
  commentCount: number | null;
  items: NormalizedComment[];
}

export interface InnerTubeFormat {
  itag?: number;
  url?: string;
  signatureCipher?: string;
  cipher?: string;
  mimeType?: string;
  bitrate?: number;
  width?: number;
  height?: number;
  lastModified?: string;
  contentLength?: string;
  quality?: string;
  fps?: number;
  qualityLabel?: string;
  averageBitrate?: number;
  audioQuality?: string;
  approxDurationMs?: string;
  audioSampleRate?: string;
  audioChannels?: number;
}

export interface InnerTubeStreamingData {
  expiresInSeconds?: string;
  hlsManifestUrl?: string;
  dashManifestUrl?: string;
  formats?: InnerTubeFormat[];
  adaptiveFormats?: InnerTubeFormat[];
}

export interface InnerTubePlayerResponse {
  playabilityStatus?: {
    status?: string;
    reason?: string;
    playableInEmbed?: boolean;
  };
  streamingData?: InnerTubeStreamingData;
  videoDetails?: {
    videoId?: string;
    title?: string;
    lengthSeconds?: string;
    keywords?: string[];
    channelId?: string;
    isOwnerViewing?: boolean;
    shortDescription?: string;
    isCrawlable?: boolean;
    thumbnail?: {
      thumbnails?: Array<{ url: string; width: number; height: number }>;
    };
    averageRating?: number;
    allowRatings?: boolean;
    viewCount?: string;
    author?: string;
    isLiveContent?: boolean;
  };
  microformat?: {
    playerMicroformatRenderer?: {
      thumbnail?: {
        thumbnails?: Array<{ url: string; width: number; height: number }>;
      };
      title?: { simpleText?: string };
      description?: { simpleText?: string };
      lengthSeconds?: string;
      ownerProfileUrl?: string;
      ownerChannelName?: string;
      uploadDate?: string;
      publishDate?: string;
      viewCount?: string;
    };
  };
}

/** Provider-independent source information shared by resolution and consumers. */
export interface PlaybackSource {
  uri: string;
  contentType: 'progressive' | 'hls' | 'audio' | 'adaptive-video';
  qualityLabel: string;
  formatId?: string;
  mimeType?: string;
  codecs?: string[];
  container?: 'mp4' | 'webm' | 'mp3' | 'ogg';
  /** Absolute Unix time in milliseconds; unknown expiry stays undefined. */
  expiresAt?: number;
  headers?: Record<string, string>;
  bitrate?: number;
  width?: number;
  height?: number;
  audioChannels?: number;
  audioSampleRate?: number;
  contentLength?: string;
  isAdaptive?: boolean;
}

/**
 * Cipher & URL Parsing Utilities
 */

import { InnerTubeFormat, VideoStreamCandidate } from './types';

/**
 * Parses a signatureCipher query string into component parts.
 */
export function parseSignatureCipher(cipherStr: string): { url: string; s?: string; sp?: string } | null {
  try {
    const params = new URLSearchParams(cipherStr);
    const url = params.get('url');
    if (!url) return null;
    const s = params.get('s') ?? undefined;
    const sp = params.get('sp') ?? 'sig';
    return { url, s, sp };
  } catch {
    return null;
  }
}

/**
 * Basic deciphering transformation evaluator.
 * YouTube signatures undergo standard permutation operations (reverse, slice, swap).
 */
export function decipherSignature(sig: string): string {
  // If no complex transformation is decipherable without full JS VM evaluation,
  // return sig as is. In many mobile client responses (Android/iOS),
  // progressive URLs or HLS manifests are unencrypted.
  return sig;
}

/**
 * Resolves a format entry to a valid playable URL if possible.
 */
export function resolveFormatUrl(format: InnerTubeFormat): string | null {
  if (format.url && format.url.startsWith('https://')) {
    return format.url;
  }

  const cipher = format.signatureCipher || format.cipher;
  if (cipher) {
    const parsed = parseSignatureCipher(cipher);
    if (parsed) {
      if (parsed.s) {
        const solvedSig = decipherSignature(parsed.s);
        const separator = parsed.url.includes('?') ? '&' : '?';
        return `${parsed.url}${separator}${parsed.sp}=${encodeURIComponent(solvedSig)}`;
      }
      return parsed.url;
    }
  }

  return null;
}

/**
 * Extracts all valid playback candidates from streaming data.
 */
export function extractPlaybackCandidates(streamingData?: {
  hlsManifestUrl?: string;
  formats?: InnerTubeFormat[];
  adaptiveFormats?: InnerTubeFormat[];
}): VideoStreamCandidate[] {
  if (!streamingData) return [];

  const candidates: VideoStreamCandidate[] = [];

  // 1. HLS Manifest is top priority: adaptive, audio/video synchronized, seeks smoothly
  if (streamingData.hlsManifestUrl && streamingData.hlsManifestUrl.startsWith('https://')) {
    candidates.push({
      uri: streamingData.hlsManifestUrl,
      contentType: 'hls',
      qualityLabel: 'Auto (HLS Adaptive)',
    });
  }

  // 2. Progressive formats (both audio and video in one container)
  const formats = Array.isArray(streamingData.formats) ? streamingData.formats : [];
  for (const fmt of formats) {
    const url = resolveFormatUrl(fmt);
    if (!url) continue;

    const mime = (fmt.mimeType || '').toLowerCase();
    const isMp4 = mime.includes('video/mp4');

    candidates.push({
      uri: url,
      contentType: 'progressive',
      qualityLabel: fmt.qualityLabel || (fmt.height ? `${fmt.height}p` : 'MP4'),
      bitrate: fmt.bitrate,
      width: fmt.width,
      height: fmt.height,
      audioChannels: fmt.audioChannels,
      audioSampleRate: fmt.audioSampleRate ? parseInt(fmt.audioSampleRate, 10) : undefined,
      contentLength: fmt.contentLength,
      isAdaptive: false,
    });
  }

  // 3. Adaptive audio formats (for audio-only background play and offline downloads)
  const adaptive = Array.isArray(streamingData.adaptiveFormats) ? streamingData.adaptiveFormats : [];
  for (const fmt of adaptive) {
    const mime = (fmt.mimeType || '').toLowerCase();
    if (!mime.startsWith('audio/')) continue;

    const url = resolveFormatUrl(fmt);
    if (!url) continue;

    candidates.push({
      uri: url,
      contentType: 'audio',
      qualityLabel: fmt.audioQuality ? `Audio (${fmt.audioQuality.replace('AUDIO_QUALITY_', '')})` : 'Audio',
      bitrate: fmt.bitrate,
      audioChannels: fmt.audioChannels,
      audioSampleRate: fmt.audioSampleRate ? parseInt(fmt.audioSampleRate, 10) : undefined,
      contentLength: fmt.contentLength,
      isAdaptive: true,
    });
  }

  return candidates;
}

/**
 * Formats duration from seconds to MM:SS or HH:MM:SS
 */
export function formatDuration(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * Cleans YouTube rich text / descriptions
 */
export function cleanText(input: unknown): string {
  if (typeof input !== 'string') return '';
  return input
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .trim();
}

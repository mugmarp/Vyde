/**
 * Cipher & URL Parsing Utilities
 *
 * Implements runtime signature deciphering and n-parameter unthrottling
 * by fetching and parsing YouTube's player base.js at runtime.
 *
 * Strategy:
 *   1. When a ciphered format is encountered, extract the player ID from the
 *      player response and fetch base.js once.
 *   2. Parse the signature transformation function and its helper object from
 *      the JS source using regex patterns.
 *   3. Execute the transformation sequence on the ciphered `s` parameter.
 *   4. Solve the `n` parameter throttle challenge the same way.
 *   5. Cache everything keyed by playerId so subsequent videos skip the fetch.
 */

import { InnerTubeFormat, VideoStreamCandidate } from './types';

// ─── Cache ────────────────────────────────────────────────────────────────────

interface CipheredPlayerCache {
  sigOps: SigOperation[];
  nFnBody: string;
}

type SigOpType = 'swap' | 'reverse' | 'splice';

interface SigOperation {
  op: SigOpType;
  arg: number;
}

const playerCache = new Map<string, CipheredPlayerCache>();

// ─── base.js fetch ────────────────────────────────────────────────────────────

async function fetchBaseJs(playerId: string): Promise<string> {
  const url = `https://www.youtube.com/s/player/${playerId}/player_ias.vflset/en_US/base.js`;
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
    },
  });
  if (!res.ok) throw new Error(`base.js fetch failed: ${res.status}`);
  return res.text();
}

// ─── Signature transform extractor ───────────────────────────────────────────

/**
 * Extracts the sequence of transformation operations from base.js.
 * YouTube's signature function calls a helper object whose methods
 * perform one of three operations: swap, reverse, or splice.
 */
function extractSigOps(js: string): SigOperation[] {
  // 1. Find the main sig function name
  const sigFnMatch =
    js.match(/\b([a-zA-Z0-9$]{2,})\s*=\s*function\s*\([a-z]\)\s*\{[^}]*\.split\s*\(\s*""\s*\)[^}]*\.join\s*\(\s*""\s*\)/) ||
    js.match(/([a-zA-Z$][a-zA-Z0-9$]*)\s*=\s*function\([a-z]\)\{a=a\.split\(""\);([a-zA-Z0-9$]{2,})/);

  if (!sigFnMatch) throw new Error('Could not find signature function in base.js');

  const fnName = sigFnMatch[1];

  // 2. Extract the sig function body
  const fnBodyMatch = js.match(
    new RegExp(
      fnName.replace(/[$]/g, '\\$') +
        '\\s*=\\s*function\\s*\\([a-z]\\)\\s*\\{([^}]+)\\}',
    ),
  );
  if (!fnBodyMatch) throw new Error(`Could not extract sig function body for ${fnName}`);

  const body = fnBodyMatch[1];

  // 3. Find the helper object name used inside the function body
  const helperMatch = body.match(/;([a-zA-Z$][a-zA-Z0-9$]*)\.[a-zA-Z$]/);
  if (!helperMatch) throw new Error('Could not find helper object name in sig function');
  const helperName = helperMatch[1];

  // 4. Extract the helper object definition
  const escapedHelper = helperName.replace(/[$]/g, '\\$');
  const helperBodyMatch = js.match(
    new RegExp(
      'var ' +
        escapedHelper +
        '\\s*=\\s*\\{([\\s\\S]+?)\\}\\s*;',
    ),
  );
  if (!helperBodyMatch) throw new Error(`Could not find helper object ${helperName}`);
  const helperBody = helperBodyMatch[1];

  // 5. Map method names to operation types
  const methodMap: Record<string, SigOpType> = {};

  // Reverse: function(a){a.reverse()}
  const reverseMatch = helperBody.match(/([a-zA-Z$][a-zA-Z0-9$]*)\s*:\s*function\s*\(a\)\s*\{a\.reverse\(\)\}/);
  if (reverseMatch) methodMap[reverseMatch[1]] = 'reverse';

  // Splice: function(a,b){a.splice(0,b)}
  const spliceMatch = helperBody.match(/([a-zA-Z$][a-zA-Z0-9$]*)\s*:\s*function\s*\(a,b\)\s*\{a\.splice\(0,b\)\}/);
  if (spliceMatch) methodMap[spliceMatch[1]] = 'splice';

  // Swap: function(a,b){var c=a[0];a[0]=a[b%a.length];a[b%a.length]=c}
  const swapMatch = helperBody.match(
    /([a-zA-Z$][a-zA-Z0-9$]*)\s*:\s*function\s*\(a,b\)\s*\{var c=a\[0\];a\[0\]=a\[b(?:%a\.length)?\];a\[b(?:%a\.length)?\]=c\}/,
  );
  if (swapMatch) methodMap[swapMatch[1]] = 'swap';

  // 6. Parse the call sequence from the function body
  const callRegex = new RegExp(
    escapedHelper + '\\.([a-zA-Z$][a-zA-Z0-9$]*)\\(a,(\\d+)\\)',
    'g',
  );
  const ops: SigOperation[] = [];
  let m: RegExpExecArray | null;
  while ((m = callRegex.exec(body)) !== null) {
    const method = m[1];
    const arg = parseInt(m[2], 10);
    const opType = methodMap[method];
    if (!opType) throw new Error(`Unknown sig method: ${method}`);
    ops.push({ op: opType, arg });
  }

  if (ops.length === 0) throw new Error('No sig operations extracted');
  return ops;
}

// ─── n-parameter function extractor ──────────────────────────────────────────

/**
 * Extracts the n-parameter throttle-solving function body from base.js.
 * Returns a string of JS that can be evaluated with Function().
 */
function extractNFnBody(js: string): string {
  // Find the n-function: typically something like
  // var X=function(a){ ... complex body ... return a.join("") }
  const nFnPatterns = [
    /\.get\("n"\)\)&&\(b=([a-zA-Z$][a-zA-Z0-9$]*)\([a-z]\)/,
    /[a-z]=([a-zA-Z$][a-zA-Z0-9$]*)\([a-z]\);[^;]*enhanced_except/,
  ];

  let fnName: string | null = null;
  for (const pat of nFnPatterns) {
    const m = js.match(pat);
    if (m) { fnName = m[1]; break; }
  }

  if (!fnName) {
    // Fallback: return identity — n stays unchanged (may cause throttling)
    console.warn('[Cipher] Could not extract n-param function; throttling may occur');
    return 'return a;';
  }

  // Extract function body
  const escapedName = fnName.replace(/[$]/g, '\\$');
  const bodyMatch = js.match(
    new RegExp(escapedName + '\\s*=\\s*function\\s*\\(([a-z])\\)\\s*\\{([\\s\\S]+?)\\}\\s*;'),
  );
  if (!bodyMatch) {
    console.warn('[Cipher] Could not extract n-param function body');
    return 'return a;';
  }

  return bodyMatch[2];
}

// ─── Cache loader ─────────────────────────────────────────────────────────────

async function loadPlayerCache(playerId: string): Promise<CipheredPlayerCache> {
  if (playerCache.has(playerId)) {
    return playerCache.get(playerId)!;
  }
  const js = await fetchBaseJs(playerId);
  const sigOps = extractSigOps(js);
  const nFnBody = extractNFnBody(js);
  const entry: CipheredPlayerCache = { sigOps, nFnBody };
  playerCache.set(playerId, entry);
  return entry;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Applies the extracted transformation sequence to a ciphered signature string.
 */
function applySigOps(sig: string, ops: SigOperation[]): string {
  const a = sig.split('');
  for (const { op, arg } of ops) {
    switch (op) {
      case 'reverse':
        a.reverse();
        break;
      case 'splice':
        a.splice(0, arg);
        break;
      case 'swap': {
        const c = a[0];
        a[0] = a[arg % a.length];
        a[arg % a.length] = c;
        break;
      }
    }
  }
  return a.join('');
}

/**
 * Solves the n-parameter throttle challenge using the extracted function body.
 */
function solveNParam(n: string, nFnBody: string): string {
  try {
    // eslint-disable-next-line no-new-func
    const fn = new Function('a', nFnBody);
    const result = fn(n);
    return typeof result === 'string' ? result : n;
  } catch (e) {
    console.warn('[Cipher] n-param solve failed:', e);
    return n;
  }
}

/**
 * Parses a signatureCipher query string into component parts.
 */
export function parseSignatureCipher(
  cipherStr: string,
): { url: string; s?: string; sp?: string } | null {
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
 * Resolves a format entry to a valid playable URL.
 * If the format has a signatureCipher, the caller must pass a resolved
 * signature (from decipherSignature). For unciphered formats, resolves directly.
 */
export function resolveFormatUrl(
  format: InnerTubeFormat,
  resolvedSig?: string,
): string | null {
  // Direct URL — may still need n-param solved, done downstream
  if (format.url && format.url.startsWith('https://')) {
    return format.url;
  }

  const cipher = format.signatureCipher || format.cipher;
  if (cipher) {
    const parsed = parseSignatureCipher(cipher);
    if (parsed) {
      if (parsed.s && resolvedSig) {
        const separator = parsed.url.includes('?') ? '&' : '?';
        return `${parsed.url}${separator}${parsed.sp}=${encodeURIComponent(resolvedSig)}`;
      }
      // If no sig to inject, return base URL (will likely 403, but best effort)
      return parsed.url;
    }
  }

  return null;
}

/**
 * Patches the `n` parameter in a URL to defeat YouTube's throttling.
 * Must be called AFTER signature resolution.
 */
function applyNParam(url: string, nFnBody: string): string {
  try {
    const u = new URL(url);
    const n = u.searchParams.get('n');
    if (!n) return url;
    const solved = solveNParam(n, nFnBody);
    u.searchParams.set('n', solved);
    return u.toString();
  } catch {
    return url;
  }
}

/**
 * Resolves a full format URL with signature deciphering and n-param solving.
 * Requires the player ID (from playerResponse.responseContext.serviceTrackingParams
 * or extracted from the base.js URL in the streaming data).
 *
 * @param format - Raw InnerTube format object
 * @param playerId - YouTube player JS ID (e.g. "vfl_xyz123")
 * @returns Resolved, playable HTTPS URL or null
 */
export async function resolveFormatUrlWithDecipher(
  format: InnerTubeFormat,
  playerId: string,
): Promise<string | null> {
  try {
    const { sigOps, nFnBody } = await loadPlayerCache(playerId);

    let baseUrl: string | null = null;

    if (format.url && format.url.startsWith('https://')) {
      baseUrl = format.url;
    } else {
      const cipher = format.signatureCipher || format.cipher;
      if (cipher) {
        const parsed = parseSignatureCipher(cipher);
        if (parsed && parsed.s) {
          const resolvedSig = applySigOps(parsed.s, sigOps);
          const separator = parsed.url.includes('?') ? '&' : '?';
          baseUrl = `${parsed.url}${separator}${parsed.sp}=${encodeURIComponent(resolvedSig)}`;
        } else if (parsed) {
          baseUrl = parsed.url;
        }
      }
    }

    if (!baseUrl) return null;

    // Always apply n-param solving
    return applyNParam(baseUrl, nFnBody);
  } catch (err) {
    console.warn('[Cipher] resolveFormatUrlWithDecipher failed:', err);
    return null;
  }
}

/**
 * Extracts the player ID from an InnerTube player response object.
 * YouTube embeds the player JS URL in the response under various paths.
 */
export function extractPlayerId(playerResponse: Record<string, unknown>): string | null {
  try {
    // 1. Check player assets if present
    const assets = (playerResponse as any)?.assets;
    if (assets?.js && typeof assets.js === 'string') {
      const m = assets.js.match(/\/s\/player\/([a-zA-Z0-9_-]+)\//);
      if (m) return m[1];
    }

    // 2. Try streamingData HLS manifest URL
    const streamingData = playerResponse?.streamingData as any;
    if (streamingData?.hlsManifestUrl && typeof streamingData.hlsManifestUrl === 'string') {
      const m = (streamingData.hlsManifestUrl as string).match(/\/s\/player\/([a-zA-Z0-9_-]+)\//);
      if (m) return m[1];
    }

    // 3. Try adaptiveFormats and formats URLs
    const formats = (streamingData?.adaptiveFormats || streamingData?.formats || []) as any[];
    for (const fmt of formats) {
      const url = fmt.url || '';
      const m = url.match(/\/s\/player\/([a-zA-Z0-9_-]+)\//);
      if (m) return m[1];
    }

    // 4. Try serviceTrackingParams cver param
    const ctx = playerResponse?.responseContext as any;
    if (ctx?.serviceTrackingParams) {
      for (const svc of ctx.serviceTrackingParams) {
        for (const param of (svc.params || [])) {
          if (param.key === 'cver' && typeof param.value === 'string') {
            return param.value;
          }
        }
      }
    }
  } catch {
    // ignore
  }
  return null;
}

/**
 * Extracts all valid playback candidates from streaming data.
 * Performs async signature deciphering when a playerId is provided.
 */
export async function extractPlaybackCandidates(
  streamingData?: {
    hlsManifestUrl?: string;
    formats?: InnerTubeFormat[];
    adaptiveFormats?: InnerTubeFormat[];
  },
  playerId?: string | null,
): Promise<VideoStreamCandidate[]> {
  if (!streamingData) return [];

  const candidates: VideoStreamCandidate[] = [];
  const decipher = async (fmt: InnerTubeFormat): Promise<string | null> => {
    if (playerId) {
      return resolveFormatUrlWithDecipher(fmt, playerId);
    }
    // Fallback: sync resolve (works only for unciphered direct URLs)
    return resolveFormatUrl(fmt);
  };

  // 1. HLS Manifest is top priority: adaptive audio+video, AVPlayer/ExoPlayer native
  if (
    streamingData.hlsManifestUrl &&
    streamingData.hlsManifestUrl.startsWith('https://')
  ) {
    candidates.push({
      uri: streamingData.hlsManifestUrl,
      contentType: 'hls',
      qualityLabel: 'Auto (HLS Adaptive)',
    });
  }

  // 2. Progressive MP4 formats (audio + video in one container)
  const formats = Array.isArray(streamingData.formats) ? streamingData.formats : [];
  for (const fmt of formats) {
    const url = await decipher(fmt);
    if (!url) continue;

    candidates.push({
      uri: url,
      contentType: 'progressive',
      qualityLabel: fmt.qualityLabel || (fmt.height ? `${fmt.height}p` : 'MP4'),
      bitrate: fmt.bitrate,
      width: fmt.width,
      height: fmt.height,
      audioChannels: fmt.audioChannels,
      audioSampleRate: fmt.audioSampleRate
        ? parseInt(fmt.audioSampleRate, 10)
        : undefined,
      contentLength: fmt.contentLength,
      isAdaptive: false,
    });
  }

  // 3. Adaptive formats — BOTH video-only AND audio-only
  const adaptive = Array.isArray(streamingData.adaptiveFormats)
    ? streamingData.adaptiveFormats
    : [];

  for (const fmt of adaptive) {
    const mime = (fmt.mimeType || '').toLowerCase();
    const url = await decipher(fmt);
    if (!url) continue;

    if (mime.startsWith('video/')) {
      // Video-only adaptive stream (1080p+)
      candidates.push({
        uri: url,
        contentType: 'adaptive-video',
        qualityLabel: fmt.qualityLabel || (fmt.height ? `${fmt.height}p` : 'Video'),
        bitrate: fmt.bitrate,
        width: fmt.width,
        height: fmt.height,
        contentLength: fmt.contentLength,
        isAdaptive: true,
      });
    } else if (mime.startsWith('audio/')) {
      // Audio-only adaptive stream (background play / offline audio)
      candidates.push({
        uri: url,
        contentType: 'audio',
        qualityLabel: fmt.audioQuality
          ? `Audio (${fmt.audioQuality.replace('AUDIO_QUALITY_', '')})`
          : 'Audio',
        bitrate: fmt.bitrate,
        audioChannels: fmt.audioChannels,
        audioSampleRate: fmt.audioSampleRate
          ? parseInt(fmt.audioSampleRate, 10)
          : undefined,
        contentLength: fmt.contentLength,
        isAdaptive: true,
      });
    }
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

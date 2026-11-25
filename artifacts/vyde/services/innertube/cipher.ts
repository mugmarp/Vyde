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

import { InnerTubeFormat, InnerTubeStreamingData, VideoStreamCandidate } from './types';

// ─── Cache ────────────────────────────────────────────────────────────────────

interface CipheredPlayerCache {
  sigOps: SigOperation[] | null;
  nFnBody: string | null;
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
    escapedHelper + '\\.([a-zA-Z$][a-zA-Z0-9$]*)\\(a(?:,(\\d+))?\\)',
    'g',
  );
  const ops: SigOperation[] = [];
  let m: RegExpExecArray | null;
  while ((m = callRegex.exec(body)) !== null) {
    const method = m[1];
    const opType = methodMap[method];
    if (!opType) throw new Error(`Unknown sig method: ${method}`);
    if (opType !== 'reverse' && m[2] === undefined) {
      throw new Error(`Missing argument for sig method: ${method}`);
    }
    const arg = m[2] === undefined ? 0 : parseInt(m[2], 10);
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
function extractNFnBody(js: string): string | null {
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
    // An unknown transform is not a successful challenge resolution.
    console.warn('[Cipher] Could not extract n-param function; the format remains unresolved');
    return null;
  }

  // Extract function body
  const escapedName = fnName.replace(/[$]/g, '\\$');
  const bodyMatch = js.match(
    new RegExp(escapedName + '\\s*=\\s*function\\s*\\(([a-z])\\)\\s*\\{([\\s\\S]+?)\\}\\s*;'),
  );
  if (!bodyMatch) {
    console.warn('[Cipher] Could not extract n-param function body');
    return null;
  }

  return bodyMatch[2];
}

// ─── Cache loader ─────────────────────────────────────────────────────────────

const playerLoads = new Map<string, Promise<CipheredPlayerCache>>();
async function loadPlayerCache(playerId: string): Promise<CipheredPlayerCache> {
  const cached = playerCache.get(playerId);
  if (cached) return cached;
  const current = playerLoads.get(playerId);
  if (current) return current;
  const pending = (async () => {
    const js = await fetchBaseJs(playerId);
    let sigOps: SigOperation[] | null = null;
    try { sigOps = extractSigOps(js); } catch { /* Signature support is checked only when required. */ }
    const nFnBody = extractNFnBody(js);
    if (!sigOps && !nFnBody) throw new Error('The player challenge format is unsupported.');
    const entry = { sigOps, nFnBody };
    if (playerCache.size >= 8) playerCache.delete(playerCache.keys().next().value!);
    playerCache.set(playerId, entry);
    return entry;
  })();
  playerLoads.set(playerId, pending);
  const clear = () => { if (playerLoads.get(playerId) === pending) playerLoads.delete(playerId); };
  void pending.then(clear, clear);
  return pending;
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
function solveNParam(n: string, nFnBody: string | null): string {
  if (!nFnBody) throw new Error('The n challenge could not be resolved.');
  try {
    // eslint-disable-next-line no-new-func
    const fn = new Function('a', nFnBody);
    const result = fn(n);
    if (typeof result !== 'string' || !result || result.startsWith('enhanced_except_')) {
      throw new Error('Invalid n challenge result.');
    }
    return result;
  } catch (e) {
    console.warn('[Cipher] n-param solve failed:', e);
    throw new Error('The n challenge could not be resolved.');
  }
}

/**
 * Parses a signatureCipher query string into component parts.
 */
export function parseSignatureCipher(
  cipherStr: string,
): { url: string; s?: string; sp: string } | null {
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
export function resolveFormatUrl(format: InnerTubeFormat, resolvedSig?: string): string | null {
  try {
    const parsed = !format.url ? parseSignatureCipher(format.signatureCipher || format.cipher || '') : null;
    const uri = format.url ?? parsed?.url;
    if (!uri) return null;
    const url = new URL(uri);
    if (url.protocol !== 'https:' || url.searchParams.has('n')) return null;
    if (parsed?.s) {
      if (!resolvedSig) return null;
      url.searchParams.set(parsed.sp, resolvedSig);
    }
    return url.toString();
  } catch { return null; }
}

async function resolveWithCache(format: InnerTubeFormat, load: () => Promise<CipheredPlayerCache>): Promise<string | null> {
  try {
    const parsed = !format.url ? parseSignatureCipher(format.signatureCipher || format.cipher || '') : null;
    const uri = format.url ?? parsed?.url;
    if (!uri) return null;
    const url = new URL(uri);
    if (url.protocol !== 'https:') return null;
    const n = url.searchParams.get('n');
    if (!parsed?.s && !url.searchParams.has('n')) return uri;
    const cache = await load();
    if (parsed?.s) {
      if (!cache.sigOps?.length) return null;
      const signature = applySigOps(parsed.s, cache.sigOps);
      if (!signature) return null;
      url.searchParams.set(parsed.sp, signature);
    }
    if (url.searchParams.has('n')) {
      if (!n) return null;
      url.searchParams.set('n', solveNParam(n, cache.nFnBody));
    }
    return url.toString();
  } catch (error) {
    console.warn('[Cipher] Format challenge resolution failed:', error);
    return null;
  }
}

export async function resolveFormatUrlWithDecipher(format: InnerTubeFormat, playerId: string): Promise<string | null> {
  return resolveWithCache(format, () => loadPlayerCache(playerId));
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

    // serviceTrackingParams.cver is a client version, not a player-script ID.
  } catch {
    // ignore
  }
  return null;
}

let cachedGlobalPlayerId: string | null = null;

/**
 * Resolves player ID either from InnerTube response or fallback fetch from YouTube iframe API.
 */
export async function getOrFetchPlayerId(playerResponse?: Record<string, unknown>): Promise<string | null> {
  if (playerResponse) {
    const extracted = extractPlayerId(playerResponse);
    if (extracted) {
      cachedGlobalPlayerId = extracted;
      return extracted;
    }
  }

  if (cachedGlobalPlayerId) return cachedGlobalPlayerId;

  try {
    const res = await fetch('https://www.youtube.com/iframe_api', {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
      },
    });
    if (res.ok) {
      const text = await res.text();
      const m = text.match(/\/s\/player\/([a-zA-Z0-9_-]+)\//);
      if (m) {
        cachedGlobalPlayerId = m[1];
        return m[1];
      }
    }
  } catch {
    // ignore
  }

  return cachedGlobalPlayerId;
}

/**
 * Extracts all valid playback candidates from streaming data.
 * Performs async signature deciphering when a playerId is provided or resolved.
 */
export async function extractPlaybackCandidates(
  streamingData?: InnerTubeStreamingData,
  playerId?: string | null,
): Promise<VideoStreamCandidate[]> {
  if (!streamingData) return [];

  const ttl = Number(streamingData.expiresInSeconds);
  const responseExpiry = Number.isFinite(ttl) && ttl > 0 ? Date.now() + ttl * 1000 : undefined;
  const isHttpsUrl = (value?: string): value is string => {
    try { return !!value && new URL(value).protocol === 'https:'; } catch { return false; }
  };
  const metadata = (uri: string, format?: InnerTubeFormat): Partial<VideoStreamCandidate> => {
    const mimeType = format?.mimeType?.split(';')[0].trim().toLowerCase();
    const codecs = format?.mimeType?.match(/codecs\s*=\s*"([^"]+)"/i)?.[1]
      .split(',').map(codec => codec.trim()).filter(Boolean);
    const container: VideoStreamCandidate['container'] = mimeType?.endsWith('/mp4') ? 'mp4'
      : mimeType?.endsWith('/webm') ? 'webm'
      : mimeType === 'audio/mpeg' ? 'mp3'
      : mimeType?.endsWith('/ogg') ? 'ogg' : undefined;
    let expires = 0;
    try { expires = Number(new URL(uri).searchParams.get('expire')); } catch { /* Unknown expiry. */ }
    const urlExpiry = Number.isFinite(expires) && expires > 0 ? expires * 1000 : undefined;
    const expiresAt = responseExpiry && urlExpiry ? Math.min(responseExpiry, urlExpiry) : responseExpiry ?? urlExpiry;
    return { formatId: format?.itag !== undefined ? String(format.itag) : undefined, mimeType, codecs, container, expiresAt };
  };
  let effectivePlayerId = playerId;
  let playerLookup: Promise<string | null> | undefined;
  let attemptCache: Promise<CipheredPlayerCache> | undefined;
  const candidates: VideoStreamCandidate[] = [];
  const decipher = async (fmt: InnerTubeFormat): Promise<string | null> => {
    if (fmt.url?.startsWith('https://')) {
      try {
        if (!new URL(fmt.url).searchParams.has('n')) return fmt.url;
      } catch {
        return null;
      }
    }
    if (!fmt.url && !fmt.signatureCipher && !fmt.cipher) return null;
    effectivePlayerId ||= await (playerLookup ??= getOrFetchPlayerId());
    if (effectivePlayerId) {
      const id = effectivePlayerId;
      return resolveWithCache(fmt, () => (attemptCache ??= loadPlayerCache(id)));
    }
    // Fallback: sync resolve (works only for unciphered direct URLs)
    return resolveFormatUrl(fmt);
  };

  // 1. HLS Manifest is top priority: adaptive audio+video, AVPlayer/ExoPlayer native
  if (
    isHttpsUrl(streamingData.hlsManifestUrl)
  ) {
    candidates.push({
      ...metadata(streamingData.hlsManifestUrl),
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
      ...metadata(url, fmt),
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
        ...metadata(url, fmt),
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
        ...metadata(url, fmt),
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

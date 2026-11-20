/**
 * Download Manager
 *
 * Provides real binary file downloads using expo-file-system.
 * Downloads are written to FileSystem.documentDirectory/vyde-downloads/
 * and can be resumed, paused, and deleted.
 *
 * Usage:
 *   const task = await DownloadManager.start({ videoId, uri, fileName, onProgress });
 *   await task.pause();
 *   await task.resume();
 *   await task.cancel();
 *   await DownloadManager.deleteDownload(fileName);
 *   const localUri = DownloadManager.localUri(fileName);
 */

import * as FileSystem from 'expo-file-system/legacy';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DownloadStartOptions {
  videoId: string;
  /** Remote HTTPS URL of the media stream */
  uri: string;
  /** Filename including extension, e.g. "dQw4w9WgXcQ.mp4" */
  fileName: string;
  /** Expected complete asset size from the selected format, if known. */
  expectedBytes?: number;
  onProgress?: (progress: number, bytesWritten: number, bytesTotal: number) => void;
  onComplete?: (localUri: string) => void;
  onError?: (error: string) => void;
}

export interface DownloadTask {
  videoId: string;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  cancel: () => Promise<void>;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DOWNLOADS_DIR = `${FileSystem.documentDirectory}vyde-downloads/`;

interface ActiveDownload {
  cancelled: boolean;
  paused: boolean;
  resumed: boolean;
  finalizing?: boolean;
  expectedBytes?: number;
  resumable?: FileSystem.DownloadResumable;
  operation?: Promise<void>;
  setup?: Promise<void>;
  cancellation?: Promise<void>;
}

// Session ownership only. Persistent job/recovery state is phase 06 work.
const activeDownloads = new Map<string, ActiveDownload>();

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function ensureDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(DOWNLOADS_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(DOWNLOADS_DIR, { intermediates: true });
  }
}

/**
 * Returns the full local file:// URI for a given filename.
 */
export function localUri(fileName: string): string {
  if (!/^[\w.-]+$/.test(fileName) || fileName === '.' || fileName === '..') {
    throw new Error('Invalid download filename.');
  }
  return `${DOWNLOADS_DIR}${fileName}`;
}

/**
 * Checks whether a downloaded file actually exists on disk.
 */
export async function fileExists(fileName: string): Promise<boolean> {
  try {
    const info = await FileSystem.getInfoAsync(localUri(fileName));
    return info.exists && !info.isDirectory;
  } catch {
    return false;
  }
}

/**
 * Returns file size in bytes, or null if not found.
 */
export async function fileSize(fileName: string): Promise<number | null> {
  try {
    const info = await FileSystem.getInfoAsync(localUri(fileName));
    if (info.exists && 'size' in info) return info.size ?? null;
    return null;
  } catch {
    return null;
  }
}

// ─── Core API ─────────────────────────────────────────────────────────────────

/**
 * Starts a resumable download of a media file.
 * Returns a DownloadTask with pause/resume/cancel controls.
 */
export async function start(options: DownloadStartOptions): Promise<DownloadTask> {
  const { videoId, uri, fileName, onProgress, onComplete, onError } = options;
  const destUri = localUri(fileName);
  const partialUri = `${destUri}.part`;
  if (activeDownloads.has(fileName)) {
    throw new Error('This download is already active.');
  }
  const entry: ActiveDownload = {
    cancelled: false,
    paused: false,
    resumed: false,
    expectedBytes: options.expectedBytes,
  };
  // Reserve ownership before any await; two starts must not share a destination.
  activeDownloads.set(fileName, entry);
  const ownsTask = () => !entry.cancelled && activeDownloads.get(fileName) === entry;

  const finish = async (result: FileSystem.FileSystemDownloadResult | undefined) => {
    if (!ownsTask() || entry.paused) return;
    entry.finalizing = true;
    if (!result || ![200, 206].includes(result.status)) {
      throw new Error(result ? `Download failed (HTTP ${result.status}).` : 'Download returned no file.');
    }
    const headers = Object.fromEntries(
      Object.entries(result.headers ?? {}).map(([key, value]) => [key.toLowerCase(), value]),
    );
    if (/^(text\/|application\/(json|problem\+json|xml))/i.test(headers['content-type'] ?? '')) {
      throw new Error('The server returned an error document instead of media.');
    }
    const info = await FileSystem.getInfoAsync(partialUri);
    if (!ownsTask()) return;
    if (!info.exists || info.isDirectory || info.size <= 0) {
      throw new Error('Downloaded media is empty or missing.');
    }
    const headerLength = Number(headers['content-length']);
    const expected = entry.expectedBytes ?? (!entry.resumed && headerLength > 0 ? headerLength : undefined);
    if (expected !== undefined && Number.isFinite(expected) && expected > 0 && info.size !== expected) {
      throw new Error(`Download is incomplete (${info.size} of ${expected} bytes).`);
    }
    // Existing final files are never trusted as completion evidence. Replace
    // only after a fresh transfer passes these checks; native media validation
    // and a persisted completion record are later phases.
    await FileSystem.moveAsync({ from: partialUri, to: destUri });
    if (!ownsTask()) {
      await FileSystem.deleteAsync(destUri, { idempotent: true });
      return;
    }
    activeDownloads.delete(fileName);
    onComplete?.(destUri);
  };

  const run = (operation: Promise<FileSystem.FileSystemDownloadResult | undefined>) => {
    entry.operation = operation.then(finish).catch(async error => {
      if (!ownsTask() || entry.paused) return;
      await FileSystem.deleteAsync(partialUri, { idempotent: true }).catch(() => {});
      if (!ownsTask()) return;
      activeDownloads.delete(fileName);
      onError?.(error instanceof Error ? error.message : String(error));
    });
  };

  entry.setup = (async () => {
    await ensureDir();
    if (!ownsTask()) return;
    // Without a persistent source/validator checkpoint, old partial bytes cannot
    // safely be resumed after a restart. Session pause/resume still works.
    await FileSystem.deleteAsync(partialUri, { idempotent: true });
    if (!ownsTask()) return;

    const callback: FileSystem.DownloadProgressCallback = ({ totalBytesWritten, totalBytesExpectedToWrite }) => {
      if (!ownsTask() || entry.paused) return;
      if (!entry.resumed && !entry.expectedBytes && totalBytesExpectedToWrite > 0) {
        entry.expectedBytes = totalBytesExpectedToWrite;
      }
      const progress =
        totalBytesExpectedToWrite > 0
          ? Math.min(1, totalBytesWritten / totalBytesExpectedToWrite)
          : 0;
      onProgress?.(progress, totalBytesWritten, totalBytesExpectedToWrite);
    };

    const downloadResumable = FileSystem.createDownloadResumable(
      uri,
      partialUri,
      {
        headers: {
          // Some CDN endpoints require a Referer header
          Referer: 'https://www.youtube.com/',
          Origin: 'https://www.youtube.com',
        },
      },
      callback,
    );

    entry.resumable = downloadResumable;
    run(downloadResumable.downloadAsync());
  })();
  try {
    await entry.setup;
  } catch (error) {
    if (!entry.cancelled && activeDownloads.get(fileName) === entry) activeDownloads.delete(fileName);
    throw error;
  }

  return {
    videoId,
    pause: async () => {
      if (!ownsTask() || entry.paused || entry.finalizing) return;
      entry.paused = true;
      try {
        await entry.resumable!.pauseAsync();
        await entry.operation;
      } catch (error) {
        entry.paused = false;
        throw error;
      }
    },
    resume: async () => {
      if (!ownsTask() || !entry.paused) return;
      entry.paused = false;
      entry.resumed = true;
      run(entry.resumable!.resumeAsync());
      await entry.operation;
    },
    cancel: async () => {
      if (activeDownloads.get(fileName) === entry) await cancelDownload(fileName);
    },
  };
}

async function cancelDownload(fileName: string): Promise<void> {
  const entry = activeDownloads.get(fileName);
  if (!entry) return;
  if (entry.cancellation) return entry.cancellation;
  entry.cancelled = true; // Invalidate callbacks before touching native work.
  entry.cancellation = (async () => {
    try {
      await entry.resumable?.cancelAsync();
    } finally {
      try {
        await entry.setup?.catch(() => {});
        await entry.operation;
        await FileSystem.deleteAsync(`${localUri(fileName)}.part`, { idempotent: true });
      } finally {
        if (activeDownloads.get(fileName) === entry) activeDownloads.delete(fileName);
      }
    }
  })();
  return entry.cancellation;
}

/**
 * Deletes a downloaded file from disk.
 */
export async function deleteDownload(fileName: string): Promise<void> {
  await cancelDownload(fileName);
  try {
    await FileSystem.deleteAsync(localUri(fileName), { idempotent: true });
  } catch (err) {
    console.warn('[DownloadManager] deleteDownload failed:', err);
  }
}

/**
 * Returns a list of all files in the downloads directory with their sizes.
 */
export async function listDownloads(includePartial = false): Promise<{ name: string; uri: string; size: number }[]> {
  try {
    await ensureDir();
    const files = await FileSystem.readDirectoryAsync(DOWNLOADS_DIR);
    const results: { name: string; uri: string; size: number }[] = [];
    for (const name of files) {
      if (!includePartial && name.endsWith('.part')) continue;
      const info = await FileSystem.getInfoAsync(`${DOWNLOADS_DIR}${name}`);
      if (info.exists && !info.isDirectory) {
        results.push({
          name,
          uri: `${DOWNLOADS_DIR}${name}`,
          size: 'size' in info ? (info.size ?? 0) : 0,
        });
      }
    }
    return results;
  } catch {
    return [];
  }
}

/**
 * Returns the total storage used by all downloads in MB.
 */
export async function totalStorageMB(): Promise<number> {
  const files = await listDownloads(true);
  const bytes = files.reduce((acc, f) => acc + f.size, 0);
  return bytes / (1024 * 1024);
}

/**
 * Suggests a safe filename for a download based on videoId and content type.
 */
export function suggestFileName(videoId: string, contentType: string): string {
  if (contentType === 'audio') return `${videoId}.m4a`;
  return `${videoId}.mp4`;
}

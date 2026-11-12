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
 *   await DownloadManager.delete(videoId);
 *   const localUri = DownloadManager.localUri(fileName);
 */

import * as FileSystem from 'expo-file-system';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DownloadStartOptions {
  videoId: string;
  /** Remote HTTPS URL of the media stream */
  uri: string;
  /** Filename including extension, e.g. "dQw4w9WgXcQ.mp4" */
  fileName: string;
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

// In-memory registry of active DownloadResumable objects
const activeDownloads = new Map<string, FileSystem.DownloadResumable>();

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
    const info = await FileSystem.getInfoAsync(localUri(fileName), { size: true });
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

  await ensureDir();

  const destUri = localUri(fileName);

  // If a file already exists and is complete, signal complete immediately
  const existing = await FileSystem.getInfoAsync(destUri);
  if (existing.exists) {
    onComplete?.(destUri);
    return {
      videoId,
      pause: async () => {},
      resume: async () => {},
      cancel: async () => {},
    };
  }

  const callback: FileSystem.DownloadProgressCallback = ({ totalBytesWritten, totalBytesExpectedToWrite }) => {
    const progress =
      totalBytesExpectedToWrite > 0
        ? Math.min(1, totalBytesWritten / totalBytesExpectedToWrite)
        : 0;
    onProgress?.(progress, totalBytesWritten, totalBytesExpectedToWrite);
  };

  const downloadResumable = FileSystem.createDownloadResumable(
    uri,
    destUri,
    {
      headers: {
        // Some CDN endpoints require a Referer header
        Referer: 'https://www.youtube.com/',
        Origin: 'https://www.youtube.com',
      },
    },
    callback,
  );

  activeDownloads.set(videoId, downloadResumable);

  // Start the download asynchronously — do not await here so caller gets
  // the task handle immediately
  downloadResumable
    .downloadAsync()
    .then(result => {
      activeDownloads.delete(videoId);
      if (result?.uri) {
        onComplete?.(result.uri);
      } else {
        onError?.('Download completed but no local URI was returned.');
      }
    })
    .catch(err => {
      activeDownloads.delete(videoId);
      const msg = err instanceof Error ? err.message : String(err);
      // Distinguish paused (not an error) vs real failure
      if (!msg.includes('paused') && !msg.includes('cancelled')) {
        onError?.(msg);
      }
    });

  return {
    videoId,
    pause: async () => {
      const dr = activeDownloads.get(videoId);
      if (dr) {
        await dr.pauseAsync();
      }
    },
    resume: async () => {
      const dr = activeDownloads.get(videoId);
      if (dr) {
        const result = await dr.resumeAsync();
        if (result?.uri) onComplete?.(result.uri);
      }
    },
    cancel: async () => {
      const dr = activeDownloads.get(videoId);
      if (dr) {
        await dr.cancelAsync?.();
        activeDownloads.delete(videoId);
      }
      // Remove partial file
      try {
        await FileSystem.deleteAsync(destUri, { idempotent: true });
      } catch {
        // ignore
      }
    },
  };
}

/**
 * Deletes a downloaded file from disk.
 */
export async function deleteDownload(fileName: string): Promise<void> {
  try {
    await FileSystem.deleteAsync(localUri(fileName), { idempotent: true });
  } catch (err) {
    console.warn('[DownloadManager] deleteDownload failed:', err);
  }
}

/**
 * Returns a list of all files in the downloads directory with their sizes.
 */
export async function listDownloads(): Promise<{ name: string; uri: string; size: number }[]> {
  try {
    await ensureDir();
    const files = await FileSystem.readDirectoryAsync(DOWNLOADS_DIR);
    const results: { name: string; uri: string; size: number }[] = [];
    for (const name of files) {
      const info = await FileSystem.getInfoAsync(`${DOWNLOADS_DIR}${name}`, { size: true });
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
  const files = await listDownloads();
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

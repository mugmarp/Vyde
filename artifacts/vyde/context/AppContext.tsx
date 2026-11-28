import React, { createContext, useContext, useEffect, useMemo, useState, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as DownloadManager from '@/services/download/downloadManager';
import { storedDownloadFileName } from '@/domain/download';
import * as Db from '@/services/db';
import * as GoogleAuth from '@/services/auth';
import { createOrderedWriter } from '@/services/storage/orderedWriter';

export interface Playlist {
  id: string;
  name: string;
  videoIds: string[];
  isPrivate: boolean;
}

export interface LocalVideoMetadata {
  title: string;
  channel: string;
  thumbnail: string;
}

export interface LocalHistoryItem {
  videoId: string;
  title: string;
  channel: string;
  thumbnail: string;
  progress: number;
  lastWatchedAt: number;
}

export interface OfflineDownloadItem {
  videoId: string;
  title: string;
  channel: string;
  thumbnail: string;
  duration?: string | null;
  uri?: string;
  fileSize?: string;
  fileName?: string;
  mimeType?: string;
  format: 'mp4' | 'audio';
  status: 'queued' | 'downloading' | 'completed' | 'failed';
  progress: number;
  downloadedAt: number;
}

interface AppContextType {
  playlists: Playlist[];
  likedVideoIds: string[];
  savedVideoIds: string[];
  history: LocalHistoryItem[];
  downloads: OfflineDownloadItem[];
  videoCatalog: Record<string, LocalVideoMetadata>;
  isHydrated: boolean;
  storageError: string | null;
  toggleLike: (videoId: string) => void;
  toggleSave: (videoId: string) => void;
  recordHistory: (videoId: string, video: LocalVideoMetadata, progress?: number) => void;
  createPlaylist: (name: string) => Promise<string | null>;
  addVideoToPlaylist: (playlistId: string, videoId: string) => void;
  removeVideoFromPlaylist: (playlistId: string, videoId: string) => void;
  deletePlaylist: (playlistId: string) => void;
  addDownload: (item: Omit<OfflineDownloadItem, 'downloadedAt'>) => void;
  removeDownload: (videoId: string, fileName?: string) => Promise<boolean>;
  updateDownloadProgress: (videoId: string, progress: number, status?: OfflineDownloadItem['status'], fileName?: string) => void;
  subscriptions: Db.DbSubscription[];
  isSubscribed: (channelId: string) => boolean;
  toggleSubscription: (channelId: string, name: string, thumbnail?: string) => void;
  googleUser: GoogleAuth.GoogleAuthUser | null;
  disconnectGoogle: () => Promise<void>;
  clearHistory: () => void;
  clearLocalData: () => void;
}

const AppContext = createContext<AppContextType | null>(null);
const STORAGE_KEYS = {
  playlists: 'vyde_local_playlists_v1',
  liked: 'vyde_local_liked_v1',
  saved: 'vyde_local_saved_v1',
  history: 'vyde_local_history_v1',
  downloads: 'vyde_local_downloads_v1',
  catalog: 'vyde_local_video_catalog_v1',
} as const;

// Missing keys are valid on first launch. Present but unreadable data must fail
// hydration so persistence cannot replace the original value with empty state.
function readStoredArray(value: string | null): unknown[] {
  if (value === null) return [];
  const parsed: unknown = JSON.parse(value);
  if (!Array.isArray(parsed)) throw new Error('Stored collection must be an array.');
  return parsed;
}

function validateStringIds(items: unknown[]): string[] {
  return items.map(item => {
    if (typeof item !== 'string' || !/^[\w-]{6,64}$/.test(item)) {
      throw new Error('Stored video ID is invalid.');
    }
    return item;
  });
}

function readStringIds(value: string | null): string[] {
  return validateStringIds(readStoredArray(value));
}

function readPlaylists(value: string | null): Playlist[] {
  const parsed = readStoredArray(value);
  return parsed.flatMap((item): Playlist[] => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error('Stored record is invalid.');
    const playlist = item as Record<string, unknown>;
    if (typeof playlist.id !== 'string' || typeof playlist.name !== 'string') throw new Error('Stored playlist is invalid.');
    if (playlist.videoIds !== undefined && !Array.isArray(playlist.videoIds)) throw new Error('Stored playlist members are invalid.');
    return [{
      id: playlist.id,
      name: playlist.name,
      videoIds: Array.isArray(playlist.videoIds)
        ? validateStringIds(playlist.videoIds)
        : [],
      isPrivate: playlist.isPrivate !== false,
    }];
  });
}

function readHistory(value: string | null): LocalHistoryItem[] {
  const parsed = readStoredArray(value);
  return parsed.flatMap((item): LocalHistoryItem[] => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error('Stored record is invalid.');
    const video = item as Record<string, unknown>;
    if (typeof video.videoId !== 'string' || typeof video.title !== 'string') throw new Error('Stored history is invalid.');
    return [{
      videoId: video.videoId,
      title: video.title,
      channel: typeof video.channel === 'string' ? video.channel : '',
      thumbnail: typeof video.thumbnail === 'string' ? video.thumbnail : '',
      progress: typeof video.progress === 'number' && Number.isFinite(video.progress)
        ? Math.max(0, Math.min(1, video.progress))
        : 0,
      lastWatchedAt: typeof video.lastWatchedAt === 'number' ? video.lastWatchedAt : 0,
    }];
  });
}

function readDownloads(value: string | null): OfflineDownloadItem[] {
  const parsed = readStoredArray(value);
  return parsed.flatMap((item): OfflineDownloadItem[] => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error('Stored record is invalid.');
    const dl = item as Record<string, unknown>;
    if (typeof dl.videoId !== 'string' || typeof dl.title !== 'string') throw new Error('Stored download is invalid.');
    if (dl.fileName !== undefined && (typeof dl.fileName !== 'string'
      || !/^[\w.-]+$/.test(dl.fileName) || dl.fileName === '.' || dl.fileName === '..')) {
      throw new Error('Stored download filename is invalid.');
    }
    return [{
      videoId: dl.videoId,
      title: dl.title,
      channel: typeof dl.channel === 'string' ? dl.channel : '',
      thumbnail: typeof dl.thumbnail === 'string' ? dl.thumbnail : '',
      duration: typeof dl.duration === 'string' ? dl.duration : null,
      uri: typeof dl.uri === 'string' ? dl.uri : undefined,
      fileSize: typeof dl.fileSize === 'string' ? dl.fileSize : undefined,
      fileName: typeof dl.fileName === 'string' ? dl.fileName : undefined,
      mimeType: typeof dl.mimeType === 'string' ? dl.mimeType : undefined,
      format: dl.format === 'audio' ? 'audio' : 'mp4',
      status: typeof dl.status === 'string' ? (dl.status as OfflineDownloadItem['status']) : 'completed',
      progress: typeof dl.progress === 'number' ? dl.progress : 1,
      downloadedAt: typeof dl.downloadedAt === 'number' ? dl.downloadedAt : Date.now(),
    }];
  });
}

function readCatalog(value: string | null): Record<string, LocalVideoMetadata> {
  if (value === null) return {};
  const parsed: unknown = JSON.parse(value);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Stored catalog must be an object.');
  return Object.fromEntries(
    Object.entries(parsed as Record<string, unknown>).flatMap(([videoId, item]) => {
      if (!/^[\w-]{6,64}$/.test(videoId) || !item || typeof item !== 'object' || Array.isArray(item)) throw new Error('Stored catalog record is invalid.');
      const metadata = item as Record<string, unknown>;
      if (typeof metadata.title !== 'string') throw new Error('Stored metadata title is invalid.');
      return [[videoId, {
        title: metadata.title,
        channel: typeof metadata.channel === 'string' ? metadata.channel : '',
        thumbnail: typeof metadata.thumbnail === 'string' ? metadata.thumbnail : '',
      }]];
    }),
  );
}

// Keep committed values available to queued actions before React's next render.
// No database work runs inside a React state updater.
function useCommittedState<T>(initial: T) {
  const [value, setValue] = useState(initial);
  const current = useRef(initial);
  const setCommitted = useCallback((next: React.SetStateAction<T>) => {
    const updated = typeof next === 'function'
      ? (next as (previous: T) => T)(current.current)
      : next;
    current.current = updated;
    setValue(updated);
  }, []);
  return [value, setCommitted, current] as const;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [playlists, setPlaylists, playlistsRef] = useCommittedState<Playlist[]>([]);
  const [likedVideoIds, setLikedVideoIds, likesRef] = useCommittedState<string[]>([]);
  const [savedVideoIds, setSavedVideoIds, savesRef] = useCommittedState<string[]>([]);
  const [history, setHistory] = useCommittedState<LocalHistoryItem[]>([]);
  const [downloads, setDownloads] = useState<OfflineDownloadItem[]>([]);
  const [videoCatalog, setVideoCatalog] = useState<Record<string, LocalVideoMetadata>>({});
  const [subscriptions, setSubscriptions, subscriptionsRef] = useCommittedState<Db.DbSubscription[]>([]);
  const [googleUser, setGoogleUser] = useState<GoogleAuth.GoogleAuthUser | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [persistenceReady, setPersistenceReady] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);
  const storageWriterRef = useRef<ReturnType<typeof createOrderedWriter> | null>(null);
  if (!storageWriterRef.current) {
    storageWriterRef.current = createOrderedWriter((key, value) => AsyncStorage.setItem(key, value));
  }
  const storageWriter = storageWriterRef.current;

  useEffect(() => {
    async function hydrate() {
      try {
        const db = await Db.getDatabase();
        if (!db && Platform.OS !== 'web') {
          throw new Error('Local database initialization did not complete.');
        }
        if (db) {
          // Native SQLite storage
          const [dbHistory, dbLikes, dbSaves, dbPlaylists, dbSubs] = await Promise.all([
            Db.fetchHistory(),
            Db.fetchLikedVideoIds(),
            Db.fetchSavedVideoIds(),
            Db.fetchAllPlaylists(),
            Db.fetchAllSubscriptions(),
          ]);

          setHistory(dbHistory);
          setLikedVideoIds(dbLikes);
          setSavedVideoIds(dbSaves);
          setPlaylists(dbPlaylists);
          setSubscriptions(dbSubs);

          // Downloads and video metadata catalog remain in persistent storage
          const [storedDownloads, storedCatalog] = await Promise.all([
            AsyncStorage.getItem(STORAGE_KEYS.downloads),
            AsyncStorage.getItem(STORAGE_KEYS.catalog),
          ]);
          setDownloads(readDownloads(storedDownloads));
          setVideoCatalog(readCatalog(storedCatalog));
        } else {
          // Fallback AsyncStorage path (Web preview)
          const [storedPlaylists, storedLiked, storedSaved, storedHistory, storedDownloads, storedCatalog] =
            await Promise.all(Object.values(STORAGE_KEYS).map(key => AsyncStorage.getItem(key)));

          setPlaylists(readPlaylists(storedPlaylists));
          setLikedVideoIds(readStringIds(storedLiked));
          setSavedVideoIds(readStringIds(storedSaved));
          setHistory(readHistory(storedHistory));
          setDownloads(readDownloads(storedDownloads));
          setVideoCatalog(readCatalog(storedCatalog));
        }

        // Hydrate optional Google Auth profile
        const savedUser = await GoogleAuth.getSavedGoogleUser();
        if (savedUser) setGoogleUser(savedUser);
        setPersistenceReady(true);
      } catch (err) {
        console.warn('[AppContext] Hydration error:', err);
        setStorageError('Local data could not be loaded from this device.');
      } finally {
        setHydrated(true);
      }
    }

    void hydrate();
  }, []);

  const persist = useCallback((key: string, value: unknown) => {
    void storageWriter.write(key, JSON.stringify(value))
      .catch(() => setStorageError('Local data could not be saved on this device.'));
  }, [storageWriter]);

  useEffect(() => { if (persistenceReady) persist(STORAGE_KEYS.playlists, playlists); }, [playlists, persistenceReady, persist]);
  useEffect(() => { if (persistenceReady) persist(STORAGE_KEYS.liked, likedVideoIds); }, [likedVideoIds, persistenceReady, persist]);
  useEffect(() => { if (persistenceReady) persist(STORAGE_KEYS.saved, savedVideoIds); }, [savedVideoIds, persistenceReady, persist]);
  useEffect(() => { if (persistenceReady) persist(STORAGE_KEYS.history, history); }, [history, persistenceReady, persist]);
  useEffect(() => { if (persistenceReady) persist(STORAGE_KEYS.downloads, downloads); }, [downloads, persistenceReady, persist]);
  useEffect(() => { if (persistenceReady) persist(STORAGE_KEYS.catalog, videoCatalog); }, [videoCatalog, persistenceReady, persist]);

  const mutations = useRef<Promise<unknown>>(Promise.resolve());
  const runMutation = useCallback((task: () => Promise<void>): Promise<boolean> => {
    if (!persistenceReady) {
      setStorageError('Local data must load successfully before changes can be saved.');
      return Promise.resolve(false);
    }
    const result = mutations.current.then(async () => {
      try {
        await task();
        return true;
      } catch {
        setStorageError('Local data could not be saved on this device. Your change was not applied.');
        return false;
      }
    });
    mutations.current = result;
    return result;
  }, [persistenceReady]);

  const writeCollection = useCallback(async (key: string, value: unknown, nativeWrite: () => Promise<void>) => {
    if (Platform.OS === 'web') await storageWriter.write(key, JSON.stringify(value));
    else await nativeWrite();
  }, [storageWriter]);

  const toggleLike = useCallback((videoId: string) => {
    void runMutation(async () => {
      const liked = !likesRef.current.includes(videoId);
      const next = liked ? [...likesRef.current, videoId] : likesRef.current.filter(id => id !== videoId);
      await writeCollection(STORAGE_KEYS.liked, next, () => Db.setVideoLiked(videoId, '', '', '', liked));
      setLikedVideoIds(next);
    });
  }, [runMutation, writeCollection]);

  const toggleSave = useCallback((videoId: string) => {
    void runMutation(async () => {
      const saved = !savesRef.current.includes(videoId);
      const next = saved ? [...savesRef.current, videoId] : savesRef.current.filter(id => id !== videoId);
      await writeCollection(STORAGE_KEYS.saved, next, () => Db.setVideoSaved(videoId, '', '', '', saved));
      setSavedVideoIds(next);
    });
  }, [runMutation, writeCollection]);

  const recordHistory = useCallback((videoId: string, video: LocalVideoMetadata, progress = 0) => {
    const safeProgress = Number.isFinite(progress) ? Math.max(0, Math.min(1, progress)) : 0;
    const item: LocalHistoryItem = { videoId, ...video, progress: safeProgress, lastWatchedAt: Date.now() };
    void runMutation(async () => {
      // The native repository is authoritative; catalog mirroring remains separate.
      if (Platform.OS !== 'web') await Db.upsertHistory(item);
      setVideoCatalog(previous => ({ ...previous, [videoId]: video }));
      setHistory(previous => [item, ...previous.filter(i => i.videoId !== videoId)].slice(0, 100));
    });
  }, [runMutation]);

  const createPlaylist = useCallback(async (name: string) => {
    const normalized = name.trim();
    if (!normalized) return null;
    const id = `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const applied = await runMutation(async () => {
      const next = [{ id, name: normalized, videoIds: [], isPrivate: true }, ...playlistsRef.current];
      await writeCollection(STORAGE_KEYS.playlists, next, () => Db.createNewPlaylist(id, normalized, true));
      setPlaylists(next);
    });
    return applied ? id : null;
  }, [runMutation, writeCollection]);

  const addVideoToPlaylist = useCallback((playlistId: string, videoId: string) => {
    void runMutation(async () => {
      const next = playlistsRef.current.map(playlist =>
        playlist.id === playlistId && !playlist.videoIds.includes(videoId)
          ? { ...playlist, videoIds: [...playlist.videoIds, videoId] } : playlist);
      await writeCollection(STORAGE_KEYS.playlists, next, () => Db.addVideoToPlaylistDb(playlistId, videoId));
      setPlaylists(next);
    });
  }, [runMutation, writeCollection]);

  const removeVideoFromPlaylist = useCallback((playlistId: string, videoId: string) => {
    void runMutation(async () => {
      const next = playlistsRef.current.map(playlist => playlist.id === playlistId
        ? { ...playlist, videoIds: playlist.videoIds.filter(id => id !== videoId) } : playlist);
      await writeCollection(STORAGE_KEYS.playlists, next, () => Db.removeVideoFromPlaylistDb(playlistId, videoId));
      setPlaylists(next);
    });
  }, [runMutation, writeCollection]);

  const deletePlaylist = useCallback((playlistId: string) => {
    void runMutation(async () => {
      const next = playlistsRef.current.filter(playlist => playlist.id !== playlistId);
      await writeCollection(STORAGE_KEYS.playlists, next, () => Db.removePlaylist(playlistId));
      setPlaylists(next);
    });
  }, [runMutation, writeCollection]);

  const addDownload = useCallback((item: Omit<OfflineDownloadItem, 'downloadedAt'>) => {
    setDownloads(prev => [
      { ...item, downloadedAt: Date.now() },
      ...prev.filter(d => storedDownloadFileName(d) !== storedDownloadFileName(item)),
    ]);
  }, []);

  const removeDownload = useCallback(async (videoId: string, fileName?: string): Promise<boolean> => {
    const targets = downloads.filter(d => d.videoId === videoId && (!fileName || storedDownloadFileName(d) === fileName));
    const removed = new Set<string>();
    for (const item of targets) {
      const name = storedDownloadFileName(item);
      try {
        await DownloadManager.deleteDownload(name);
        removed.add(name);
      } catch {
        setStorageError('The download could not be removed from this device. Please retry.');
      }
    }
    setDownloads(previous => previous.filter(d => d.videoId !== videoId || !removed.has(storedDownloadFileName(d))));
    return targets.every(item => removed.has(storedDownloadFileName(item)));
  }, [downloads]);

  const updateDownloadProgress = useCallback((videoId: string, progress: number, status?: OfflineDownloadItem['status'], fileName?: string) => {
    setDownloads(prev => prev.map(d => {
      if (d.videoId !== videoId || (fileName && storedDownloadFileName(d) !== fileName)) return d;
      return {
        ...d,
        progress,
        ...(status ? { status } : {}),
      };
    }));
  }, []);

  const isSubscribed = useCallback((channelId: string) => {
    return subscriptions.some(s => s.channelId === channelId);
  }, [subscriptions]);

  const toggleSubscription = useCallback((channelId: string, name: string, thumbnail = '') => {
    void runMutation(async () => {
      const subscribe = !subscriptionsRef.current.some(s => s.channelId === channelId);
      await Db.setSubscription(channelId, name, thumbnail, subscribe);
      setSubscriptions(previous => subscribe
        ? [{ channelId, name, thumbnail, subscribedAt: Date.now() }, ...previous]
        : previous.filter(s => s.channelId !== channelId));
    });
  }, [runMutation]);

  const disconnectGoogle = useCallback(async () => {
    await GoogleAuth.disconnectGoogleAuth();
    setGoogleUser(null);
  }, []);

  const clearHistory = useCallback(() => {
    void runMutation(async () => {
      await writeCollection(STORAGE_KEYS.history, [], () => Db.clearAllHistory());
      setHistory([]);
    });
  }, [runMutation, writeCollection]);

  const clearLocalData = useCallback(() => {
    void runMutation(async () => {
      // Do not delete files or clear UI state when the database reset fails.
      await Db.resetAllLocalData();
      const retainedDownloads: OfflineDownloadItem[] = [];
      for (const item of downloads) {
        const fileName = storedDownloadFileName(item);
        try { await DownloadManager.deleteDownload(fileName); }
        catch {
          retainedDownloads.push(item);
          setStorageError('The library was cleared, but some downloaded files could not be removed. Their records were retained for retry.');
        }
      }
      setPlaylists([]);
      setLikedVideoIds([]);
      setSavedVideoIds([]);
      setHistory([]);
      setDownloads(retainedDownloads);
      setSubscriptions([]);
      setVideoCatalog({});
    });
  }, [downloads, runMutation]);

  const value = useMemo(() => ({
    playlists,
    likedVideoIds,
    savedVideoIds,
    history,
    downloads,
    videoCatalog,
    isHydrated: hydrated,
    storageError,
    toggleLike,
    toggleSave,
    recordHistory,
    createPlaylist,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    addDownload,
    removeDownload,
    updateDownloadProgress,
    subscriptions,
    isSubscribed,
    toggleSubscription,
    googleUser,
    disconnectGoogle,
    clearHistory,
    clearLocalData,
  }), [
    playlists, likedVideoIds, savedVideoIds, history, downloads, videoCatalog, hydrated, storageError,
    subscriptions, isSubscribed, toggleSubscription, googleUser, disconnectGoogle,
    toggleLike, toggleSave, recordHistory, createPlaylist, addVideoToPlaylist,
    removeVideoFromPlaylist, deletePlaylist, addDownload, removeDownload, updateDownloadProgress,
    clearHistory, clearLocalData,
  ]);

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within AppProvider');
  return ctx;
}

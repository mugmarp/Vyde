import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as DownloadManager from '@/services/download/downloadManager';
import * as Db from '@/services/db';
import * as GoogleAuth from '@/services/auth';

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
  createPlaylist: (name: string) => string | null;
  addVideoToPlaylist: (playlistId: string, videoId: string) => void;
  removeVideoFromPlaylist: (playlistId: string, videoId: string) => void;
  deletePlaylist: (playlistId: string) => void;
  addDownload: (item: Omit<OfflineDownloadItem, 'downloadedAt'>) => void;
  removeDownload: (videoId: string) => void;
  updateDownloadProgress: (videoId: string, progress: number, status?: OfflineDownloadItem['status']) => void;
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
    return [{
      videoId: dl.videoId,
      title: dl.title,
      channel: typeof dl.channel === 'string' ? dl.channel : '',
      thumbnail: typeof dl.thumbnail === 'string' ? dl.thumbnail : '',
      duration: typeof dl.duration === 'string' ? dl.duration : null,
      uri: typeof dl.uri === 'string' ? dl.uri : undefined,
      fileSize: typeof dl.fileSize === 'string' ? dl.fileSize : undefined,
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

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [likedVideoIds, setLikedVideoIds] = useState<string[]>([]);
  const [savedVideoIds, setSavedVideoIds] = useState<string[]>([]);
  const [history, setHistory] = useState<LocalHistoryItem[]>([]);
  const [downloads, setDownloads] = useState<OfflineDownloadItem[]>([]);
  const [videoCatalog, setVideoCatalog] = useState<Record<string, LocalVideoMetadata>>({});
  const [subscriptions, setSubscriptions] = useState<Db.DbSubscription[]>([]);
  const [googleUser, setGoogleUser] = useState<GoogleAuth.GoogleAuthUser | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [persistenceReady, setPersistenceReady] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);

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
    void AsyncStorage.setItem(key, JSON.stringify(value))
      .catch(() => setStorageError('Local data could not be saved on this device.'));
  }, []);

  useEffect(() => { if (persistenceReady) persist(STORAGE_KEYS.playlists, playlists); }, [playlists, persistenceReady, persist]);
  useEffect(() => { if (persistenceReady) persist(STORAGE_KEYS.liked, likedVideoIds); }, [likedVideoIds, persistenceReady, persist]);
  useEffect(() => { if (persistenceReady) persist(STORAGE_KEYS.saved, savedVideoIds); }, [savedVideoIds, persistenceReady, persist]);
  useEffect(() => { if (persistenceReady) persist(STORAGE_KEYS.history, history); }, [history, persistenceReady, persist]);
  useEffect(() => { if (persistenceReady) persist(STORAGE_KEYS.downloads, downloads); }, [downloads, persistenceReady, persist]);
  useEffect(() => { if (persistenceReady) persist(STORAGE_KEYS.catalog, videoCatalog); }, [videoCatalog, persistenceReady, persist]);

  const toggleLike = useCallback((videoId: string) => {
    setLikedVideoIds(prev => {
      const willBeLiked = !prev.includes(videoId);
      void Db.setVideoLiked(videoId, '', '', '', willBeLiked);
      return willBeLiked ? [...prev, videoId] : prev.filter(id => id !== videoId);
    });
  }, []);

  const toggleSave = useCallback((videoId: string) => {
    setSavedVideoIds(prev => {
      const willBeSaved = !prev.includes(videoId);
      void Db.setVideoSaved(videoId, '', '', '', willBeSaved);
      return willBeSaved ? [...prev, videoId] : prev.filter(id => id !== videoId);
    });
  }, []);

  const recordHistory = useCallback((videoId: string, video: LocalVideoMetadata, progress = 0) => {
    const safeProgress = Number.isFinite(progress) ? Math.max(0, Math.min(1, progress)) : 0;
    const now = Date.now();
    const item: LocalHistoryItem = { videoId, ...video, progress: safeProgress, lastWatchedAt: now };

    setVideoCatalog(previous => ({ ...previous, [videoId]: video }));
    setHistory(prev => [
      item,
      ...prev.filter(i => i.videoId !== videoId),
    ].slice(0, 100));

    // Persist asynchronously to SQLite
    void Db.upsertHistory(item);
  }, []);

  const createPlaylist = useCallback((name: string) => {
    const normalized = name.trim();
    if (!normalized) return null;
    const id = `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    void Db.createNewPlaylist(id, normalized, true);
    setPlaylists(previous => [
      { id, name: normalized, videoIds: [], isPrivate: true },
      ...previous,
    ]);
    return id;
  }, []);

  const addVideoToPlaylist = useCallback((playlistId: string, videoId: string) => {
    void Db.addVideoToPlaylistDb(playlistId, videoId);
    setPlaylists(previous => previous.map(playlist =>
      playlist.id === playlistId && !playlist.videoIds.includes(videoId)
        ? { ...playlist, videoIds: [...playlist.videoIds, videoId] }
        : playlist
    ));
  }, []);

  const removeVideoFromPlaylist = useCallback((playlistId: string, videoId: string) => {
    void Db.removeVideoFromPlaylistDb(playlistId, videoId);
    setPlaylists(previous => previous.map(playlist =>
      playlist.id === playlistId
        ? { ...playlist, videoIds: playlist.videoIds.filter(id => id !== videoId) }
        : playlist
    ));
  }, []);

  const deletePlaylist = useCallback((playlistId: string) => {
    void Db.removePlaylist(playlistId);
    setPlaylists(previous => previous.filter(playlist => playlist.id !== playlistId));
  }, []);

  const addDownload = useCallback((item: Omit<OfflineDownloadItem, 'downloadedAt'>) => {
    setDownloads(prev => [
      { ...item, downloadedAt: Date.now() },
      ...prev.filter(d => d.videoId !== item.videoId),
    ]);
  }, []);

  const removeDownload = useCallback((videoId: string) => {
    const item = downloads.find(d => d.videoId === videoId);
    if (item) {
      // Invalidate active callbacks even when there is no completed URI yet.
      const fileName = DownloadManager.suggestFileName(videoId, item.format === 'audio' ? 'audio' : 'mp4');
      void DownloadManager.deleteDownload(fileName)
        .catch(() => setStorageError('The download could not be removed from this device.'));
    }
    setDownloads(prev => prev.filter(d => d.videoId !== videoId));
  }, [downloads]);

  const updateDownloadProgress = useCallback((videoId: string, progress: number, status?: OfflineDownloadItem['status']) => {
    setDownloads(prev => prev.map(d => {
      if (d.videoId !== videoId) return d;
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
    setSubscriptions(prev => {
      const exists = prev.some(s => s.channelId === channelId);
      const willSubscribe = !exists;
      void Db.setSubscription(channelId, name, thumbnail, willSubscribe);
      if (willSubscribe) {
        return [{ channelId, name, thumbnail, subscribedAt: Date.now() }, ...prev];
      }
      return prev.filter(s => s.channelId !== channelId);
    });
  }, []);

  const disconnectGoogle = useCallback(async () => {
    await GoogleAuth.disconnectGoogleAuth();
    setGoogleUser(null);
  }, []);

  const clearHistory = useCallback(() => {
    void Db.clearAllHistory();
    setHistory([]);
  }, []);

  const clearLocalData = useCallback(() => {
    for (const item of downloads) {
      const fileName = DownloadManager.suggestFileName(item.videoId, item.format === 'audio' ? 'audio' : 'mp4');
      void DownloadManager.deleteDownload(fileName)
        .catch(() => setStorageError('Some downloaded files could not be removed.'));
    }
    void Db.resetAllLocalData();
    setPlaylists([]);
    setLikedVideoIds([]);
    setSavedVideoIds([]);
    setHistory([]);
    setDownloads([]);
    setSubscriptions([]);
    setVideoCatalog({});
  }, [downloads]);

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

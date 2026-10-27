import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

interface AppContextType {
  playlists: Playlist[];
  likedVideoIds: string[];
  savedVideoIds: string[];
  history: LocalHistoryItem[];
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
  clearHistory: () => void;
  clearLocalData: () => void;
}

const AppContext = createContext<AppContextType | null>(null);
const STORAGE_KEYS = {
  playlists: 'vyde_local_playlists_v1',
  liked: 'vyde_local_liked_v1',
  saved: 'vyde_local_saved_v1',
  history: 'vyde_local_history_v1',
  catalog: 'vyde_local_video_catalog_v1',
} as const;

function parseStored(value: string | null): unknown {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function readStringIds(value: string | null): string[] {
  const parsed = parseStored(value);
  return Array.isArray(parsed)
    ? parsed.filter((item): item is string => typeof item === 'string' && /^[\w-]{6,64}$/.test(item))
    : [];
}

function readPlaylists(value: string | null): Playlist[] {
  const parsed = parseStored(value);
  if (!Array.isArray(parsed)) return [];
  return parsed.flatMap((item): Playlist[] => {
    if (!item || typeof item !== 'object') return [];
    const playlist = item as Record<string, unknown>;
    if (typeof playlist.id !== 'string' || typeof playlist.name !== 'string') return [];
    return [{
      id: playlist.id,
      name: playlist.name,
      videoIds: Array.isArray(playlist.videoIds)
        ? playlist.videoIds.filter((id): id is string => typeof id === 'string' && /^[\w-]{6,64}$/.test(id))
        : [],
      isPrivate: playlist.isPrivate !== false,
    }];
  });
}

function readHistory(value: string | null): LocalHistoryItem[] {
  const parsed = parseStored(value);
  if (!Array.isArray(parsed)) return [];
  return parsed.flatMap((item): LocalHistoryItem[] => {
    if (!item || typeof item !== 'object') return [];
    const video = item as Record<string, unknown>;
    if (typeof video.videoId !== 'string' || typeof video.title !== 'string') return [];
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

function readCatalog(value: string | null): Record<string, LocalVideoMetadata> {
  const parsed = parseStored(value);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
  return Object.fromEntries(
    Object.entries(parsed as Record<string, unknown>).flatMap(([videoId, item]) => {
      if (!/^[\w-]{6,64}$/.test(videoId) || !item || typeof item !== 'object') return [];
      const metadata = item as Record<string, unknown>;
      if (typeof metadata.title !== 'string') return [];
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
  const [videoCatalog, setVideoCatalog] = useState<Record<string, LocalVideoMetadata>>({});
  const [hydrated, setHydrated] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all(Object.values(STORAGE_KEYS).map(key => AsyncStorage.getItem(key)))
      .then(([storedPlaylists, storedLiked, storedSaved, storedHistory, storedCatalog]) => {
        setPlaylists(readPlaylists(storedPlaylists));
        setLikedVideoIds(readStringIds(storedLiked));
        setSavedVideoIds(readStringIds(storedSaved));
        setHistory(readHistory(storedHistory));
        setVideoCatalog(readCatalog(storedCatalog));
      })
      .catch(() => setStorageError('Local data could not be loaded from this device.'))
      .finally(() => setHydrated(true));
  }, []);

  const persist = useCallback((key: string, value: unknown) => {
    void AsyncStorage.setItem(key, JSON.stringify(value))
      .catch(() => setStorageError('Local data could not be saved on this device.'));
  }, []);

  useEffect(() => { if (hydrated) persist(STORAGE_KEYS.playlists, playlists); }, [playlists, hydrated, persist]);
  useEffect(() => { if (hydrated) persist(STORAGE_KEYS.liked, likedVideoIds); }, [likedVideoIds, hydrated, persist]);
  useEffect(() => { if (hydrated) persist(STORAGE_KEYS.saved, savedVideoIds); }, [savedVideoIds, hydrated, persist]);
  useEffect(() => { if (hydrated) persist(STORAGE_KEYS.history, history); }, [history, hydrated, persist]);
  useEffect(() => { if (hydrated) persist(STORAGE_KEYS.catalog, videoCatalog); }, [videoCatalog, hydrated, persist]);

  const toggleLike = useCallback((videoId: string) =>
    setLikedVideoIds(prev =>
      prev.includes(videoId) ? prev.filter(id => id !== videoId) : [...prev, videoId]
    ), []);

  const toggleSave = useCallback((videoId: string) =>
    setSavedVideoIds(prev =>
      prev.includes(videoId) ? prev.filter(id => id !== videoId) : [...prev, videoId]
    ), []);

  const recordHistory = useCallback((videoId: string, video: LocalVideoMetadata, progress = 0) => {
    const safeProgress = Number.isFinite(progress) ? Math.max(0, Math.min(1, progress)) : 0;
    setVideoCatalog(previous => ({ ...previous, [videoId]: video }));
    setHistory(prev => [
      { videoId, ...video, progress: safeProgress, lastWatchedAt: Date.now() },
      ...prev.filter(item => item.videoId !== videoId),
    ].slice(0, 100));
  }, []);

  const createPlaylist = useCallback((name: string) => {
    const normalized = name.trim();
    if (!normalized) return null;
    const id = `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setPlaylists(previous => [
      { id, name: normalized, videoIds: [], isPrivate: true },
      ...previous,
    ]);
    return id;
  }, []);

  const addVideoToPlaylist = useCallback((playlistId: string, videoId: string) => {
    setPlaylists(previous => previous.map(playlist =>
      playlist.id === playlistId && !playlist.videoIds.includes(videoId)
        ? { ...playlist, videoIds: [...playlist.videoIds, videoId] }
        : playlist
    ));
  }, []);

  const removeVideoFromPlaylist = useCallback((playlistId: string, videoId: string) => {
    setPlaylists(previous => previous.map(playlist =>
      playlist.id === playlistId
        ? { ...playlist, videoIds: playlist.videoIds.filter(id => id !== videoId) }
        : playlist
    ));
  }, []);

  const deletePlaylist = useCallback((playlistId: string) => {
    setPlaylists(previous => previous.filter(playlist => playlist.id !== playlistId));
  }, []);

  const clearHistory = useCallback(() => setHistory([]), []);

  const clearLocalData = useCallback(() => {
    setPlaylists([]);
    setLikedVideoIds([]);
    setSavedVideoIds([]);
    setHistory([]);
    setVideoCatalog({});
  }, []);

  const value = useMemo(() => ({
    playlists,
    likedVideoIds,
    savedVideoIds,
    history,
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
    clearHistory,
    clearLocalData,
  }), [
    playlists, likedVideoIds, savedVideoIds, history, videoCatalog, hydrated, storageError,
    toggleLike, toggleSave, recordHistory, createPlaylist, addVideoToPlaylist,
    removeVideoFromPlaylist, deletePlaylist, clearHistory, clearLocalData,
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

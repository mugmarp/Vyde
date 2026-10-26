import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Playlist {
  id: string;
  name: string;
  count: number;
  isPrivate: boolean;
}

export interface LocalHistoryItem {
  videoId: string;
  title: string;
  channel: string;
  thumbnail: number | string;
  progress: number;
  lastWatchedAt: number;
}

interface HistoryVideo {
  title: string;
  channel: string;
  thumbnail: number | string;
}

interface AppContextType {
  playlists: Playlist[];
  likedVideoIds: string[];
  savedVideoIds: string[];
  history: LocalHistoryItem[];
  toggleLike: (videoId: string) => void;
  toggleSave: (videoId: string) => void;
  recordHistory: (videoId: string, video: HistoryVideo, progress?: number) => void;
  createPlaylist: (name: string) => void;
}

const AppContext = createContext<AppContextType | null>(null);
const STORAGE_KEYS = {
  playlists: 'vyde_local_playlists_v1',
  liked: 'vyde_local_liked_v1',
  saved: 'vyde_local_saved_v1',
  history: 'vyde_local_history_v1',
} as const;

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [likedVideoIds, setLikedVideoIds] = useState<string[]>([]);
  const [savedVideoIds, setSavedVideoIds] = useState<string[]>([]);
  const [history, setHistory] = useState<LocalHistoryItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    Promise.all(Object.values(STORAGE_KEYS).map(key => AsyncStorage.getItem(key)))
      .then(values => {
        const [storedPlaylists, storedLiked, storedSaved, storedHistory] = values;
        try {
          if (storedPlaylists) setPlaylists(JSON.parse(storedPlaylists));
          if (storedLiked) setLikedVideoIds(JSON.parse(storedLiked));
          if (storedSaved) setSavedVideoIds(JSON.parse(storedSaved));
          if (storedHistory) setHistory(JSON.parse(storedHistory));
        } catch {
          // Corrupt local state is discarded rather than blocking app startup.
        }
      })
      .finally(() => setHydrated(true));
  }, []);

  useEffect(() => { if (hydrated) void AsyncStorage.setItem(STORAGE_KEYS.playlists, JSON.stringify(playlists)); }, [playlists, hydrated]);
  useEffect(() => { if (hydrated) void AsyncStorage.setItem(STORAGE_KEYS.liked, JSON.stringify(likedVideoIds)); }, [likedVideoIds, hydrated]);
  useEffect(() => { if (hydrated) void AsyncStorage.setItem(STORAGE_KEYS.saved, JSON.stringify(savedVideoIds)); }, [savedVideoIds, hydrated]);
  useEffect(() => { if (hydrated) void AsyncStorage.setItem(STORAGE_KEYS.history, JSON.stringify(history)); }, [history, hydrated]);

  const toggleLike = (videoId: string) =>
    setLikedVideoIds(prev =>
      prev.includes(videoId) ? prev.filter(id => id !== videoId) : [...prev, videoId]
    );

  const toggleSave = (videoId: string) =>
    setSavedVideoIds(prev =>
      prev.includes(videoId) ? prev.filter(id => id !== videoId) : [...prev, videoId]
    );

  const recordHistory = useCallback((videoId: string, video: HistoryVideo, progress = 0) => {
    setHistory(prev => [
      { videoId, ...video, progress, lastWatchedAt: Date.now() },
      ...prev.filter(item => item.videoId !== videoId),
    ].slice(0, 100));
  }, []);

  const createPlaylist = useCallback((name: string) => {
    const normalized = name.trim();
    if (!normalized) return;
    setPlaylists(previous => [
      { id: `local-${Date.now()}`, name: normalized, count: 0, isPrivate: true },
      ...previous,
    ]);
  }, []);

  return (
    <AppContext.Provider value={{ playlists, likedVideoIds, savedVideoIds, history, toggleLike, toggleSave, recordHistory, createPlaylist }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within AppProvider');
  return ctx;
}

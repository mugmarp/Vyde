import React, { createContext, useContext, useState } from 'react';
import { DownloadItem, Playlist, MOCK_DOWNLOADS, MOCK_PLAYLISTS } from '@/data/mockData';

interface AppContextType {
  downloads: DownloadItem[];
  playlists: Playlist[];
  likedVideoIds: string[];
  savedVideoIds: string[];
  toggleLike: (videoId: string) => void;
  toggleSave: (videoId: string) => void;
  removeDownload: (videoId: string) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [downloads, setDownloads] = useState<DownloadItem[]>(MOCK_DOWNLOADS);
  const [playlists] = useState<Playlist[]>(MOCK_PLAYLISTS);
  const [likedVideoIds, setLikedVideoIds] = useState<string[]>(['v5', 'v1']);
  const [savedVideoIds, setSavedVideoIds] = useState<string[]>(['v3']);

  const toggleLike = (videoId: string) =>
    setLikedVideoIds(prev =>
      prev.includes(videoId) ? prev.filter(id => id !== videoId) : [...prev, videoId]
    );

  const toggleSave = (videoId: string) =>
    setSavedVideoIds(prev =>
      prev.includes(videoId) ? prev.filter(id => id !== videoId) : [...prev, videoId]
    );

  const removeDownload = (videoId: string) =>
    setDownloads(prev => prev.filter(d => d.videoId !== videoId));

  return (
    <AppContext.Provider value={{ downloads, playlists, likedVideoIds, savedVideoIds, toggleLike, toggleSave, removeDownload }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within AppProvider');
  return ctx;
}

/**
 * Vyde Local SQLite Database Service
 *
 * Implements a relational local storage engine for:
 *   - Watch history (with progress and timestamps)
 *   - Liked videos
 *   - Saved videos
 *   - Playlists & playlist video items
 *   - Local channel subscriptions
 *
 * Provides automatic migration from legacy AsyncStorage data on initial setup.
 * On web platforms where native SQLite is unavailable, falls back gracefully.
 */

import { Platform } from 'react-native';
import { openLocalDatabase } from './sqlite';
import { migrateLocalDatabase } from './migrations';

// ─── Data Types ───────────────────────────────────────────────────────────────

export interface DbHistoryItem {
  videoId: string;
  title: string;
  channel: string;
  thumbnail: string;
  progress: number;
  lastWatchedAt: number;
}

export interface DbVideoItem {
  videoId: string;
  title: string;
  channel: string;
  thumbnail: string;
  savedAt: number;
}

export interface DbPlaylist {
  id: string;
  name: string;
  isPrivate: boolean;
  createdAt: number;
  videoIds: string[];
}

export interface DbSubscription {
  channelId: string;
  name: string;
  thumbnail: string;
  subscribedAt: number;
}

// ─── Database Instance Management ─────────────────────────────────────────────

type SQLiteDb = any;
let databaseReady: Promise<SQLiteDb | null> | null = null;

/**
 * Initializes the SQLite database, creates required tables and indexes,
 * and migrates legacy AsyncStorage state if needed.
 */
export async function getDatabase(): Promise<SQLiteDb | null> {
  if (Platform.OS === 'web') {
    return null; // Web platform uses AsyncStorage bridge fallback
  }

  if (!databaseReady) {
    databaseReady = initializeDatabase().then(db => {
      // Failed initialization is retryable; no caller receives a half-ready DB.
      if (!db) databaseReady = null;
      return db;
    });
  }
  return databaseReady;
}

async function initializeDatabase(): Promise<SQLiteDb | null> {
  let dbInstance: SQLiteDb | null = null;
  try {
    dbInstance = await openLocalDatabase();

    await migrateLocalDatabase(dbInstance);

    return dbInstance;
  } catch (error) {
    console.warn('[SQLite] SQLite initialization failed:', error);
    try {
      await dbInstance?.closeAsync();
    } catch (closeError) {
      console.warn('[SQLite] Failed to close uninitialized database:', closeError);
    }
    return null;
  }
}

export class LocalStorageReadError extends Error {
  constructor(public readonly collection: string, public readonly originalError?: unknown) {
    super(`Local ${collection} could not be loaded.`);
    this.name = 'LocalStorageReadError';
  }
}

async function getReadDatabase(collection: string): Promise<SQLiteDb | null> {
  const db = await getDatabase();
  if (!db && Platform.OS !== 'web') throw new LocalStorageReadError(collection);
  return db;
}

export class LocalStorageWriteError extends Error {
  constructor(public readonly operation: string, public readonly originalError?: unknown) {
    super(`Local ${operation} could not be saved.`);
    this.name = 'LocalStorageWriteError';
  }
}

async function getWriteDatabase(operation: string): Promise<SQLiteDb | null> {
  const db = await getDatabase();
  if (!db && Platform.OS !== 'web') throw new LocalStorageWriteError(operation);
  return db;
}

// ─── History Operations ───────────────────────────────────────────────────────

export async function fetchHistory(): Promise<DbHistoryItem[]> {
  const db = await getReadDatabase('history');
  if (!db) return [];
  try {
    const rows = await db.getAllAsync(
      `SELECT videoId, title, channel, thumbnail, progress, lastWatchedAt FROM history ORDER BY lastWatchedAt DESC LIMIT 100`
    );
    return (rows as any[]).map(r => ({
      videoId: r.videoId,
      title: r.title,
      channel: r.channel || '',
      thumbnail: r.thumbnail || '',
      progress: typeof r.progress === 'number' ? r.progress : 0,
      lastWatchedAt: r.lastWatchedAt || 0,
    }));
  } catch (error) {
    throw new LocalStorageReadError('history', error);
  }
}

export async function upsertHistory(item: DbHistoryItem): Promise<void> {
  const db = await getWriteDatabase('upsertHistory');
  if (!db) return;
  try {
    await db.runAsync(
      `INSERT OR REPLACE INTO history (videoId, title, channel, thumbnail, progress, lastWatchedAt)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [item.videoId, item.title, item.channel, item.thumbnail, item.progress, item.lastWatchedAt]
    );
  } catch (err) {
    throw new LocalStorageWriteError('upsertHistory', err);
  }
}

export async function clearAllHistory(): Promise<void> {
  const db = await getWriteDatabase('clearAllHistory');
  if (!db) return;
  try {
    await db.runAsync(`DELETE FROM history`);
  } catch (err) {
    throw new LocalStorageWriteError('clearAllHistory', err);
  }
}

// ─── Likes Operations ─────────────────────────────────────────────────────────

export async function fetchLikedVideoIds(): Promise<string[]> {
  const db = await getReadDatabase('likes');
  if (!db) return [];
  try {
    const rows = await db.getAllAsync(`SELECT videoId FROM likes ORDER BY likedAt DESC`);
    return (rows as any[]).map(r => r.videoId);
  } catch (error) {
    throw new LocalStorageReadError('likes', error);
  }
}

export async function setVideoLiked(videoId: string, title = '', channel = '', thumbnail = '', liked: boolean): Promise<void> {
  const db = await getWriteDatabase('setVideoLiked');
  if (!db) return;
  try {
    if (liked) {
      await db.runAsync(
        `INSERT OR REPLACE INTO likes (videoId, title, channel, thumbnail, likedAt) VALUES (?, ?, ?, ?, ?)`,
        [videoId, title, channel, thumbnail, Date.now()]
      );
    } else {
      await db.runAsync(`DELETE FROM likes WHERE videoId = ?`, [videoId]);
    }
  } catch (err) {
    throw new LocalStorageWriteError('setVideoLiked', err);
  }
}

// ─── Saves Operations ─────────────────────────────────────────────────────────

export async function fetchSavedVideoIds(): Promise<string[]> {
  const db = await getReadDatabase('saves');
  if (!db) return [];
  try {
    const rows = await db.getAllAsync(`SELECT videoId FROM saves ORDER BY savedAt DESC`);
    return (rows as any[]).map(r => r.videoId);
  } catch (error) {
    throw new LocalStorageReadError('saves', error);
  }
}

export async function setVideoSaved(videoId: string, title = '', channel = '', thumbnail = '', saved: boolean): Promise<void> {
  const db = await getWriteDatabase('setVideoSaved');
  if (!db) return;
  try {
    if (saved) {
      await db.runAsync(
        `INSERT OR REPLACE INTO saves (videoId, title, channel, thumbnail, savedAt) VALUES (?, ?, ?, ?, ?)`,
        [videoId, title, channel, thumbnail, Date.now()]
      );
    } else {
      await db.runAsync(`DELETE FROM saves WHERE videoId = ?`, [videoId]);
    }
  } catch (err) {
    throw new LocalStorageWriteError('setVideoSaved', err);
  }
}

// ─── Playlists Operations ─────────────────────────────────────────────────────

export async function fetchAllPlaylists(): Promise<DbPlaylist[]> {
  const db = await getReadDatabase('playlists');
  if (!db) return [];
  try {
    const playlists = await db.getAllAsync(`SELECT id, name, isPrivate, createdAt FROM playlists ORDER BY createdAt ASC`) as any[];
    const items = await db.getAllAsync(`SELECT playlistId, videoId FROM playlist_items ORDER BY position ASC`) as any[];

    const videoMap = new Map<string, string[]>();
    for (const item of items) {
      if (!videoMap.has(item.playlistId)) videoMap.set(item.playlistId, []);
      videoMap.get(item.playlistId)!.push(item.videoId);
    }

    return playlists.map(pl => ({
      id: pl.id,
      name: pl.name,
      isPrivate: pl.isPrivate === 1,
      createdAt: pl.createdAt,
      videoIds: videoMap.get(pl.id) || [],
    }));
  } catch (error) {
    throw new LocalStorageReadError('playlists', error);
  }
}

export async function createNewPlaylist(id: string, name: string, isPrivate = true): Promise<void> {
  const db = await getWriteDatabase('createNewPlaylist');
  if (!db) return;
  try {
    await db.runAsync(
      `INSERT INTO playlists (id, name, isPrivate, createdAt) VALUES (?, ?, ?, ?)`,
      [id, name, isPrivate ? 1 : 0, Date.now()]
    );
  } catch (err) {
    throw new LocalStorageWriteError('createNewPlaylist', err);
  }
}

export async function removePlaylist(id: string): Promise<void> {
  const db = await getWriteDatabase('removePlaylist');
  if (!db) return;
  try {
    // Foreign-key cascade makes deletion one atomic SQL statement.
    await db.runAsync(`DELETE FROM playlists WHERE id = ?`, [id]);
  } catch (err) {
    throw new LocalStorageWriteError('removePlaylist', err);
  }
}

export async function addVideoToPlaylistDb(playlistId: string, videoId: string): Promise<void> {
  const db = await getWriteDatabase('addVideoToPlaylistDb');
  if (!db) return;
  try {
    await db.runAsync(
      `INSERT OR IGNORE INTO playlist_items (playlistId, videoId, position) VALUES (?, ?, ?)`,
      [playlistId, videoId, Date.now()]
    );
  } catch (err) {
    throw new LocalStorageWriteError('addVideoToPlaylistDb', err);
  }
}

export async function removeVideoFromPlaylistDb(playlistId: string, videoId: string): Promise<void> {
  const db = await getWriteDatabase('removeVideoFromPlaylistDb');
  if (!db) return;
  try {
    await db.runAsync(
      `DELETE FROM playlist_items WHERE playlistId = ? AND videoId = ?`,
      [playlistId, videoId]
    );
  } catch (err) {
    throw new LocalStorageWriteError('removeVideoFromPlaylistDb', err);
  }
}

// ─── Subscriptions Operations ─────────────────────────────────────────────────

export async function fetchAllSubscriptions(): Promise<DbSubscription[]> {
  const db = await getReadDatabase('subscriptions');
  if (!db) return [];
  try {
    const rows = await db.getAllAsync(`SELECT channelId, name, thumbnail, subscribedAt FROM subscriptions ORDER BY subscribedAt DESC`);
    return (rows as any[]).map(r => ({
      channelId: r.channelId,
      name: r.name,
      thumbnail: r.thumbnail || '',
      subscribedAt: r.subscribedAt,
    }));
  } catch (error) {
    throw new LocalStorageReadError('subscriptions', error);
  }
}

export async function setSubscription(channelId: string, name: string, thumbnail = '', subscribed: boolean): Promise<void> {
  const db = await getWriteDatabase('setSubscription');
  if (!db) return;
  try {
    if (subscribed) {
      await db.runAsync(
        `INSERT OR REPLACE INTO subscriptions (channelId, name, thumbnail, subscribedAt) VALUES (?, ?, ?, ?)`,
        [channelId, name, thumbnail, Date.now()]
      );
    } else {
      await db.runAsync(`DELETE FROM subscriptions WHERE channelId = ?`, [channelId]);
    }
  } catch (err) {
    throw new LocalStorageWriteError('setSubscription', err);
  }
}

// ─── Reset All Data ───────────────────────────────────────────────────────────

export async function resetAllLocalData(): Promise<void> {
  const db = await getWriteDatabase('resetAllLocalData');
  if (!db) return;
  try {
    await db.withExclusiveTransactionAsync(async (transaction: SQLiteDb) => {
      await transaction.execAsync(`
      DELETE FROM history;
      DELETE FROM likes;
      DELETE FROM saves;
      DELETE FROM playlist_items;
      DELETE FROM playlists;
      DELETE FROM subscriptions;
      `);
    });
  } catch (err) {
    throw new LocalStorageWriteError('resetAllLocalData', err);
  }
}

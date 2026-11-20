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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { openLocalDatabase } from './sqlite';

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

    // Run schema creation in WAL mode for concurrent read/write performance
    await dbInstance.execAsync(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;

      CREATE TABLE IF NOT EXISTS history (
        videoId TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        channel TEXT DEFAULT '',
        thumbnail TEXT DEFAULT '',
        progress REAL DEFAULT 0,
        lastWatchedAt INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_history_lastWatchedAt ON history (lastWatchedAt DESC);

      CREATE TABLE IF NOT EXISTS likes (
        videoId TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        channel TEXT DEFAULT '',
        thumbnail TEXT DEFAULT '',
        likedAt INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS saves (
        videoId TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        channel TEXT DEFAULT '',
        thumbnail TEXT DEFAULT '',
        savedAt INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS playlists (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        isPrivate INTEGER DEFAULT 1,
        createdAt INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS playlist_items (
        playlistId TEXT NOT NULL,
        videoId TEXT NOT NULL,
        position INTEGER DEFAULT 0,
        PRIMARY KEY (playlistId, videoId),
        FOREIGN KEY (playlistId) REFERENCES playlists(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS subscriptions (
        channelId TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        thumbnail TEXT DEFAULT '',
        subscribedAt INTEGER NOT NULL
      );
    `);

    await migrateFromAsyncStorage(dbInstance);

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

/**
 * Migrates data from legacy AsyncStorage keys to SQLite on first initialization.
 */
async function migrateFromAsyncStorage(db: SQLiteDb): Promise<void> {
  try {
    const migratedKey = 'vyde_sqlite_migrated_v1';
    const hasMigrated = await AsyncStorage.getItem(migratedKey);
    if (hasMigrated === 'true') return;

    // Migrate history
    const storedHistory = await AsyncStorage.getItem('vyde_local_history_v1');
    if (storedHistory) {
      const items = JSON.parse(storedHistory);
      if (Array.isArray(items)) {
        for (const item of items) {
          if (item?.videoId && item?.title) {
            await db.runAsync(
              `INSERT OR REPLACE INTO history (videoId, title, channel, thumbnail, progress, lastWatchedAt)
               VALUES (?, ?, ?, ?, ?, ?)`,
              [item.videoId, item.title, item.channel || '', item.thumbnail || '', item.progress || 0, item.lastWatchedAt || Date.now()]
            );
          }
        }
      }
    }

    // Migrate likes
    const storedLikes = await AsyncStorage.getItem('vyde_local_liked_v1');
    if (storedLikes) {
      const ids = JSON.parse(storedLikes);
      if (Array.isArray(ids)) {
        for (const id of ids) {
          if (typeof id === 'string') {
            await db.runAsync(
              `INSERT OR IGNORE INTO likes (videoId, title, channel, thumbnail, likedAt)
               VALUES (?, ?, '', '', ?)`,
              [id, 'Liked Video', Date.now()]
            );
          }
        }
      }
    }

    // Migrate saves
    const storedSaves = await AsyncStorage.getItem('vyde_local_saved_v1');
    if (storedSaves) {
      const ids = JSON.parse(storedSaves);
      if (Array.isArray(ids)) {
        for (const id of ids) {
          if (typeof id === 'string') {
            await db.runAsync(
              `INSERT OR IGNORE INTO saves (videoId, title, channel, thumbnail, savedAt)
               VALUES (?, ?, '', '', ?)`,
              [id, 'Saved Video', Date.now()]
            );
          }
        }
      }
    }

    // Migrate playlists
    const storedPlaylists = await AsyncStorage.getItem('vyde_local_playlists_v1');
    if (storedPlaylists) {
      const playlists = JSON.parse(storedPlaylists);
      if (Array.isArray(playlists)) {
        for (const pl of playlists) {
          if (pl?.id && pl?.name) {
            await db.runAsync(
              `INSERT OR REPLACE INTO playlists (id, name, isPrivate, createdAt) VALUES (?, ?, ?, ?)`,
              [pl.id, pl.name, pl.isPrivate !== false ? 1 : 0, Date.now()]
            );
            if (Array.isArray(pl.videoIds)) {
              for (let i = 0; i < pl.videoIds.length; i++) {
                await db.runAsync(
                  `INSERT OR IGNORE INTO playlist_items (playlistId, videoId, position) VALUES (?, ?, ?)`,
                  [pl.id, pl.videoIds[i], i]
                );
              }
            }
          }
        }
      }
    }

    await AsyncStorage.setItem(migratedKey, 'true');
    console.log('[SQLite] Legacy AsyncStorage data migrated successfully to SQLite.');
  } catch (err) {
    // A migration failure must not publish readiness or overwrite legacy data.
    throw err;
  }
}

// ─── History Operations ───────────────────────────────────────────────────────

export async function fetchHistory(): Promise<DbHistoryItem[]> {
  const db = await getDatabase();
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
  } catch {
    return [];
  }
}

export async function upsertHistory(item: DbHistoryItem): Promise<void> {
  const db = await getDatabase();
  if (!db) return;
  try {
    await db.runAsync(
      `INSERT OR REPLACE INTO history (videoId, title, channel, thumbnail, progress, lastWatchedAt)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [item.videoId, item.title, item.channel, item.thumbnail, item.progress, item.lastWatchedAt]
    );
  } catch (err) {
    console.warn('[SQLite] upsertHistory failed:', err);
  }
}

export async function clearAllHistory(): Promise<void> {
  const db = await getDatabase();
  if (!db) return;
  try {
    await db.runAsync(`DELETE FROM history`);
  } catch (err) {
    console.warn('[SQLite] clearAllHistory failed:', err);
  }
}

// ─── Likes Operations ─────────────────────────────────────────────────────────

export async function fetchLikedVideoIds(): Promise<string[]> {
  const db = await getDatabase();
  if (!db) return [];
  try {
    const rows = await db.getAllAsync(`SELECT videoId FROM likes ORDER BY likedAt DESC`);
    return (rows as any[]).map(r => r.videoId);
  } catch {
    return [];
  }
}

export async function setVideoLiked(videoId: string, title = '', channel = '', thumbnail = '', liked: boolean): Promise<void> {
  const db = await getDatabase();
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
    console.warn('[SQLite] setVideoLiked failed:', err);
  }
}

// ─── Saves Operations ─────────────────────────────────────────────────────────

export async function fetchSavedVideoIds(): Promise<string[]> {
  const db = await getDatabase();
  if (!db) return [];
  try {
    const rows = await db.getAllAsync(`SELECT videoId FROM saves ORDER BY savedAt DESC`);
    return (rows as any[]).map(r => r.videoId);
  } catch {
    return [];
  }
}

export async function setVideoSaved(videoId: string, title = '', channel = '', thumbnail = '', saved: boolean): Promise<void> {
  const db = await getDatabase();
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
    console.warn('[SQLite] setVideoSaved failed:', err);
  }
}

// ─── Playlists Operations ─────────────────────────────────────────────────────

export async function fetchAllPlaylists(): Promise<DbPlaylist[]> {
  const db = await getDatabase();
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
  } catch {
    return [];
  }
}

export async function createNewPlaylist(id: string, name: string, isPrivate = true): Promise<void> {
  const db = await getDatabase();
  if (!db) return;
  try {
    await db.runAsync(
      `INSERT INTO playlists (id, name, isPrivate, createdAt) VALUES (?, ?, ?, ?)`,
      [id, name, isPrivate ? 1 : 0, Date.now()]
    );
  } catch (err) {
    console.warn('[SQLite] createNewPlaylist failed:', err);
  }
}

export async function removePlaylist(id: string): Promise<void> {
  const db = await getDatabase();
  if (!db) return;
  try {
    await db.runAsync(`DELETE FROM playlist_items WHERE playlistId = ?`, [id]);
    await db.runAsync(`DELETE FROM playlists WHERE id = ?`, [id]);
  } catch (err) {
    console.warn('[SQLite] removePlaylist failed:', err);
  }
}

export async function addVideoToPlaylistDb(playlistId: string, videoId: string): Promise<void> {
  const db = await getDatabase();
  if (!db) return;
  try {
    await db.runAsync(
      `INSERT OR IGNORE INTO playlist_items (playlistId, videoId, position) VALUES (?, ?, ?)`,
      [playlistId, videoId, Date.now()]
    );
  } catch (err) {
    console.warn('[SQLite] addVideoToPlaylistDb failed:', err);
  }
}

export async function removeVideoFromPlaylistDb(playlistId: string, videoId: string): Promise<void> {
  const db = await getDatabase();
  if (!db) return;
  try {
    await db.runAsync(
      `DELETE FROM playlist_items WHERE playlistId = ? AND videoId = ?`,
      [playlistId, videoId]
    );
  } catch (err) {
    console.warn('[SQLite] removeVideoFromPlaylistDb failed:', err);
  }
}

// ─── Subscriptions Operations ─────────────────────────────────────────────────

export async function fetchAllSubscriptions(): Promise<DbSubscription[]> {
  const db = await getDatabase();
  if (!db) return [];
  try {
    const rows = await db.getAllAsync(`SELECT channelId, name, thumbnail, subscribedAt FROM subscriptions ORDER BY subscribedAt DESC`);
    return (rows as any[]).map(r => ({
      channelId: r.channelId,
      name: r.name,
      thumbnail: r.thumbnail || '',
      subscribedAt: r.subscribedAt,
    }));
  } catch {
    return [];
  }
}

export async function setSubscription(channelId: string, name: string, thumbnail = '', subscribed: boolean): Promise<void> {
  const db = await getDatabase();
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
    console.warn('[SQLite] setSubscription failed:', err);
  }
}

// ─── Reset All Data ───────────────────────────────────────────────────────────

export async function resetAllLocalData(): Promise<void> {
  const db = await getDatabase();
  if (!db) return;
  try {
    await db.execAsync(`
      DELETE FROM history;
      DELETE FROM likes;
      DELETE FROM saves;
      DELETE FROM playlist_items;
      DELETE FROM playlists;
      DELETE FROM subscriptions;
    `);
  } catch (err) {
    console.warn('[SQLite] resetAllLocalData failed:', err);
  }
}

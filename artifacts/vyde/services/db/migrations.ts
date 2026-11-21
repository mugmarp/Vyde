import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SQLiteDatabase } from 'expo-sqlite';

type MigrationDatabase = Pick<SQLiteDatabase, 'execAsync' | 'getFirstAsync' | 'runAsync' | 'withTransactionAsync'>;

export const LOCAL_SCHEMA_VERSION = 1;
const LEGACY_MIGRATION = 'legacy_async_storage_v1';
const LEGACY_FLAG = 'vyde_sqlite_migrated_v1';

const SCHEMA_V1 = `
  CREATE TABLE IF NOT EXISTS history (
    videoId TEXT PRIMARY KEY, title TEXT NOT NULL, channel TEXT DEFAULT '',
    thumbnail TEXT DEFAULT '', progress REAL DEFAULT 0, lastWatchedAt INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_history_lastWatchedAt ON history (lastWatchedAt DESC);
  CREATE TABLE IF NOT EXISTS likes (
    videoId TEXT PRIMARY KEY, title TEXT NOT NULL, channel TEXT DEFAULT '',
    thumbnail TEXT DEFAULT '', likedAt INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS saves (
    videoId TEXT PRIMARY KEY, title TEXT NOT NULL, channel TEXT DEFAULT '',
    thumbnail TEXT DEFAULT '', savedAt INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS playlists (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, isPrivate INTEGER DEFAULT 1, createdAt INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS playlist_items (
    playlistId TEXT NOT NULL, videoId TEXT NOT NULL, position INTEGER DEFAULT 0,
    PRIMARY KEY (playlistId, videoId),
    FOREIGN KEY (playlistId) REFERENCES playlists(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS subscriptions (
    channelId TEXT PRIMARY KEY, name TEXT NOT NULL, thumbnail TEXT DEFAULT '', subscribedAt INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS _vyde_migrations (
    id TEXT PRIMARY KEY, appliedAt INTEGER NOT NULL
  );
`;

function readLegacyArray(raw: string | null, collection: string): unknown[] {
  if (raw === null) return [];
  const value: unknown = JSON.parse(raw);
  if (!Array.isArray(value)) throw new Error(`Legacy ${collection} must contain an array.`);
  return value;
}

const record = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
const text = (value: unknown, fallback = '') => typeof value === 'string' ? value : fallback;
const timestamp = (value: unknown, fallback: number) =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : fallback;

async function importLegacy(db: MigrationDatabase): Promise<void> {
  const keys = ['history', 'liked', 'saved', 'playlists'] as const;
  const raw = await Promise.all(keys.map(key => AsyncStorage.getItem(`vyde_local_${key}_v1`)));
  const [history, liked, saved, playlists] = raw.map((value, i) => readLegacyArray(value, keys[i]));
  const now = Date.now();

  for (const value of history) {
    const item = record(value);
    if (!item || !text(item.videoId) || !text(item.title)) continue;
    const progress = typeof item.progress === 'number' && Number.isFinite(item.progress)
      ? Math.max(0, Math.min(1, item.progress)) : 0;
    await db.runAsync(
      `INSERT OR IGNORE INTO history (videoId, title, channel, thumbnail, progress, lastWatchedAt)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [text(item.videoId), text(item.title), text(item.channel), text(item.thumbnail), progress, timestamp(item.lastWatchedAt, now)],
    );
  }

  for (const [items, table, dateColumn, fallback] of [
    [liked, 'likes', 'likedAt', 'Liked Video'],
    [saved, 'saves', 'savedAt', 'Saved Video'],
  ] as const) {
    for (const id of items) {
      if (typeof id !== 'string' || !id) continue;
      await db.runAsync(
        `INSERT OR IGNORE INTO ${table} (videoId, title, channel, thumbnail, ${dateColumn}) VALUES (?, ?, '', '', ?)`,
        [id, fallback, now],
      );
    }
  }

  for (const value of playlists) {
    const playlist = record(value);
    if (!playlist || !text(playlist.id) || !text(playlist.name)) continue;
    // Preserve newer SQLite metadata and its item ordering if a legacy snapshot
    // describes an ID already present in the database.
    const exists = await db.getFirstAsync<{ id: string }>('SELECT id FROM playlists WHERE id = ?', [text(playlist.id)]);
    if (exists) continue;
    await db.runAsync('INSERT INTO playlists (id, name, isPrivate, createdAt) VALUES (?, ?, ?, ?)',
      [text(playlist.id), text(playlist.name), playlist.isPrivate !== false ? 1 : 0, timestamp(playlist.createdAt, now)]);
    if (!Array.isArray(playlist.videoIds)) continue;
    for (const [position, videoId] of playlist.videoIds.entries()) {
      if (typeof videoId !== 'string' || !videoId) continue;
      await db.runAsync('INSERT OR IGNORE INTO playlist_items (playlistId, videoId, position) VALUES (?, ?, ?)',
        [text(playlist.id), videoId, position]);
    }
  }
}

/** Called only before the shared initialization promise exposes this handle. */
export async function migrateLocalDatabase(db: MigrationDatabase): Promise<void> {
  // These PRAGMAs apply to this connection and must precede BEGIN.
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  let imported = false;
  // No public repository can join this connection's transaction: getDatabase()
  // keeps all callers waiting until schema and import commit together.
  await db.withTransactionAsync(async () => {
    const version = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
    if ((version?.user_version ?? 0) > LOCAL_SCHEMA_VERSION) {
      throw new Error('This library was created by a newer Vyde version.');
    }
    await db.execAsync(SCHEMA_V1);
    const completed = await db.getFirstAsync<{ id: string }>('SELECT id FROM _vyde_migrations WHERE id = ?', [LEGACY_MIGRATION]);
    if (!completed) {
      // Respect the old application's successful-import flag during upgrade.
      if (await AsyncStorage.getItem(LEGACY_FLAG) !== 'true') await importLegacy(db);
      await db.runAsync('INSERT INTO _vyde_migrations (id, appliedAt) VALUES (?, ?)', [LEGACY_MIGRATION, Date.now()]);
      imported = true;
    }
    await db.execAsync(`PRAGMA user_version = ${LOCAL_SCHEMA_VERSION};`);
  });
  if (imported) {
    // Compatibility only. SQLite's committed journal is authoritative; a failed
    // AsyncStorage marker write must not re-run or roll back a committed import.
    try { await AsyncStorage.setItem(LEGACY_FLAG, 'true'); }
    catch (error) { console.warn('[SQLite] Legacy compatibility marker could not be saved:', error); }
  }
}

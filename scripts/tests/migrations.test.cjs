const { test } = require('node:test');
const assert = require('node:assert/strict');
const { DatabaseSync } = require('node:sqlite');
const { createLoader } = require('./helpers/load-typescript.cjs');

function migrationFixture(entries = {}) {
  const sqlite = new DatabaseSync(':memory:');
  const values = new Map(Object.entries(entries)), reads = [], writes = [];
  let failStatement = () => false, failMarkerWrite = false;
  const db = {
    execAsync: async sql => sqlite.exec(sql),
    getFirstAsync: async (sql, params = []) => sqlite.prepare(sql).get(...params) ?? null,
    runAsync: async (sql, params = []) => {
      if (failStatement(sql)) throw new Error('injected write interruption');
      return sqlite.prepare(sql).run(...params);
    },
    withTransactionAsync: async task => {
      sqlite.exec('BEGIN');
      try { await task(); sqlite.exec('COMMIT'); }
      catch (error) { sqlite.exec('ROLLBACK'); throw error; }
    },
  };
  const migration = createLoader({
    '@react-native-async-storage/async-storage': {
      getItem: async key => { reads.push(key); return values.get(key) ?? null; },
      setItem: async (key, value) => {
        if (failMarkerWrite) throw new Error('marker unavailable');
        writes.push(key); values.set(key, value);
      },
    },
  })('services/db/migrations.ts');
  return {
    sqlite, db, values, reads, writes,
    migrate: () => migration.migrateLocalDatabase(db),
    failOn: predicate => { failStatement = predicate; },
    failCompatibilityMarker: () => { failMarkerWrite = true; },
  };
}

const legacyData = {
  vyde_local_history_v1: JSON.stringify([{ videoId: 'history1234', title: 'History', progress: 0.6, lastWatchedAt: 10 }]),
  vyde_local_liked_v1: JSON.stringify(['liked12345']),
  vyde_local_saved_v1: JSON.stringify(['saved12345']),
  vyde_local_playlists_v1: JSON.stringify([{ id: 'playlist-1', name: 'Collection', videoIds: ['history1234', 'liked12345'] }]),
};

test('legacy records, ordering, schema version and migration journal commit together', async t => {
  const f = migrationFixture(legacyData); t.after(() => f.sqlite.close());
  await f.migrate();
  assert.equal(f.sqlite.prepare('PRAGMA user_version').get().user_version, 1);
  assert.equal(f.sqlite.prepare('SELECT count(*) AS n FROM _vyde_migrations').get().n, 1);
  assert.equal(f.sqlite.prepare('SELECT progress FROM history').get().progress, 0.6);
  assert.deepEqual(f.sqlite.prepare('SELECT videoId FROM playlist_items ORDER BY position').all().map(x => x.videoId), ['history1234', 'liked12345']);
  assert.equal(f.sqlite.prepare('SELECT count(*) AS n FROM likes').get().n, 1);
  assert.equal(f.sqlite.prepare('SELECT count(*) AS n FROM saves').get().n, 1);
  assert.equal(f.sqlite.prepare('PRAGMA foreign_keys').get().foreign_keys, 1);
  assert.equal(f.values.get('vyde_sqlite_migrated_v1'), 'true');
  assert.equal(f.values.get('vyde_local_history_v1'), legacyData.vyde_local_history_v1);
});

test('a write interruption rolls back schema/data/journal and allows a clean retry', async t => {
  const f = migrationFixture(legacyData); t.after(() => f.sqlite.close());
  f.failOn(sql => sql.includes('INSERT OR IGNORE INTO saves'));
  await assert.rejects(f.migrate(), /interruption/);
  assert.equal(f.sqlite.prepare('PRAGMA user_version').get().user_version, 0);
  assert.equal(f.sqlite.prepare("SELECT count(*) AS n FROM sqlite_master WHERE type='table'").get().n, 0);
  assert.equal(f.values.has('vyde_sqlite_migrated_v1'), false);
  f.failOn(() => false);
  await f.migrate();
  assert.equal(f.sqlite.prepare('SELECT count(*) AS n FROM history').get().n, 1);
  assert.equal(f.sqlite.prepare('SELECT count(*) AS n FROM playlist_items').get().n, 2);
});

test('failed compatibility-marker write cannot cause a committed import to run again', async t => {
  const f = migrationFixture(legacyData); t.after(() => f.sqlite.close());
  f.failCompatibilityMarker();
  await f.migrate();
  f.sqlite.prepare("UPDATE history SET title = 'Newer local edit'").run();
  f.reads.length = 0;
  await f.migrate();
  assert.equal(f.reads.length, 0);
  assert.equal(f.sqlite.prepare('SELECT title FROM history').get().title, 'Newer local edit');
  assert.equal(f.sqlite.prepare('SELECT count(*) AS n FROM _vyde_migrations').get().n, 1);
});

test('legacy import merges without replacing existing SQLite history or playlist contents', async t => {
  const f = migrationFixture(); t.after(() => f.sqlite.close());
  await f.migrate();
  f.sqlite.exec("DELETE FROM _vyde_migrations; INSERT INTO history VALUES ('history1234','New title','','',0.9,99); INSERT INTO playlists VALUES ('playlist-1','New collection',1,99); INSERT INTO playlist_items VALUES ('playlist-1','newitem1234',0)");
  f.values.clear();
  for (const [key, value] of Object.entries(legacyData)) f.values.set(key, value);
  await f.migrate();
  assert.equal(f.sqlite.prepare('SELECT title FROM history').get().title, 'New title');
  assert.equal(f.sqlite.prepare('SELECT name FROM playlists').get().name, 'New collection');
  assert.deepEqual(f.sqlite.prepare('SELECT videoId FROM playlist_items').all().map(x => x.videoId), ['newitem1234']);
});

test('upgrading an already migrated unversioned database honors the old flag', async t => {
  const f = migrationFixture({ ...legacyData, vyde_sqlite_migrated_v1: 'true' }); t.after(() => f.sqlite.close());
  await f.migrate();
  assert.equal(f.sqlite.prepare('SELECT count(*) AS n FROM history').get().n, 0);
  assert.equal(f.sqlite.prepare('SELECT count(*) AS n FROM _vyde_migrations').get().n, 1);
  assert.deepEqual(f.reads, ['vyde_sqlite_migrated_v1']);
});

test('invalid collection JSON preserves input and rolls back migration readiness', async t => {
  const f = migrationFixture({ ...legacyData, vyde_local_playlists_v1: '{broken' }); t.after(() => f.sqlite.close());
  await assert.rejects(f.migrate());
  assert.equal(f.sqlite.prepare('PRAGMA user_version').get().user_version, 0);
  assert.equal(f.values.get('vyde_local_playlists_v1'), '{broken');
  assert.equal(f.writes.length, 0);
});

test('a newer database version is preserved rather than silently downgraded', async t => {
  const f = migrationFixture(); t.after(() => f.sqlite.close());
  f.sqlite.exec('PRAGMA user_version = 99');
  await assert.rejects(f.migrate(), /newer Vyde version/);
  assert.equal(f.sqlite.prepare('PRAGMA user_version').get().user_version, 99);
  assert.equal(f.reads.length, 0);
});

test('deleting a playlist cascades to its entries under enabled foreign keys', async t => {
  const f = migrationFixture(legacyData); t.after(() => f.sqlite.close());
  await f.migrate();
  f.sqlite.prepare('DELETE FROM playlists WHERE id = ?').run('playlist-1');
  assert.equal(f.sqlite.prepare('SELECT count(*) AS n FROM playlist_items').get().n, 0);
});

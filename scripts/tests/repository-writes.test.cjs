const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createLoader } = require('./helpers/load-typescript.cjs');

const mutations = [
  ['upsertHistory', [{ videoId: 'abcdef', title: 'Title', channel: '', thumbnail: '', progress: 0, lastWatchedAt: 1 }]],
  ['clearAllHistory', []], ['setVideoLiked', ['abcdef', '', '', '', true]],
  ['setVideoSaved', ['abcdef', '', '', '', true]], ['createNewPlaylist', ['p1', 'Music']],
  ['removePlaylist', ['p1']], ['addVideoToPlaylistDb', ['p1', 'abcdef']],
  ['removeVideoFromPlaylistDb', ['p1', 'abcdef']], ['setSubscription', ['channel', 'Channel', '', true]],
  ['resetAllLocalData', []],
  ['setVideoLiked', ['abcdef', '', '', '', false]],
  ['setVideoSaved', ['abcdef', '', '', '', false]],
  ['setSubscription', ['channel', 'Channel', '', false]],
];

function fixture(failOpen = false) {
  const cause = new Error('disk full');
  const db = {
    runAsync: async () => { throw cause; }, execAsync: async () => { throw cause; },
    withExclusiveTransactionAsync: async task => task(db), closeAsync: async () => {},
  };
  const service = createLoader({
    'react-native': { Platform: { OS: 'android' } },
    './sqlite': { openLocalDatabase: async () => { if (failOpen) throw cause; return db; } },
    './migrations': { migrateLocalDatabase: async () => {} },
  })('services/db/database.ts');
  return { service, cause };
}

for (const [method, args] of mutations) {
  test(`${method} reports a failed native write to its caller`, async () => {
    const f = fixture();
    await assert.rejects(f.service[method](...args), error => {
      assert.equal(error.name, 'LocalStorageWriteError');
      assert.equal(error.originalError, f.cause);
      return true;
    });
  });
}

test('failed database initialization cannot report a successful native write', async () => {
  const f = fixture(true);
  await assert.rejects(f.service.setVideoSaved('abcdef', '', '', '', true), error => error.name === 'LocalStorageWriteError');
});

const { DatabaseSync } = require('node:sqlite');
function sqliteFixture() {
  const sqlite = new DatabaseSync(':memory:');
  const db = {
    execAsync: async sql => sqlite.exec(sql),
    getFirstAsync: async (sql, params = []) => sqlite.prepare(sql).get(...params) ?? null,
    getAllAsync: async (sql, params = []) => sqlite.prepare(sql).all(...params),
    runAsync: async (sql, params = []) => sqlite.prepare(sql).run(...params),
    withTransactionAsync: async task => transaction(task),
    withExclusiveTransactionAsync: async task => transaction(() => task(db)),
  };
  async function transaction(task) {
    sqlite.exec('BEGIN');
    try { await task(); sqlite.exec('COMMIT'); }
    catch (error) { sqlite.exec('ROLLBACK'); throw error; }
  }
  const service = createLoader({
    'react-native': { Platform: { OS: 'android' } },
    './sqlite': { openLocalDatabase: async () => db },
    '@react-native-async-storage/async-storage': { getItem: async () => null, setItem: async () => {} },
  })('services/db/database.ts');
  return { sqlite, service };
}

test('interrupted reset rolls back earlier deletions and can be retried', async t => {
  const f = sqliteFixture(); t.after(() => f.sqlite.close());
  await f.service.getDatabase();
  await f.service.upsertHistory({ videoId: 'abcdef', title: 'History', channel: '', thumbnail: '', progress: 0, lastWatchedAt: 1 });
  await f.service.setVideoLiked('abcdef', '', '', '', true);
  f.sqlite.exec("CREATE TRIGGER block_reset BEFORE DELETE ON likes BEGIN SELECT RAISE(ABORT, 'injected reset failure'); END;");
  await assert.rejects(f.service.resetAllLocalData(), error => error.name === 'LocalStorageWriteError');
  assert.equal((await f.service.fetchHistory()).length, 1);
  assert.equal((await f.service.fetchLikedVideoIds()).length, 1);
  f.sqlite.exec('DROP TRIGGER block_reset');
  await f.service.resetAllLocalData();
  assert.equal((await f.service.fetchHistory()).length, 0);
  assert.equal((await f.service.fetchLikedVideoIds()).length, 0);
  assert.equal(f.sqlite.prepare('PRAGMA user_version').get().user_version, 1);
  assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM _vyde_migrations').get().n, 1);
});

test('playlist deletion failure preserves membership; successful retry cascades atomically', async t => {
  const f = sqliteFixture(); t.after(() => f.sqlite.close());
  await f.service.createNewPlaylist('p1', 'Music');
  await f.service.addVideoToPlaylistDb('p1', 'abcdef');
  f.sqlite.exec("CREATE TRIGGER block_playlist_delete BEFORE DELETE ON playlists BEGIN SELECT RAISE(ABORT, 'injected deletion failure'); END;");
  await assert.rejects(f.service.removePlaylist('p1'), error => error.name === 'LocalStorageWriteError');
  assert.deepEqual(Array.from((await f.service.fetchAllPlaylists())[0].videoIds), ['abcdef']);
  f.sqlite.exec('DROP TRIGGER block_playlist_delete');
  await f.service.removePlaylist('p1');
  assert.equal((await f.service.fetchAllPlaylists()).length, 0);
  assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM playlist_items').get().n, 0);
});

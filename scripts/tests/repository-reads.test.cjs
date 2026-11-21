const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createLoader } = require('./helpers/load-typescript.cjs');

function repositoryFixture({ failQuery = true, failOpen = false } = {}) {
  const error = new Error('disk read failed');
  const db = {
    getAllAsync: async () => { if (failQuery) throw error; return []; },
    closeAsync: async () => {},
  };
  const service = createLoader({
    'react-native': { Platform: { OS: 'android' } },
    './sqlite': { openLocalDatabase: async () => { if (failOpen) throw error; return db; } },
    './migrations': { migrateLocalDatabase: async () => {} },
  })('services/db/database.ts');
  return { service, error };
}

for (const [method, collection] of [
  ['fetchHistory', 'history'], ['fetchLikedVideoIds', 'likes'], ['fetchSavedVideoIds', 'saves'],
  ['fetchAllPlaylists', 'playlists'], ['fetchAllSubscriptions', 'subscriptions'],
]) {
  test(`${collection} query failure is distinguished from an empty collection`, async () => {
    const f = repositoryFixture();
    await assert.rejects(f.service[method](), error => {
      assert.equal(error.name, 'LocalStorageReadError');
      assert.equal(error.collection, collection);
      assert.equal(error.originalError, f.error);
      return true;
    });
  });
}

test('genuinely empty native collections still load successfully', async () => {
  const f = repositoryFixture({ failQuery: false });
  for (const method of ['fetchHistory', 'fetchLikedVideoIds', 'fetchSavedVideoIds', 'fetchAllPlaylists', 'fetchAllSubscriptions']) {
    assert.equal((await f.service[method]()).length, 0);
  }
});

test('failed native initialization cannot be reported as an empty repository', async () => {
  const f = repositoryFixture({ failOpen: true });
  await assert.rejects(f.service.fetchHistory(), error => error.name === 'LocalStorageReadError');
});

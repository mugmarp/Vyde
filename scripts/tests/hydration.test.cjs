const { test } = require('node:test');
const assert = require('node:assert/strict');
const { providerFixture } = require('./helpers/provider-fixture.cjs');

test('failed hydration does not overwrite existing storage with empty state', async () => {
  const f = providerFixture({ failReads: true });
  await f.render();
  const context = await f.render();
  await f.render();
  assert.equal(context.isHydrated, true);
  assert.match(context.storageError, /could not be loaded/);
  assert.equal(f.writes.length, 0);
});

test('native database failure does not hydrate and persist an AsyncStorage fallback', async () => {
  const f = providerFixture({ database: null });
  await f.render();
  const context = await f.render();
  assert.match(context.storageError, /could not be loaded/);
  assert.equal(f.reads, 0);
  assert.equal(f.writes.length, 0);
});

test('successful hydration permits persistence', async () => {
  const f = providerFixture();
  await f.render();
  const context = await f.render();
  assert.equal(context.storageError, null);
  assert.equal(f.writes.length, 6);
});

test('a repository query failure cannot hydrate empty collections over stored data', async () => {
  const f = providerFixture({ databaseReadsFail: true });
  await f.render();
  const context = await f.render();
  assert.match(context.storageError, /could not be loaded/);
  assert.equal(f.writes.length, 0);
});

for (const [label, storedValues, platform, database] of [
  ['malformed download JSON', { vyde_local_downloads_v1: '{broken' }, 'android', {}],
  ['invalid catalog shape', { vyde_local_video_catalog_v1: '[]' }, 'android', {}],
  ['invalid web playlist shape', { vyde_local_playlists_v1: '{}' }, 'web', null],
  ['explicit null downloads', { vyde_local_downloads_v1: 'null' }, 'android', {}],
  ['empty raw downloads', { vyde_local_downloads_v1: '' }, 'android', {}],
  ['invalid download record', { vyde_local_downloads_v1: '[{}]' }, 'android', {}],
  ['invalid catalog record', { vyde_local_video_catalog_v1: '{"abcdef":{}}' }, 'android', {}],
  ['invalid saved ID', { vyde_local_saved_v1: '[123]' }, 'web', null],
  ['invalid playlist members', { vyde_local_playlists_v1: '[{"id":"p1","name":"Music","videoIds":{}}]' }, 'web', null],
]) {
  test(`${label} cannot be silently overwritten by empty hydration`, async () => {
    const f = providerFixture({ storedValues, platform, database });
    await f.render();
    const context = await f.render();
    assert.match(context.storageError ?? '', /could not be loaded/);
    assert.equal(f.writes.length, 0);
  });
}

test('valid web library data survives hydration and persistence', async () => {
  const catalog = { abcdef: { title: 'Example', channel: 'Channel', thumbnail: 'thumb' } };
  const playlists = [{ id: 'p1', name: 'Music', videoIds: ['abcdef'], isPrivate: false }];
  const f = providerFixture({
    platform: 'web', database: null,
    storedValues: {
      vyde_local_playlists_v1: JSON.stringify(playlists),
      vyde_local_liked_v1: '["abcdef"]',
      vyde_local_video_catalog_v1: JSON.stringify(catalog),
    },
  });
  await f.render();
  const context = await f.render();
  assert.equal(context.storageError, null);
  assert.deepEqual(JSON.parse(JSON.stringify(context.playlists)), playlists);
  assert.deepEqual(JSON.parse(JSON.stringify(context.videoCatalog)), catalog);
  assert.equal(f.writes.length, 6);
});

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { providerFixture } = require('./helpers/provider-fixture.cjs');
const { deferred, settle } = require('./helpers/load-typescript.cjs');
const plain = value => JSON.parse(JSON.stringify(value));
const initial = {
  likes: ['liked123'], saves: ['saved123'],
  history: [{ videoId: 'history1', title: 'History', progress: 0, lastWatchedAt: 1 }],
  playlists: [{ id: 'p1', name: 'Music', videoIds: ['abcdef'], isPrivate: true }],
  subscriptions: [{ channelId: 'channel1', name: 'Channel', thumbnail: '', subscribedAt: 1 }],
};
const snapshot = c => plain([c.likedVideoIds, c.savedVideoIds, c.history, c.playlists, c.subscriptions, c.videoCatalog]);

for (const [method, args] of [
  ['toggleLike', ['newlike1']], ['toggleSave', ['newsave1']],
  ['recordHistory', ['newhist1', { title: 'New', channel: '', thumbnail: '' }, 0.5]],
  ['createPlaylist', ['New']], ['addVideoToPlaylist', ['p1', 'newvid12']],
  ['removeVideoFromPlaylist', ['p1', 'abcdef']], ['deletePlaylist', ['p1']],
  ['toggleSubscription', ['newchan1', 'New channel']], ['clearHistory', []], ['clearLocalData', []],
]) {
  test(`failed ${method} leaves the committed native library unchanged`, async () => {
    const f = providerFixture({ databaseValues: initial, writeOperation: async () => { throw new Error('disk full'); } });
    await f.render();
    const c = await f.render();
    const before = snapshot(c);
    const result = await c[method](...args);
    await settle();
    const after = await f.render();
    assert.deepEqual(snapshot(after), before);
    assert.match(after.storageError, /could not be saved/);
    assert.equal(f.mutations.length, 1);
    if (method === 'createPlaylist') assert.equal(result, null);
    if (method === 'clearLocalData') assert.equal(f.deleted.length, 0);
  });
}

test('rapid toggles wait for persistence and execute in user order before another render', async () => {
  const firstWrite = deferred();
  let calls = 0;
  const f = providerFixture({ writeOperation: async () => { if (++calls === 1) await firstWrite.promise; } });
  await f.render();
  const c = await f.render();
  c.toggleLike('abcdef');
  c.toggleLike('abcdef');
  await settle();
  let after = await f.render();
  assert.equal(after.likedVideoIds.length, 0);
  assert.equal(f.mutations.length, 1);
  firstWrite.resolve();
  await settle();
  after = await f.render();
  assert.equal(after.likedVideoIds.length, 0);
  assert.deepEqual(f.mutations.map(call => call.at(-1)), [true, false]);
});

test('a failed mutation does not poison the queue or affect the next toggle intent', async () => {
  let calls = 0;
  const f = providerFixture({ writeOperation: async () => { if (++calls === 1) throw new Error('temporary failure'); } });
  await f.render();
  const c = await f.render();
  c.toggleSave('abcdef');
  c.toggleSave('abcdef');
  await settle();
  const after = await f.render();
  assert.deepEqual(plain(after.savedVideoIds), ['abcdef']);
  assert.deepEqual(f.mutations.map(call => call.at(-1)), [true, true]);
});

test('create then add queues the playlist insert before its membership insert', async () => {
  const f = providerFixture();
  await f.render();
  const c = await f.render();
  const id = await c.createPlaylist(' Music ');
  assert.equal(typeof id, 'string');
  c.addVideoToPlaylist(id, 'abcdef');
  await settle();
  const after = await f.render();
  assert.equal(after.playlists[0].name, 'Music');
  assert.deepEqual(plain(after.playlists[0].videoIds), ['abcdef']);
  assert.deepEqual(f.mutations.map(call => call[0]), ['createNewPlaylist', 'addVideoToPlaylistDb']);
});

test('failed hydration blocks native library mutations', async () => {
  const f = providerFixture({ failReads: true });
  await f.render();
  const c = await f.render();
  c.toggleLike('abcdef');
  const after = await f.render();
  assert.equal(f.mutations.length, 0);
  assert.equal(after.likedVideoIds.length, 0);
  assert.equal(f.writes.length, 0);
});

for (const method of ['toggleSave', 'createPlaylist']) {
  test(`web ${method} does not publish state when AsyncStorage rejects the write`, async () => {
    let fail = false;
    const f = providerFixture({ platform: 'web', database: null, storageWriteOperation: async () => {
      if (fail) throw new Error('storage quota exceeded');
    } });
    await f.render();
    const c = await f.render();
    const before = snapshot(c);
    fail = true;
    await c[method](method === 'createPlaylist' ? 'Music' : 'abcdef');
    await settle();
    const after = await f.render();
    assert.deepEqual(snapshot(after), before);
    assert.match(after.storageError, /could not be saved/);
    assert.equal(f.mutations.length, 0);
  });
}

test('an old catalog write cannot resurrect data after a newer reset snapshot', async () => {
  const oldWrite = deferred(); let held = false;
  const storedValues = { vyde_local_video_catalog_v1: JSON.stringify({ abcdef: { title: 'Old', channel: '', thumbnail: '' } }) };
  const f = providerFixture({ storedValues, storageWriteOperation: async (key, value) => {
    if (key === 'vyde_local_video_catalog_v1' && !held) { held = true; await oldWrite.promise; }
    storedValues[key] = value;
  } });
  await f.render(); const c = await f.render(); c.clearLocalData();
  await settle(); await f.render(); oldWrite.resolve();
  await settle(); await f.render(); await settle();
  assert.deepEqual(JSON.parse(storedValues.vyde_local_video_catalog_v1), {});
});

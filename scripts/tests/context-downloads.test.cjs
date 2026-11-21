const { test } = require('node:test');
const assert = require('node:assert/strict');
const { providerFixture } = require('./helpers/provider-fixture.cjs');

test('removing an incomplete download cancels its destination without a local URI', async () => {
  const f = providerFixture();
  await f.render();
  let context = await f.render();
  context.addDownload({ videoId: 'fixture', format: 'audio', status: 'downloading', progress: 0 });
  context = await f.render();
  await context.removeDownload('fixture');
  context = await f.render();
  assert.deepEqual(f.deleted, ['fixture.m4a']);
  assert.equal(context.downloads.length, 0);
});

test('failed file removal retains its library record and reports failure', async () => {
  const f = providerFixture({ deleteOperation: async () => { throw new Error('disk failure'); } });
  await f.render(); let c = await f.render();
  c.addDownload({ videoId: 'fixture', title: 'Video', format: 'mp4', status: 'completed', progress: 1, uri: 'file:///fixture.mp4' });
  c = await f.render(); assert.equal(await c.removeDownload('fixture'), false);
  c = await f.render(); assert.equal(c.downloads.length, 1); assert.match(c.storageError, /could not be removed/);
});

test('partial clear retains records for files that could not be removed', async () => {
  const f = providerFixture({ deleteOperation: async () => { throw new Error('disk failure'); } });
  await f.render(); let c = await f.render();
  c.addDownload({ videoId: 'fixture', title: 'Video', format: 'mp4', status: 'completed', progress: 1, uri: 'file:///fixture.mp4' });
  c = await f.render(); c.clearLocalData(); await f.render(); c = await f.render();
  assert.equal(c.downloads.length, 1); assert.match(c.storageError, /retained for retry/);
});

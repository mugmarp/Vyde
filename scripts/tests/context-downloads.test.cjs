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

test('hydrated WebM audio retains its filename and MIME for sharing and deletion', async () => {
  const item = { videoId: 'fixture', title: 'Audio', format: 'audio', fileName: 'fixture.webm', mimeType: 'audio/webm', status: 'completed', uri: 'file:///fixture.webm', progress: 1 };
  const f = providerFixture({ storedValues: { vyde_local_downloads_v1: JSON.stringify([item]) } });
  await f.render(); const c = await f.render();
  assert.equal(c.downloads[0].fileName, item.fileName);
  assert.equal(c.downloads[0].mimeType, item.mimeType);
  await c.removeDownload('fixture');
  assert.deepEqual(f.deleted, ['fixture.webm']);
});

test('reset deletes the actual recorded audio filename', async () => {
  const f = providerFixture(); await f.render(); let c = await f.render();
  c.addDownload({ videoId: 'fixture', title: 'Audio', format: 'audio', fileName: 'fixture.webm', mimeType: 'audio/webm', status: 'completed', uri: 'file:///fixture.webm', progress: 1 });
  c = await f.render(); c.clearLocalData(); await f.render(); await f.render();
  assert.deepEqual(f.deleted, ['fixture.webm']);
});

test('audio and video assets from the same video retain independent progress and deletion', async () => {
  const f = providerFixture(); await f.render(); let c = await f.render();
  const base = { videoId: 'fixture', title: 'Video', status: 'queued', progress: 0 };
  c.addDownload({ ...base, format: 'mp4', fileName: 'fixture.mp4' });
  c.addDownload({ ...base, format: 'audio', fileName: 'fixture.webm' });
  c = await f.render(); assert.equal(c.downloads.length, 2);
  c.updateDownloadProgress('fixture', 0.5, 'downloading', 'fixture.webm');
  c = await f.render();
  assert.equal(c.downloads.find(d => d.fileName === 'fixture.mp4').progress, 0);
  assert.equal(c.downloads.find(d => d.fileName === 'fixture.webm').progress, 0.5);
  assert.equal(await c.removeDownload('fixture', 'fixture.webm'), true);
  c = await f.render(); assert.equal(c.downloads.length, 1);
  assert.equal(c.downloads[0].fileName, 'fixture.mp4');
  assert.deepEqual(f.deleted, ['fixture.webm']);
});

test('legacy filename identity is retained when adding another format', async () => {
  const legacy = { videoId: 'fixture', title: 'Video', format: 'mp4', status: 'completed', uri: 'file:///fixture.mp4' };
  const f = providerFixture({ storedValues: { vyde_local_downloads_v1: JSON.stringify([legacy]) } });
  await f.render(); let c = await f.render();
  c.addDownload({ videoId: 'fixture', title: 'Audio', format: 'audio', fileName: 'fixture.webm', status: 'queued', progress: 0 });
  c = await f.render(); assert.equal(c.downloads.length, 2);
  await c.removeDownload('fixture');
  c = await f.render(); assert.equal(c.downloads.length, 0);
  assert.deepEqual(new Set(f.deleted), new Set(['fixture.mp4', 'fixture.webm']));
});

test('removing all formats retains only the asset whose file removal failed', async () => {
  const f = providerFixture({ deleteOperation: async name => { if (name.endsWith('.webm')) throw new Error('file busy'); } });
  await f.render(); let c = await f.render();
  for (const [format, fileName] of [['mp4', 'fixture.mp4'], ['audio', 'fixture.webm']]) {
    c.addDownload({ videoId: 'fixture', title: 'Video', format, fileName, status: 'completed', progress: 1 });
  }
  c = await f.render(); assert.equal(await c.removeDownload('fixture'), false);
  c = await f.render(); assert.equal(c.downloads.length, 1);
  assert.equal(c.downloads[0].fileName, 'fixture.webm');
});

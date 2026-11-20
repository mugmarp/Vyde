const { test } = require('node:test');
const assert = require('node:assert/strict');
const { providerFixture } = require('./helpers/provider-fixture.cjs');

test('removing an incomplete download cancels its destination without a local URI', async () => {
  const f = providerFixture();
  await f.render();
  let context = await f.render();
  context.addDownload({ videoId: 'fixture', format: 'audio', status: 'downloading', progress: 0 });
  context = await f.render();
  context.removeDownload('fixture');
  context = await f.render();
  assert.deepEqual(f.deleted, ['fixture.m4a']);
  assert.equal(context.downloads.length, 0);
});

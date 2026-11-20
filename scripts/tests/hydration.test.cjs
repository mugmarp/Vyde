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

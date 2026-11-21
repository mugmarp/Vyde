const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createLoader, deferred, settle } = require('./helpers/load-typescript.cjs');

function databaseFixture(storage, platform = 'android') {
  let opens = 0;
  const database = {
    execAsync: async () => {}, runAsync: async () => {}, closeAsync: async () => {},
    getFirstAsync: async () => null,
    withTransactionAsync: async task => task(),
  };
  const service = createLoader({
    'react-native': { Platform: { OS: platform } },
    '@react-native-async-storage/async-storage': storage,
    './sqlite': { openLocalDatabase: async () => { opens++; return database; } },
  })('services/db/database.ts');
  return { service, database, get opens() { return opens; } };
}

test('R07: all callers await the same schema/migration initialization', async () => {
  const migration = deferred();
  const fixture = databaseFixture({ getItem: () => migration.promise });
  let firstReady = false, secondReady = false;
  const first = fixture.service.getDatabase().then(db => { firstReady = true; return db; });
  await settle();
  const second = fixture.service.getDatabase().then(db => { secondReady = true; return db; });
  await settle();
  assert.equal(firstReady, false);
  assert.equal(secondReady, false);
  assert.equal(fixture.opens, 1);
  migration.resolve('true');
  assert.equal(await first, fixture.database);
  assert.equal(await second, fixture.database);
  assert.equal(await fixture.service.getDatabase(), fixture.database);
  assert.equal(fixture.opens, 1);
});

test('failed migration never publishes a database and can retry', async () => {
  let fail = true;
  const fixture = databaseFixture({ getItem: async () => { if (fail) throw new Error('storage unavailable'); return 'true'; } });
  assert.equal(await fixture.service.getDatabase(), null);
  fail = false;
  assert.equal(await fixture.service.getDatabase(), fixture.database);
  assert.equal(fixture.opens, 2);
});

test('web fallback never opens native SQLite', async () => {
  const fixture = databaseFixture({}, 'web');
  assert.equal(await fixture.service.getDatabase(), null);
  assert.equal(fixture.opens, 0);
});

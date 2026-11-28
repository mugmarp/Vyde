const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createLoader, deferred, settle } = require('./helpers/load-typescript.cjs');

function downloadFixture() {
  const files = new Map();
  const transfers = [];
  const completions = [], errors = [];
  const native = {
    documentDirectory: 'file:///',
    getInfoAsync: async uri => uri.endsWith('/')
      ? { exists: true, isDirectory: true }
      : files.has(uri) ? { exists: true, isDirectory: false, size: files.get(uri) } : { exists: false },
    makeDirectoryAsync: async () => {},
    deleteAsync: async uri => { files.delete(uri); },
    moveAsync: async ({ from, to }) => { assert.ok(files.has(from)); files.set(to, files.get(from)); files.delete(from); },
    readDirectoryAsync: async () => [...files.keys()].map(uri => uri.split('/').at(-1)),
    createDownloadResumable: (uri, destination, options) => {
      const initial = deferred(), resumed = deferred();
      const transfer = {
        destination, initial, resumed, headers: options.headers,
        downloadAsync: () => initial.promise,
        pauseAsync: async () => { initial.resolve(undefined); },
        resumeAsync: () => resumed.promise,
        cancelAsync: async () => { initial.resolve(undefined); resumed.resolve(undefined); },
        complete: (status = 200, size = 20, headers = {}, resume = false) => {
          files.set(destination, size);
          (resume ? resumed : initial).resolve({ uri: destination, status, headers });
        },
      };
      transfers.push(transfer);
      return transfer;
    },
  };
  const manager = createLoader({ 'expo-file-system/legacy': native })('services/download/downloadManager.ts');
  const start = (extra = {}) => manager.start({
    videoId: 'fixture', uri: 'https://example.com/media', fileName: 'fixture.mp4',
    onComplete: uri => completions.push(uri), onError: error => errors.push(error), ...extra,
  });
  return { manager, files, transfers, completions, errors, start, native };
}

test('actual audio container extensions do not become M4A', () => {
  const f = downloadFixture();
  assert.equal(f.manager.suggestFileName('fixture', 'webm'), 'fixture.webm');
  assert.equal(f.manager.suggestFileName('fixture', 'm4a'), 'fixture.m4a');
  assert.equal(f.manager.suggestFileName('fixture', 'audio'), 'fixture.m4a');
});

test('R04: existing file is not trusted; only a verified fresh transfer completes', async () => {
  const f = downloadFixture();
  f.files.set(f.manager.localUri('fixture.mp4'), 3);
  await f.start({ expectedBytes: 20 });
  assert.equal(f.completions.length, 0);
  assert.equal(f.transfers[0].destination.endsWith('.part'), true);
  f.transfers[0].complete();
  await settle();
  assert.deepEqual(f.completions, ['file:///vyde-downloads/fixture.mp4']);
  assert.equal(f.files.get(f.completions[0]), 20);
});

test('R05: HTTP 403 never completes or publishes its response body', async () => {
  const f = downloadFixture();
  await f.start(); f.transfers[0].complete(403);
  await settle();
  assert.equal(f.completions.length, 0);
  assert.match(f.errors[0], /403/);
  assert.equal(f.files.size, 0);
});

for (const [label, size, headers] of [['empty file', 0, {}], ['truncated file', 5, {}], ['HTML error', 20, { 'Content-Type': 'text/html' }]]) {
  test(`${label} is not published as completed media`, async () => {
    const f = downloadFixture();
    await f.start({ expectedBytes: 20 }); f.transfers[0].complete(200, size, headers);
    await settle();
    assert.equal(f.completions.length, 0);
    assert.equal(f.errors.length, 1);
    assert.equal(f.files.size, 0);
  });
}

test('session pause/resume retains ownership and completes only once', async () => {
  const f = downloadFixture(); const task = await f.start();
  await task.pause();
  assert.equal(f.errors.length, 0);
  const resumed = task.resume();
  f.transfers[0].complete(206, 20, { 'Content-Range': 'bytes 10-19/20', 'Content-Length': '10' }, true);
  await resumed;
  assert.equal(f.completions.length, 1);
  await task.resume();
  assert.equal(f.completions.length, 1);
});

test('deleting active work invalidates an already queued completion callback', async () => {
  const f = downloadFixture(); await f.start();
  f.transfers[0].complete();
  await f.manager.deleteDownload('fixture.mp4');
  await settle();
  assert.equal(f.completions.length, 0);
  assert.equal(f.errors.length, 0);
  assert.equal(f.files.size, 0);
});

test('cancellation during publication removes the result without completing', async () => {
  const f = downloadFixture(), moved = deferred(), allowMove = deferred();
  f.native.moveAsync = async ({ from, to }) => {
    moved.resolve(); await allowMove.promise;
    f.files.set(to, f.files.get(from)); f.files.delete(from);
  };
  const task = await f.start(); f.transfers[0].complete();
  await moved.promise;
  const cancelled = task.cancel(); allowMove.resolve(); await cancelled;
  assert.equal(f.completions.length, 0);
  assert.equal(f.files.size, 0);
});

test('duplicate destination is rejected; distinct audio/video jobs can coexist', async () => {
  const f = downloadFixture(); await f.start();
  await assert.rejects(f.start(), /already active/);
  await f.start({ fileName: 'fixture.m4a' });
  assert.equal(f.transfers.length, 2);
});

test('an old task handle cannot cancel a new generation', async () => {
  const f = downloadFixture(); const old = await f.start();
  f.transfers[0].complete(); await settle();
  await f.start(); await old.cancel();
  f.transfers[1].complete(); await settle();
  assert.equal(f.completions.length, 2);
});

test('cancelling during setup cannot start native work later', async () => {
  const f = downloadFixture(), directory = deferred();
  f.native.getInfoAsync = async () => { await directory.promise; return { exists: true, isDirectory: true }; };
  const starting = f.start();
  const deleting = f.manager.deleteDownload('fixture.mp4');
  directory.resolve();
  await starting; await deleting;
  assert.equal(f.transfers.length, 0);
  assert.equal(f.completions.length, 0);
});

test('partial files count toward storage but are not listed as finished files', async () => {
  const f = downloadFixture();
  f.files.set(f.manager.localUri('fixture.mp4'), 1024 * 1024);
  f.files.set(f.manager.localUri('other.mp4.part'), 1024 * 1024);
  assert.equal((await f.manager.listDownloads()).length, 1);
  assert.equal(await f.manager.totalStorageMB(), 2);
});

test('resolver request headers reach the transfer and override defaults', async () => {
  const f = downloadFixture();
  await f.start({ headers: { Referer: 'https://example.com/watch', 'X-Fixture': 'source-context' } });
  assert.equal(f.transfers[0].headers.Referer, 'https://example.com/watch');
  assert.equal(f.transfers[0].headers['X-Fixture'], 'source-context');
});

test('a partial 206 response cannot be published using only its response length', async () => {
  const f = downloadFixture(); await f.start();
  f.transfers[0].complete(206, 20, { 'Content-Length': '20', 'Content-Range': 'bytes 0-19/100' });
  await settle(); assert.equal(f.completions.length, 0); assert.equal(f.errors.length, 1);
});

test('a complete fresh 206 response validates the full entity range', async () => {
  const f = downloadFixture(); await f.start();
  f.transfers[0].complete(206, 20, { 'Content-Length': '20', 'Content-Range': 'bytes 0-19/20' });
  await settle(); assert.equal(f.completions.length, 1);
});

test('a 206 response missing range metadata fails rather than guessing completeness', async () => {
  const f = downloadFixture(); await f.start(); f.transfers[0].complete(206, 20);
  await settle(); assert.equal(f.completions.length, 0); assert.equal(f.errors.length, 1);
});

test('file deletion failures reach the caller and leave the existing file intact', async () => {
  const f = downloadFixture(); f.files.set(f.manager.localUri('fixture.mp4'), 20);
  f.native.deleteAsync = async () => { throw new Error('disk failure'); };
  await assert.rejects(f.manager.deleteDownload('fixture.mp4'), /disk failure/);
  assert.equal(f.files.size, 1);
});

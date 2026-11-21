const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

async function probe(streamingData) {
  const output = [];
  const process = { stdout: { write() {} }, exit(code) { this.exitCode = code; } };
  await vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../benchmark_phase1.mjs'), 'utf8'), {
    process, console: { log: (...args) => output.push(args.join(' ')), error() {} },
    fetch: async () => streamingData ? { ok: true, json: async () => ({ playabilityStatus: { status: 'OK' }, streamingData }) } : { ok: false },
  });
  return { output, exitCode: process.exitCode ?? 0 };
}

test('zero successful candidates produce a failing probe status', async () => {
  const result = await probe();
  assert.equal(result.exitCode, 1);
  assert.ok(result.output.some(line => line.includes('0/15')));
});
test('video-only formats cannot satisfy the standalone candidate criterion', async () => {
  const result = await probe({ adaptiveFormats: [{ url: 'https://example.com/video', mimeType: 'video/mp4' }] });
  assert.equal(result.exitCode, 1);
});
test('successful candidate presence is explicitly separate from native playback acceptance', async () => {
  const result = await probe({ hlsManifestUrl: 'https://example.com/master.m3u8' });
  assert.equal(result.exitCode, 0);
  assert.ok(result.output.some(line => line.includes('Native playback acceptance: NOT MEASURED')));
});

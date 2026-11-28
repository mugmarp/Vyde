const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createLoader } = require("./helpers/load-typescript.cjs");
const { selectDownloadSource } = createLoader()("domain/download.ts");
const source = (contentType, container, mimeType) => ({
  uri: "https://example.com/media",
  contentType,
  container,
  mimeType,
  qualityLabel: "Fixture",
});

test("MP4 file selection does not mistake HLS, video-only or WebM for a combined MP4", () => {
  const wrong = [
    source("hls"),
    source("adaptive-video", "mp4", "video/mp4"),
    source("progressive", "webm", "video/webm"),
  ];
  assert.equal(selectDownloadSource(wrong, "mp4"), null);
  const mp4 = source("progressive", "mp4", "video/mp4");
  assert.equal(selectDownloadSource([...wrong, mp4], "mp4").source, mp4);
});

test("audio selection prefers M4A and preserves WebM when that is the available audio container", () => {
  const webm = source("audio", "webm", "audio/webm");
  const mp4 = source("audio", "mp4", "audio/mp4");
  assert.equal(selectDownloadSource([webm, mp4], "audio").extension, "m4a");
  const result = selectDownloadSource([webm], "audio");
  assert.equal(result.extension, "webm");
  assert.equal(result.mimeType, "audio/webm");
  assert.equal(result.source, webm);
  assert.equal(
    selectDownloadSource(
      [{ ...webm, mimeType: 'audio/webm; codecs="opus"' }],
      "audio",
    ).mimeType,
    "audio/webm",
  );
});

test("a combined video cannot be renamed into an audio-only file", () => {
  assert.equal(
    selectDownloadSource([source("progressive", "mp4", "video/mp4")], "audio"),
    null,
  );
});

test("expired, insecure, malformed and conflicting sources cannot be queued", () => {
  const mp4 = source("progressive", "mp4", "video/mp4");
  for (const bad of [
    { ...mp4, expiresAt: 1000 },
    { ...mp4, uri: "http://example.com/media" },
    { ...mp4, uri: "broken" },
    { ...mp4, mimeType: "video/webm" },
  ]) {
    assert.equal(selectDownloadSource([bad], "mp4", 1000), null);
  }
  assert.equal(
    selectDownloadSource([{ ...mp4, expiresAt: 2000 }], "mp4", 1000).extension,
    "mp4",
  );
});

test("unknown audio containers remain unresolved instead of being named M4A", () => {
  assert.equal(selectDownloadSource([source("audio")], "audio"), null);
});

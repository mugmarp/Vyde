const { test } = require("node:test");
const assert = require("node:assert/strict");
const { playerFixture } = require("./helpers/player-fixture.cjs");
const mp4 = {
  uri: "https://example.com/video.mp4",
  contentType: "progressive",
  container: "mp4",
  mimeType: "video/mp4",
  qualityLabel: "360p",
  headers: { "User-Agent": "fixture-client" },
};
const hls = {
  uri: "https://example.com/master.m3u8",
  contentType: "hls",
  qualityLabel: "Auto",
};

for (const initial of [[hls], [{ ...mp4, expiresAt: 1 }]]) {
  test(`download refreshes ${initial[0].contentType === "hls" ? "HLS-only" : "expired"} sources without replacing playback`, async (t) => {
    const f = playerFixture(t);
    await f.resolve(initial);
    const playingSource = f.current.source.uri;
    const operation = f.beginDownload("mp4");
    assert.equal(f.requests.at(-1).purpose, "download-video");
    await f.resolve([mp4]);
    await operation;
    assert.equal(f.transfers.length, 1);
    assert.equal(f.transfers[0].uri, mp4.uri);
    assert.equal(f.transfers[0].headers["User-Agent"], "fixture-client");
    assert.equal(f.current.source.uri, playingSource);
  });
}

test("WebM audio is queued and completed with truthful file and MIME metadata", async (t) => {
  const f = playerFixture(t);
  const audio = {
    uri: "https://example.com/audio.webm",
    contentType: "audio",
    container: "webm",
    mimeType: "audio/webm",
    qualityLabel: "Audio",
  };
  await f.resolve([mp4, audio]);
  await f.beginDownload("audio");
  assert.equal(f.requests.length, 1);
  assert.equal(f.transfers[0].fileName, "abcdefghijk.webm");
  f.transfers[0].onComplete("file:///abcdefghijk.webm");
  assert.equal(f.records.at(-1).mimeType, "audio/webm");
  assert.equal(f.records.at(-1).fileName, "abcdefghijk.webm");
});

test("a video change discards a pending download lookup before queuing its result", async (t) => {
  const f = playerFixture(t);
  await f.resolve([hls]);
  const operation = f.beginDownload("mp4");
  const lookup = f.requests.at(-1);
  f.route.id = "nextvideo12";
  f.render();
  lookup.resolve({ id: "abcdefghijk", nativePlaybackCandidates: [mp4] });
  await operation;
  await f.flush();
  assert.equal(f.transfers.length, 0);
  assert.equal(f.records.length, 0);
});

test("duplicate taps share the pending source lookup and cannot start duplicate transfers", async (t) => {
  const f = playerFixture(t);
  await f.resolve([hls]);
  const operation = f.beginDownload("mp4");
  await f
    .find((n) => n.props?.accessibilityLabel === "Download MP4")
    .props.onPress();
  assert.equal(f.requests.length, 2);
  await f.resolve([mp4]);
  await operation;
  assert.equal(f.transfers.length, 1);
});

test("an active destination cannot overwrite its queued library record", async (t) => {
  const f = playerFixture(t);
  await f.resolve([mp4]);
  f.setActive(true);
  await f.beginDownload("mp4");
  assert.equal(f.transfers.length, 0);
  assert.equal(f.records.length, 0);
  assert.match(f.alerts.at(-1)[1], /already in progress/);
});

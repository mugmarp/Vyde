const { test } = require("node:test");
const assert = require("node:assert/strict");
const { playerFixture } = require("./helpers/player-fixture.cjs");
const sources = [
  {
    uri: "https://example.com/one",
    contentType: "progressive",
    qualityLabel: "360p",
  },
  {
    uri: "https://example.com/two",
    contentType: "progressive",
    qualityLabel: "720p",
  },
];

test("failed source resumes the requested playback and position on its replacement", async (t) => {
  const f = playerFixture(t);
  await f.resolve(sources);
  f.current.emit("statusChange", { status: "readyToPlay" });
  f.pressPlay();
  const old = f.current;
  old.currentTime = 37;
  old.emit("timeUpdate", { currentTime: 37 });
  old.emit("statusChange", {
    status: "error",
    error: { message: "Failed source" },
  });
  f.render();
  assert.notEqual(f.current, old);
  f.current.emit("statusChange", { status: "readyToPlay" });
  f.render();
  assert.equal(f.current.playing, true);
  assert.equal(f.current.currentTime, 37);
  old.emit("statusChange", { status: "readyToPlay" });
  assert.equal(old.playCalls, 1, "released source must not restart");
});

test("pausing a requested play before readiness prevents later automatic playback", async (t) => {
  const f = playerFixture(t);
  await f.resolve(sources);
  f.pressPlay();
  f.pressPlay();
  f.current.emit("statusChange", { status: "readyToPlay" });
  f.render();
  assert.equal(f.current.playing, false);
});

test("a new video does not inherit the preceding video play intent or position", async (t) => {
  const f = playerFixture(t);
  await f.resolve(sources);
  f.current.emit("statusChange", { status: "readyToPlay" });
  f.pressPlay();
  f.current.currentTime = 42;
  f.current.emit("timeUpdate", { currentTime: 42 });
  f.route.id = "nextvideo12";
  f.render();
  await f.resolve(sources);
  f.current.emit("statusChange", { status: "readyToPlay" });
  f.render();
  assert.equal(f.current.playing, false);
  assert.equal(f.current.currentTime, 0);
});

test("duplicate errors from one source cannot skip the next candidate", async (t) => {
  const f = playerFixture(t);
  await f.resolve([
    ...sources,
    { ...sources[1], uri: "https://example.com/three" },
  ]);
  const failed = f.current;
  failed.emit("statusChange", { status: "error" });
  failed.emit("statusChange", { status: "error" });
  f.render();
  assert.equal(f.current.source.uri, sources[1].uri);
});

test("a play request while the native source loads starts it on readiness", async (t) => {
  const f = playerFixture(t);
  await f.resolve(sources);
  f.pressPlay();
  assert.equal(f.current.playing, false);
  f.current.emit("statusChange", { status: "readyToPlay" });
  f.render();
  assert.equal(f.current.playing, true);
});

for (const shouldPlay of [true, false]) {
  test(`quality replacement restores position and ${shouldPlay ? "playing" : "paused"} intent`, async (t) => {
    const f = playerFixture(t);
    await f.resolve(sources);
    f.current.emit("statusChange", { status: "readyToPlay" });
    if (shouldPlay) f.pressPlay();
    f.current.currentTime = 23;
    f.chooseQuality("720p");
    f.current.emit("statusChange", { status: "readyToPlay" });
    f.render();
    assert.equal(f.current.currentTime, 23);
    assert.equal(f.current.playing, shouldPlay);
  });
}

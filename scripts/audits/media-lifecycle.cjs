const fs = require("node:fs"),
  path = require("node:path"),
  Module = require("node:module");
// Read-only diagnostic: production modules run against controlled boundary fixtures.
// JSON observations are not a native acceptance test or a passing regression gate.
const root = path.resolve(__dirname, "../..");
const helpers = root + "/scripts/tests/helpers";
const { deferred, settle } = require(helpers + "/load-typescript.cjs");
const { providerFixture } = require(helpers + "/provider-fixture.cjs");
function compileFixture(source, filename) {
  const m = new Module(filename, module);
  m.filename = filename;
  m.paths = Module._nodeModulePaths(path.dirname(filename));
  m._compile(source, filename);
  return m.exports;
}
let ds = fs
  .readFileSync(root + "/scripts/tests/downloads.test.cjs", "utf8")
  .split("test('actual audio container")[0]
  .replace(
    "require('./helpers/load-typescript.cjs')",
    `require(${JSON.stringify(helpers + "/load-typescript.cjs")})`,
  );
ds += "\nmodule.exports={downloadFixture};";
const { downloadFixture } = compileFixture(
  ds,
  root + "/scripts/tests/audit-download-fixture.cjs",
);
async function drain() {
  for (let i = 0; i < 5; i++) await settle();
}
const findings = [];
const record = (name, data) => {
  const r = { name, ...data };
  findings.push(r);
  console.log(JSON.stringify(r));
};
(async () => {
  // Native delete delayed after cancellation, then a fresh download uses the same destination.
  const f = downloadFixture(),
    gate = deferred(),
    entered = deferred();
  const original = f.native.deleteAsync;
  f.native.deleteAsync = async (uri) => {
    if (uri === f.manager.localUri("fixture.mp4")) {
      entered.resolve();
      await gate.promise;
    }
    return original(uri);
  };
  await f.start();
  const removal = f.manager.deleteDownload("fixture.mp4");
  await entered.promise;
  const lockReleased = !f.manager.isActive("fixture.mp4");
  await f.start();
  f.transfers[1].complete();
  await drain();
  const fileBefore = f.files.has(f.manager.localUri("fixture.mp4"));
  gate.resolve();
  await removal;
  record("delete_new_transfer_race", {
    lockReleasedWhileDeletePending: lockReleased,
    newTransferReportedComplete: f.completions.length === 1,
    newFileBeforeOldDeletion: fileBefore,
    newFileAfterOldDeletion: f.files.has(f.manager.localUri("fixture.mp4")),
  });
  // Provider removes by filename after an async deletion, even if a new record replaced its target.
  const deletion = deferred();
  const p = providerFixture({ deleteOperation: () => deletion.promise });
  await p.render();
  let c = await p.render();
  c.addDownload({
    videoId: "fixture",
    title: "Old",
    format: "mp4",
    fileName: "fixture.mp4",
    status: "completed",
    progress: 1,
  });
  c = await p.render();
  const pendingRemove = c.removeDownload("fixture", "fixture.mp4");
  c.addDownload({
    videoId: "fixture",
    title: "Replacement",
    format: "mp4",
    fileName: "fixture.mp4",
    status: "queued",
    progress: 0,
  });
  deletion.resolve();
  await pendingRemove;
  c = await p.render();
  record("replacement_record_lost", {
    recordsAfterOldRemoval: c.downloads.length,
  });
  // A reset snapshots downloads before awaited database work; new assets are omitted from deletion and records.
  const reset = deferred();
  const q = providerFixture({
    writeOperation: async (method) => {
      if (method === "resetAllLocalData") await reset.promise;
    },
  });
  await q.render();
  let v = await q.render();
  v.clearLocalData();
  await q.render();
  v.addDownload({
    videoId: "newvideo",
    title: "New",
    format: "mp4",
    fileName: "newvideo.mp4",
    status: "completed",
    progress: 1,
    uri: "file:///newvideo.mp4",
  });
  await q.render();
  reset.resolve();
  await drain();
  v = await q.render();
  record("reset_concurrent_asset", {
    recordsAfterReset: v.downloads.length,
    newFileIncludedInDeletion: q.deleted.includes("newvideo.mp4"),
  });
  // Current finish checks reject error documents, but not response container disagreement.
  const b = downloadFixture();
  await b.start({ expectedBytes: 20 });
  b.transfers[0].complete(200, 20, { "Content-Type": "audio/webm" });
  await drain();
  record("wrong_response_mime", {
    destination: "fixture.mp4",
    actualResponseMime: "audio/webm",
    completed: b.completions.length,
    errors: b.errors,
  });
  // A stored download without status or URI is promoted to completed.
  const h = providerFixture({
    storedValues: {
      vyde_local_downloads_v1: JSON.stringify([
        { videoId: "fixture", title: "Incomplete" },
      ]),
    },
  });
  await h.render();
  const hc = await h.render();
  record("invalid_hydration_completion", {
    status: hc.downloads[0]?.status,
    uri: hc.downloads[0]?.uri ?? null,
    progress: hc.downloads[0]?.progress,
  });

  // The installed Android implementation appends a resumed response even if HTTP 200.
  const resumed = downloadFixture();
  const task = await resumed.start();
  resumed.files.set(resumed.transfers[0].destination, 10);
  await task.pause();
  const pendingResume = task.resume();
  resumed.transfers[0].complete(
    200,
    30,
    { "Content-Length": "20", "Content-Type": "video/mp4" },
    true,
  );
  await pendingResume;
  record("resume_200_appended_prefix", {
    fullSizeOriginallyUnknown: true,
    headerResponseBytes: 20,
    assembledFileBytes: resumed.files.get(
      resumed.manager.localUri("fixture.mp4"),
    ),
    reportedComplete: resumed.completions.length,
  });
  const base = fs.readFileSync(helpers + "/player-fixture.cjs", "utf8");
  const makeScreen = (source, name) =>
    compileFixture(source, helpers + "/" + name).playerFixture;
  const screenWithRecords = makeScreen(
    base
      .replace(
        "function playerFixture(t) {",
        "function playerFixture(t) { let currentDownloads = [];",
      )
      .replace("downloads: [],", "downloads: currentDownloads,")
      .replace(
        "    render,",
        "    setDownloads: value => { currentDownloads = value; },\n    render,",
      ),
    "audit-player-downloads.cjs",
  );
  const offlineScreen = makeScreen(
    base.replace(
      'const route = { id: "abcdefghijk", title: "Example" };',
      'const route = { id: "abcdefghijk", title: "Example", localUri: "file:///offline.mp4" };',
    ),
    "audit-player-offline.cjs",
  );
  const screen = makeScreen(base, "audit-player-position.cjs");
  const cleanups = [];
  const t = { after: (fn) => cleanups.push(fn) };
  const mp4 = {
    uri: "https://example.com/video.mp4",
    contentType: "progressive",
    container: "mp4",
    mimeType: "video/mp4",
    qualityLabel: "360p",
  };
  const hls = {
    uri: "https://example.com/master.m3u8",
    contentType: "hls",
    qualityLabel: "Auto",
  };
  try {
    const a = screenWithRecords(t);
    await a.resolve([hls]);
    const lookup = a.beginDownload("mp4");
    a.setDownloads([
      {
        videoId: "abcdefghijk",
        title: "Already completed",
        fileName: "abcdefghijk.mp4",
        format: "mp4",
        status: "completed",
        uri: "file:///abcdefghijk.mp4",
      },
    ]);
    a.render();
    await a.resolve([mp4]);
    await lookup;
    record("completed_during_lookup", {
      newTransferStartedDespiteCurrentCompletedRecord: a.transfers.length === 1,
      recordsQueued: a.records.length,
    });
    const stale = screenWithRecords(t);
    await stale.resolve([mp4]);
    stale.setDownloads([
      {
        videoId: "abcdefghijk",
        title: "Missing file",
        fileName: "abcdefghijk.mp4",
        format: "mp4",
        status: "completed",
        uri: "file:///missing.mp4",
      },
    ]);
    stale.render();
    await stale
      .find((n) => n.props?.accessibilityLabel === "Download MP4")
      .props.onPress();
    record("stale_completed_record_blocks_retry", {
      transfers: stale.transfers.length,
      lastMessage: stale.alerts.at(-1)?.[1],
    });
    const offline = offlineScreen(t);
    const offlineNetworkRequests = offline.requests.length;
    await offline.resolve([mp4]);
    offline.current.emit("statusChange", {
      status: "error",
      error: { message: "Local file missing" },
    });
    offline.render();
    record("offline_network_fallback", {
      networkRequestsOnOfflineLaunch: offlineNetworkRequests,
      sourceAfterLocalFailure: offline.current.source.uri,
    });
    const pos = screen(t);
    await pos.resolve([
      mp4,
      { ...mp4, uri: "https://example.com/second", qualityLabel: "720p" },
    ]);
    pos.current.emit("statusChange", { status: "readyToPlay" });
    pos.pressPlay();
    pos.current.currentTime = 37;
    pos.current.emit("timeUpdate", { currentTime: 37 });
    pos.current.emit("statusChange", { status: "error" });
    pos.render();
    pos.current.emit("timeUpdate", { currentTime: 0 });
    pos.current.emit("statusChange", { status: "readyToPlay" });
    pos.render();
    record("pre_ready_time_update_erases_resume", {
      expectedPosition: 37,
      actualPosition: pos.current.currentTime,
      playing: pos.current.playing,
    });
  } finally {
    for (const cleanup of cleanups) cleanup();
  }
})().catch((e) => {
  console.error(e.stack);
  process.exitCode = 1;
});

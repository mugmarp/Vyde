# Critical lifecycle re-audit — 28 November 2026

## Assessment

**The current implementation is not ready for a stable functional release.** The recent resolver, playback-intent and file-metadata corrections are real. However, ten controlled failure scenarios remain reproducible, including deletion of a newly completed download and loss of playback position during source replacement. Some scenarios share the same missing ownership/generation architecture; ten scenarios do not mean ten unrelated root causes.

Reviewed revision: `24223bee3e9f57b845c4acdc23987473f78c35f7`. Its [CI run](https://github.com/mugmarp/Vyde/actions/runs/46139147387) passed workspace verification, including regression tests and mobile/API typechecks, and web export checks when inspected. Android packaging was still running at that inspection. The preceding `4543946` run completed both APK variants successfully. Build success and a signed release do not establish native playback/download acceptance.

No production application source was changed by this re-audit. The new [diagnostic harness](../scripts/audits/media-lifecycle.cjs) reads production modules through controlled React/filesystem/network boundaries and emits the observations below. It performs no phone operation, network request, Android compilation, flash operation or real user-file deletion. Execute with `node scripts/audits/media-lifecycle.cjs` after installing project dependencies. It is a diagnostic tied to the reviewed source/fixture structure, not a passing regression gate; findings must become regression tests as fixes are implemented.

Installed primary source inspected: expo-video **3.0.16**, expo-file-system **19.0.24**. The video clock emits periodic timestamps without a readiness condition. The Android legacy file downloader resumes with a Range header, records resume data as a byte offset, and appends a resumed body. This source evidence establishes why the modeled event/response sequences matter; the probes do not establish physical-device occurrence rates.

## Reproduced findings

| ID | Priority | Trigger and actual result | Required correction |
| --- | --- | --- | --- |
| R28-01 | P1 | A fallback player emits `timeUpdate(0)` while loading before `readyToPlay`. Saved position **37 s becomes 0 s**, although playback resumes. | Separate the pending seek target from observed loading timestamps; do not overwrite it before restoration. Cover loading-time and post-seek native event ordering. |
| R28-02 | P1 | Delete an old destination, delay its final filesystem deletion, then start/complete a replacement. The lock is already released; the replacement reports complete, then **the older deletion removes the new file**. | Keep a per-asset reservation through cancellation, partial cleanup and final deletion. New transfers must not reuse the destination in the gap. |
| R28-03 | P1 | Delay record removal, replace its catalog entry with a new queued record at the same filename, then let the old removal finish. **The replacement record disappears.** | Give asset versions/jobs identities and remove only the version owned by the operation. Filename matching alone is not a generation check. |
| R28-04 | P1 | Start reset while its database operation is delayed, then add a completed asset. Reset clears the record but **never includes the new file in deletion**. | Introduce a reset epoch/barrier covering download creation, callbacks, repository mutations and file cleanup. Await quiescence and retain a recovery journal. |
| R28-05 | P1 | Begin a file-source lookup, complete the same asset elsewhere while it waits, then return the lookup. **A new transfer is queued despite a now-completed record**, because the handler reads its old React snapshot. | Atomically reserve/check the current repository state and filesystem after asynchronous lookup; component-local duplicate guards are insufficient. |
| R28-06 | P2 | A completed catalog entry points at a missing file. Download returns **“This format is already saved”**, starts no transfer and does not check file existence. | Reconcile completion against the file and offer repair/redownload for missing or invalid assets. |
| R28-07 | P1 | A request for `fixture.mp4` receives matching-length **`audio/webm`** with HTTP 200. It is moved to the MP4 destination and reported complete with no error. | Carry expected output into completion validation, reject known response conflicts, and inspect the actual media/container/tracks before publishing it as a verified result. |
| R28-08 | P2 | Hydrate `{ videoId, title }` without status or URI. It becomes **completed, progress 1, URI absent**. | Validate schema/state combinations, quarantine incomplete records and reconcile files. Do not infer completion from missing data. |
| R28-09 | P2 | Launch an offline file, resolve online metadata, then fail the local source. Offline launch already made a network request; its replacement becomes **an online HTTPS source**. | Represent offline playback explicitly. Check the local asset and make online repair/fallback an explicit user action, separate from local playback. |
| R28-10 | P1 | Resume when full size was originally unknown and the server ignores Range with HTTP 200. The native append model yields **30 bytes from a 10-byte prefix plus a 20-byte response**; the manager reports completion. | Handle a 200 response to a resumed request by restarting/truncating safely, rather than accepting an appended file. Validate entity identity and total size before publication. |

P1 identifies incorrect core behavior with data-loss or false-completion consequences, not a measured frequency on the owner's phone. R28-10 is conditional on unknown expected total size; known-size checks catch some such responses.

## Source locations and evidence

- **R28-01:** `player.tsx` readiness restoration around lines 316–330 and `timeUpdate` around 353–356 share `playbackIntent.current.position`. The current seven lifecycle tests do not emit a loading timestamp between replacement and readiness. Installed `IntervalUpdateClock.kt` and `VideoPlayer.emitTimeUpdate()` support the possibility of that ordering.
- **R28-02:** `downloadManager.ts` cancellation releases the active entry before `deleteDownload()` awaits final-file deletion, around lines 263–289. The diagnostic holds exactly this final-delete boundary. It observes `lockReleasedWhileDeletePending: true`, completion, then `newFileAfterOldDeletion: false`.
- **R28-03/R28-04:** `AppContext.tsx` `removeDownload()` around 393–406 filters current records by filename after an await; `clearLocalData()` around 446–469 iterates a captured download list and later replaces the current list.
- **R28-05/R28-06:** `player.tsx` source lookup around 517–533 awaits fresh resolution, but its completed-record guard still reads captured `downloads`; it does not consult file existence. Video/unmount generation protection correctly covers different videos, but not a changed asset within the same video.
- **R28-07/R28-10:** `downloadManager.ts` completion around 137–174 rejects error documents and verifies some lengths/ranges, but does not compare response media type to the selected output. The expected-length expression intentionally ignores a resumed response's Content-Length. Installed `FileSystemLegacyModule.kt` adds Range around 676–678 and opens `FileOutputStream(file, isResume)` around 938.
- **R28-08:** `AppContext.tsx` hydration around 145–168 defaults missing status to completed and missing progress to 1 independently of URI/file validity.
- **R28-09:** `player.tsx` offline candidates around 201–204 are combined with online alternatives, and its metadata request around 239 has no offline-mode guard.

### Additional source-confirmed risk: resume identity

The inspected Android downloader sends a byte Range and stores an offset; Vyde does not supply a corresponding entity validator/If-Range checkpoint. Consistent byte counts alone cannot prove that an old prefix and new suffix belong to the same resource version. A mixed-version media file was not tested on a physical device in this audit.

## What remains improved

The normal tested paths still include: explicit native retry, continuing past separate tracks to find combined playback, download-specific fallback past HLS, scheme/expiry/metadata checks, correct new audio extensions and MIME values, per-file progress/deletion in uncontended cases, and preservation of failed deletions. The audit does not retract those bounded results or re-label already-fixed signature/typechecking bugs as unfixed.

The **187-case suite** and current CI verification cover those paths. They miss the interleavings and native-event ordering above. The new probes expose that coverage gap; neither the suite nor byte-range host checks certify end-to-end behavior.

## Correct implementation order

1. **Asset ownership and reset isolation:** stable asset specification plus operation/job generation, one authoritative repository, serialized create/replace/delete transitions and a reset barrier. Fix R28-02 through R28-05 as a coherent lifecycle change.
2. **Playback event state:** preserve desired position through loading/restoration, distinguish user intent from native observation, and add R28-01's exact ordering to the real-screen regression fixture.
3. **Completion and resume:** expected/actual response checks, safe restart on ignored Range, entity validators and native track/container inspection. Publish completion only after validation and a repository commit/recovery record.
4. **Hydration, missing assets and explicit offline mode:** validate state schemas, preserve malformed-data evidence, reconcile files and implement repair paths without silently substituting online playback.
5. **Complete the agreed engine capabilities:** maintained extraction/challenges, paired HD, HLS/SABR transport/downloads, conversion/export and Android foreground work. Preserve the Expo UI and ADR-001's license evaluation; this audit selects no native/GPL dependency.

Acceptance requires reproducing each scenario against its fix, then exercising audible playback, seek/quality/error recovery, both download outputs, independent deletion, interrupted-job recovery, offline restart and signed upgrade behavior on Android. Device/network results and code-level fixture results must remain separate.

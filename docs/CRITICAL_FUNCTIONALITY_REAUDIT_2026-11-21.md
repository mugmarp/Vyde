# Critical functionality re-audit — 2026-11-21

## Assessment and scope

**Vyde is not ready for a stable functional release.** Build/release-signing work, storage containment and recent discovery/comments improvements are real, but important media and data-lifecycle contracts are still broken. A release build type or a green CI run does not establish the application's required behavior. This audit cannot certify the absence of every hidden defect.

Reviewed source: `063bbdb5eb18f4527c46b82f546bf71cb3063767`. Scope: request/discovery flow, comments, cipher normalization, native player ownership, downloads/export, persistence/migration/reset, account UI/helpers, versioning and CI/signing. Installed dependency source inspected: expo-video 3.0.16 and expo-modules-core 3.0.30. No phone operations or production-code changes were made during this audit.

Evidence labels:

- **Reproduced:** controlled probes executing production modules with explicit mocked native/network boundaries; migration uses actual SQLite. This establishes code behavior, not occurrence frequency on a physical phone.
- **Source-confirmed:** directly traced code path or missing integration; native behavior remains a device acceptance gate where relevant.
- **Unverified:** requires live provider/device measurement. No fabricated playback rate, latency improvement or functionality-completion percentage is assigned.

The controlled probes are distinct from the existing 135-case suite. They reveal gaps that are not yet regressions in that suite. Production behavior is deliberately left unchanged so this report does not imply the findings are repaired.

## Release-blocking findings

### C01 — Unresolved signatures can be accepted as playable sources

**Reproduced.** `cipher.ts:268` returns the cipher's base URL when a signature is still required but unavailable. `extractPlaybackCandidates` can emit that URL, and `extractPlayer` accepts a client based on nonempty normalized candidates. This can stop the cascade at a source which is not actually resolved.

Probe: one signatureCipher format, no discoverable player ID, failed iframe lookup. Result: **one candidate emitted, with no required signature parameter**. This is not verified playback. It is a validity defect beneath the earlier normalization-aware fallback fix.

The `n` solver also falls back to identity on missing/execution-failed transforms (`cipher.ts:156,166,218`), so an unchanged challenge can be labelled resolved. These are correctness problems; do not treat them as reasons to permanently remove playback capabilities.

Required gate: a format requiring a challenge cannot be selected as resolved until the challenge implementation succeeds. Use a maintained and measured engine/adapter; preserve precise failure and continue eligible alternatives. Verify actual transport and first frame/sound afterward.

### C02 — Download completion does not establish valid output media

**Reproduced plus source-confirmed.** `downloadManager.ts:132–151` accepts 200/206, MIME checks and byte counts but ignores Content-Range semantics, source identity and media tracks/container.

Probe: HTTP 206 with 20 bytes, Content-Length 20 and Content-Range `bytes 0-19/100`, with no independent full size. Result: **20 of 100 bytes published as completed**. A progress callback reporting the response length would not establish full-entity size either.

`player.tsx:436–468` also permits video-only adaptive data for a video download without merging audio, permits a progressive video source for an audio choice, and names audio `.m4a` even if the source is WebM/Opus. No mux/demux/transcode or final media probe occurs. A transfer may complete while the selected output contract is false.

Required gate: validated ranges/entity identity, component tracks and expected full size; real processing where needed; final codec/container/duration/audio-video validation before publication. Filename changes are not conversion. Preserve existing final files until a verified replacement is ready.

### C03 — A successful reset can be undone by an older persistence write

**Reproduced.** `AppContext.tsx:267` launches independent AsyncStorage mirror writes without serialization. SQLite commit-first mutations do not order these mirror/catalog operations.

Probe: hold the first old catalog write; finish clearLocalData and its empty catalog write; release the old write. Observed stored catalog: **empty after reset, then old metadata restored**. SQLite transaction tests do not cover this separate store.

Required gate: order/coalesce writes per collection, drain or invalidate old generations around reset, and use durable reset/reconciliation semantics across SQL, catalog and files. Move native canonical metadata/jobs into authoritative repositories; SQL transactions alone do not make filesystem/AsyncStorage operations atomic.

### C04 — Download identity conflates independent jobs and assets

**Reproduced.** The transfer manager separates destinations, but `AppContext.tsx:371` and progress/removal operations identify library items only by videoId.

Probe: enqueue video and audio for the same video. Result: **one library record, containing only audio**, while separate destination transfers can exist. Completion/progress from one format can update or replace the other format's record. `isDownloaded` also blocks a second format once any format for the video is complete.

Required gate: independent job/asset IDs, selected output/quality/language identity, generation ownership, and file-specific removal. Test simultaneous audio/video, different qualities, cancellation and restart independently.

### C05 — Native gestures retain the first player instance

**Reproduced against the screen with dependency-faithful player replacement.** `player.tsx:116` stores PanResponder callbacks once; they close over the first nativePlayer, volume and brightness bindings. The installed expo-video hook recreates its player when serialized source changes, and expo-modules-core releases the old object.

Probe: render unresolved source (player 1), render a resolved source (player 2), then perform the volume gesture. Result: **player 1 volume became 0.5; current player 2 remained 1**. On native this can also address an already released object; the exact exception/device behavior was not tested in this audit.

Required gate: stable player ownership or callbacks reading current player/state refs; no use of released players. Test initial source resolution, quality changes and route changes with real gestures.

## High-priority consistency and lifecycle findings

| ID | Finding and evidence | Repair/acceptance requirement |
| --- | --- | --- |
| C06 | **Reproduced:** a persisted download with an ID/title but no status or URI hydrates as `completed`, with no storage error. Existing completed records are not reconciled against actual files. | Validate record states and assets; missing/interrupted media must not appear Ready offline. Implement startup reconciliation and explicit repair/retry. |
| C07 | **Reproduced:** `deleteDownload` swallows final-file deletion errors and resolves successfully. Provider/UI remove the record anyway. | Propagate failure, retain/reconcile asset ownership and report actual deletion outcome. No orphaned private files hidden by successful UI removal. |
| C08 | **Source-confirmed:** transfer ownership/resume information is memory-only. Process death loses the task; a new start deletes old `.part` data. Stored queued/downloading records are not recovered into actual workers. | Durable Android-owned jobs/checkpoints, bounded retries, source refresh, supported restart/resume validation and reconciliation. Background/PiP/download acceptance remains open. |
| C09 | **Source-confirmed:** source changes create a new player; quality switching stores only current seconds, then applies seek/speed on first frame. Prior play/pause intent and volume/mute are not restored as a complete session state. | Snapshot/restore state at the correct ready boundary; verify quality changes while playing and paused, plus failure/rollback. |
| C10 | **Source-confirmed:** Continue Watching preserves history percentage in records but does not initialize playback seek from it. Progress checkpointing uses forward media-time delta, so seeking backward can prevent updates until passing the old checkpoint. | Persist position seconds plus duration, restore intentionally, checkpoint by elapsed wall time/events and flush on pause/background/end. |
| C11 | **Source-confirmed:** iframe/base.js fetches and normalization are outside the new request lifetime helper; metadata requests remain awaited before player resolution returns. Player screen cleanup ignores old results but does not abort the full pipeline. **Reproduced:** two formats sharing a failed player script cause two script requests. | One player-resolution budget/cancellation scope; deduplicated bounded script/session work; separate optional related metadata. Discovery's 20-second limit does not cover this sequence. |
| C12 | **Reproduced:** an operation that finishes after the deadline while synchronous work delays the timer throws RequestTimeoutError, but discover has already cached the result inside the bounded operation. Retry then hits cache: **extractor called once, not twice**. | Stage side effects until the bounded operation succeeds, with a final generation/deadline check before cache/session commits. Explicit asynchronous cancellation is covered by tests; this late-work case is not. |
| C13 | **Reproduced with real SQLite:** a two-record legacy collection containing one malformed record imports one and still journals migration complete. No rejected-row report/quarantine is produced. Active mirror writes reuse legacy keys, so retained keys are not immutable recovery backups. | Preserve an immutable migration snapshot, validate/report rejected rows and provide recovery. Never silently treat a partially imported collection as fully verified. |

## User-visible and missing critical implementations

### C14 — Success feedback is ahead of persistence

**Source-confirmed.** Native provider collections now update after successful writes, but the player still immediately shows Added/Removed playlist feedback and Subscribed/Unsubscribed HUD messages (`player.tsx:409–412,730–736`) before those queued operations finish. Those callers receive no success result. A failed subscription or playlist write can therefore produce success copy while committed state stays unchanged.

Subscription identity also falls back to displayChannel if channelId is unavailable. Display names are not stable YouTube channel IDs and are unsuitable for the planned subscription sync. Use verified identity, return operation outcomes and announce success only after commit. Clear or contextualize stale storage errors after recovery.

### C15 — Google account functionality and claims do not match

**Source-confirmed.** `googleAuth.ts` contains profile/token persistence helpers and a userinfo fetch, not a complete PKCE login/token lifecycle or subscription/playlist read-write synchronization. Raw access-token persistence uses AsyncStorage; no secure credential-store/expiry/refresh/account-operation journal is implemented in this path. This is a blocker before enabling account functionality, not evidence that a live account token was exposed in this session.

Profile UI can display Google Synced/Connected via OAuth 2.0 PKCE based on a saved profile object. It also claims full offline indexing and unthrottled streaming. The implementation does not support those blanket claims. Correct the UI to reflect measured/implemented states; deliver the agreed read/write subscriptions/playlists milestone with proper credential handling separately. Keep anonymous operation available.

### C16 — Required media release gates remain absent

**Source-confirmed.** Paired-track HD, captions selection/rendering, complete live/DVR states, background playback and PiP have not passed their implementation/device gates. The player explicitly sets background activity and media notification false. Audio-only formats are excluded from normal native playback candidates. A video-only fallback is labelled No Audio rather than being paired with its audio track.

`isLiveContent` is used as the Live label, which does not implement distinct live-now/upcoming/archived-stream behavior. A private-file share sheet exists, but export validation, durable public output ownership and actual processing are incomplete. Do not advertise the first required Android media release as complete.

### C17 — Parser and provider contracts still differ

**Source-confirmed.** Browse now recognizes richer cards; search retains its older narrow renderer walk and can return empty for an unknown response. The comments parser has useful new continuation/entity support but limited schema/localization coverage; replies and sorting remain absent. The current direct pagination token API does not define source ownership for a future paginated proxy response. Centralize shared normalized-card contracts where appropriate and explicitly separate unknown schema, valid empty, disabled, restricted and request failures.

Static client profiles still need runtime/provider/session verification. The corrected TV/VisionOS wire identity does not establish successful challenges, current profile versions or playback transport. The unmatched LibreTube screenshot remains insufficient evidence for a shared IP-block diagnosis.

### C18 — Release ordering and recovery are not established

**Source-confirmed.** app.json declares version 1.0.0 without an explicit Android versionCode policy; the inspected generated project uses versionCode 1. No monotonic release ordering/build identity policy is configured. Equal version codes do not inherently prove installation will fail, but they undermine release ordering and rollback/version diagnostics.

Debug/release share com.vyde.android but have different certificates. This expected certificate boundary was disclosed; there is no completed in-app library backup/restore workflow for preserving data during a clean-install transition. Define release versioning and recovery before treating builds as distributable stable releases. Do not uninstall or erase user data automatically.

## Verification flaw: a green benchmark is not playback acceptance

### C19 — CI benchmark can be green at 0/15

**Reproduced.** `benchmark_phase1.mjs` was executed with every player request returning non-OK. It printed **0/15, CRITERIA NOT MET**, made 60 attempts and did not request a nonzero exit. The workflow additionally sets continue-on-error. A success conclusion for this job is therefore not a passed acceptance threshold.

The script duplicates a simplified extractor/configuration instead of exercising production normalization, still has the old VisionOS client ID, counts video-only candidates toward playable, and does not decode video or verify audible audio. Keep it explicitly advisory until replaced. No benchmark percentage should be reported as a native playback success rate.

Required separation: deterministic adapter regressions; live production-resolver diagnostics; transport/media validation; and actual device first frame, sound, seek, comments, download/offline/export outcomes. unavailable/private/region/network cases need separate classifications. Required gates must fail when their criteria fail.

## What remains substantiated

- The original missing-bundle startup failure was fixed and the corrected CI APK launched on the Android 13 mione U1. That remains startup evidence, not S21/media acceptance.
- Shared database initialization, versioned SQL transactions and typed repository errors improve SQLite correctness. They do not solve C03/C13 or all cross-store recovery.
- Direct provider errors are preserved across absent/failing optional proxies. Recent comments and modern browse fixtures cover concrete earlier defects.
- Discovery has actual caller cancellation, body-aware request deadlines, bounded successful-result retention and redacted timing fields. C12 narrows the earlier late-result guarantee.
- Release signing uses a persistent key, private temporary files, Actions secrets and a public certificate pin. Private credentials were not committed. Signature/package/bundle validation is separate from functional readiness. At the last CI check, debug, verification and bundle jobs passed; the release job was still running.

## Implementation order and release evidence

1. **Resolve false-success paths:** C01/C02/C06/C07 and C19. Add reproductions as regressions, implement correct challenge/transport/media validation and meaningful validation gates; retain planned features rather than hiding their buttons as a workaround.
2. **Protect state:** C03/C04/C08/C13. Establish authoritative metadata/assets/jobs, independent identities, ordered commits and recovery snapshots. Verify reset with delayed writes, process death and filesystem failures.
3. **Own playback lifecycle:** C05/C09/C10/C11. Keep player state coherent across resolution, seek, quality, navigation, background and retries. Continue the maintained-engine prototype evaluation from ADR-001 rather than extending brittle regex work indefinitely.
4. **Finish request/parser/UI contracts:** C12/C14/C17. Reject stale work before side effects, propagate operation outcomes, preserve source/session identity and remove unsupported success claims.
5. **Deliver remaining agreed capabilities:** C15/C16/C18 with versioned acceptance records. Account writes, media features, download processing and release recovery must have their own gates.

Minimum stable-release evidence: audible playback and seeking across the agreed corpus; paired HD; captions/live/background/PiP behavior; comments initial/next pages; correct audio/video downloads and exports; offline restart; same-video multi-format ownership; failed/reset/migration recovery; and stable signed updates. Repeat relevant acceptance on the S21 Android 15/One UI 7. A signed test APK may be used for development testing, but this audit does not approve it as a completed stable release.


## Remediation after the audited revision

The findings above describe source `063bbdb`; the following records subsequent changes without replacing that evidence. First remediation spans `661ff6e` through `91e4315` and passes 156 regression cases. CI compilation and physical acceptance of this batch remain pending.

| Finding | Remediation status |
| --- | --- |
| C01 | Unresolved signature/n candidates rejected; HTTPS enforced. Full extractor coverage is still open. |
| C02 | Partial-entity completion checks fixed. Track/container validation and processing remain open. |
| C03 | Per-key write ordering prevents an older queued snapshot overwriting a newer reset. Cross-store crash recovery remains open. |
| C05 | Gestures use the current player and control state. Physical verification pending. |
| C07 | File deletion errors propagate; failed removals retain their library records, including partial reset. |
| C11 | Player-script fetch/parse work is shared per attempt, including failure; later attempts can retry. Complete budget/cancellation remains open. |
| C12 | Cache publication occurs after successful lifetime validation; late synchronous completion regression passes. |
| C19 | Below-threshold probe now exits with failure, requires HLS/progressive candidates and explicitly reports native playback unmeasured. CI remains advisory; production harness/native acceptance remain open. |

C04, C06, C08–C10 and C13–C18 remain open. In particular, this batch does not deliver durable Android jobs, independent multi-format asset ownership, complete migration/reconciliation, account synchronization, native HD processing or the full media acceptance matrix. See [progress batch 13](IMPLEMENTATION_PROGRESS.md#batch-13--first-critical-audit-remediation).

### Follow-up on 25 November

Batch 13's CI later failed mobile compilation, so its changes were not in the owner's last successful release. `4ddfe38` fixes the signature-parameter type. C09 is now partially addressed by `77390a1`: source replacement/quality changes retain position and play/pause intent, reset on video changes, and reject stale or repeated native failures. Physical playback and restart/history restoration remain separate gates. `eb2758c` fixes premature acceptance of partial streams when a later client can provide full playback; C16's paired HD and SABR/media capabilities remain open. See the [new media audit and evidence](MEDIA_REAUDIT_2026-11-25.md).

### Follow-up on 28 November

The 25 November fixes passed full CI and APK production at `4543946`. Batch 15 partially addresses C02/C04: file selection is output-specific, actual audio filename/MIME is preserved, and different output files from one video retain independent records/progress/deletion. This does not establish native container validation, processing, durable job identity, restart recovery or reconciliation. See [download corrections and remaining gates](DOWNLOAD_REMEDIATION_2026-11-28.md).

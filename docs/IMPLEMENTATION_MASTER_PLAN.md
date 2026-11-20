# Vyde implementation master plan

Updated: 2026-11-20 (Africa/Kampala)

Status: implementation started. Phase 00 build work and phase 01 containment are in progress; see [IMPLEMENTATION_PROGRESS.md](IMPLEMENTATION_PROGRESS.md) for commits, checks and remaining gates. No native engine or license change has been selected.

Audit baseline: `3aa29843226feae89fae270b7822333fc08f7166` plus the three preserved local application corrections. See the [fresh systematic re-audit](SYSTEMATIC_REAUDIT_2026-11-20.md) for executed checks, seven reproduced defects, source findings, and limits.

This is the current execution plan. It supersedes sequencing and unresolved product assumptions in [ANDROID_CONTINUATION_PLAN.md](ANDROID_CONTINUATION_PLAN.md). Earlier roadmap/audit documents remain historical context; their completion percentages do not establish acceptance under this plan.

## 1. Product decisions and first-release contract

Vyde will be a fully functional, client-side YouTube alternative. Extraction and download failures are implementation/maintenance work to resolve; do not remove promised functionality as a workaround. Preserve the Expo/React Native interface and product identity.

### Confirmed by the owner

| Decision | Requirement |
| --- | --- |
| First platform | Android; iOS is a later phase |
| Physical acceptance target | Samsung S21, Android 15, One UI 7 |
| Distribution | Sideload/open source/F-Droid; no Google Play Store requirement |
| Reference | LibreTube is the primary media-architecture reference; assess and improve its patterns rather than copying blindly |
| Download experience | Both private offline storage and explicit export of standard media files |
| First delivered Google account milestone | Read/write subscriptions and playlists |
| First Android media release | Reliable video/audio, HD, downloads, background playback, PiP, live streams, and captions |
| Native dependency approach | Evaluate first and document tradeoffs; no native engine or GPL/license change is preselected |

### Release scope and later scope

The first Android release requires the full core above, reliable local library/recovery, and the first account milestone. Anonymous use must remain independent of account setup and a Vyde-hosted backend. Optional official Google sync requires configured credentials and quota.

Google likes/rating writes, SponsorBlock, enhanced chapters, playlist batch downloads, richer local recommendations, and iOS remain explicit later work. Local likes/saves/history remain part of the core library. Later scope is sequencing, not removal because implementation is difficult.

Live playback is required for the first release. Recording an indefinite live stream is a separate later product capability; ordinary finite-video download support is required now. Native/transcoded exports must be labelled accurately. A listed MP3 output requires genuine MP3 encoding, not an extension change.

The owner supplied OS versions; USB-debugging availability, storage budget, and mobile-data budget were not supplied. These are test logistics to confirm when connecting the phone, not blockers to planning or local build work. No device was connected during the audit.

## 2. Execution rules

1. Deliver small vertical slices with evidence: resolve, play/download, persist, restart, and verify on the device.
2. Repair reproduced correctness defects before expanding the UI.
3. Keep the current UI operational while changing one boundary at a time. Avoid a project-wide rewrite.
4. Describe errors by stage and recovery action. Unsupported/unavailable content, network failure, challenge failure, and decoder failure must not collapse into empty success.
5. Prefer maintained open-source components after an explicit comparison. Pin versions and preserve reproducible build provenance.
6. Keep optional account, browser-helper, artwork, comments, and recommendation failures outside the core native media critical path.
7. Protect existing user data. Test schema changes and recovery before calling migrations complete.
8. No phase is complete merely because source files exist or a benchmark returned a URL. Keep evidence for each exit gate.

## 3. Reference strategy: adopt, improve, and avoid

| Reference pattern | Adopt in Vyde | Deliberate improvement/decision |
| --- | --- | --- |
| LibreTube media repository | Normalize site data behind stable contracts | Keep provider-specific payloads out of UI and support fixture-driven adapter replacement |
| LibreTube service-owned playback | Playback survives route changes | One player controller for online/offline/audio modes; preserve state across transport changes |
| LibreTube separate-track and transport support | Handle DASH/HLS/SABR deliberately | Select by actual capability and failure classification, not an unconditional copied ordering; test live separately |
| LibreTube download providers | Separate transfer protocols from task/UI state | Validate resumed ranges, entity identity, expiry and final assets before completion |
| LibreTube cached local feed | Bound subscription refresh and cache metadata | Make refresh progress/cancellation explicit and prevent optional metadata delaying essential transfers |
| LibreTube implementation details | Learn from source | Prefer supported Media3 APIs; isolate private/reflection-dependent workarounds and test upgrades |
| SnapTube staged downloads | Separate resolving, transfer, processing, and finalization | Use a documented recoverable state machine with honest progress and independently validated output |
| SnapTube native processing | Offer real conversion/combination when output requires it | Select maintained/open-source processing components; avoid proprietary binaries/private endpoints |
| SnapTube range-download implementation | Resume portions of a resource | Start with conservative concurrency; prove benefit before parallel range workers |

Concrete LibreTube observations and their evidence limits are in the re-audit. In particular, its inspected raw provider does not validate returned range offsets in that method, optional metadata work is awaited during setup, and subtitle handling contains a private-API reflection path. These are reasons for stricter Vyde contracts, not claims that LibreTube is generally unreliable.

## 4. Target component ownership

Proposed locations below are implementation targets, not existing modules.

| Boundary | Proposed home | Owns |
| --- | --- | --- |
| Domain contracts | `artifacts/vyde/domain/` | Media plans, capability/error types, job identities, library/account models |
| Discovery | `services/discovery/` | Search, channels, playlists, comments, paging and local feed |
| Resolution | `services/media/` | Extractor adapters, source freshness, transport/track selection |
| Playback | `services/playback/` | Long-lived controller, queue, native adapter, progress and media session |
| Downloads | `services/download/` | Job coordinator, durable state, transport providers and recovery |
| Processing/export | `services/media-processing/` | Mux/remux/transcode, validation, shared-storage export |
| Persistence | `services/db/` | Schema, migrations and transactional repositories |
| Account bridge | `services/auth/` and `services/sync/` | Secure auth, remote mappings, operation journal and reconciliation |
| Android modules if selected | A local Expo module/native package | Native media/service functions behind a narrow typed interface |

React screens issue commands and subscribe to state. They do not own downloads, credentials, player lifetime, or migration side effects. Keep AppContext small; split library, player and download subscriptions to avoid application-wide rerenders on every progress update.

### Required contracts

- `MediaPlan`: content identity, provider/version, live/VOD, duration, selected tracks, transport, MIME/container/codecs, itags/format IDs where relevant, required headers, expiry, and refresh recipe. Token material remains internal and redacted.
- `PlaybackSession`: current item/queue, selected quality/audio/captions, position, play/pause, speed, recovery attempt and structured error. Source change preserves intended session state.
- `DownloadJob`: job UUID, video/format/output identity, account-independent media source identity, destination, stage, generation, resume checkpoints, byte counts, errors, and timestamps.
- `OfflineAsset`: playable component files, metadata/artwork/captions, validated properties, availability and ownership. It can differ from a single exported file.
- `ExportArtifact`: output URI, codec/container, validation result, provenance and relationship to source asset. Removing a private asset must not silently delete an independently exported file.
- `SyncOperation`: account/channel identity, entity mapping, desired operation, dependencies, retry state, reconciliation result and conflict status.

## 5. Phase map and dependencies

| Phase | Result | Requires | Status |
| --- | --- | --- | --- |
| 00 | Reproducible build and truthful baseline | Current audit | In progress; local checks pass, APK/device gate pending |
| 01 | Containment of reproduced correctness defects | 00 | Implemented regression fixes; native/restart acceptance pending |
| 02 | Extractor/player/processing/auth feasibility decisions | 00; can investigate during 01 | Planned |
| 03 | Reliable local data and job foundations | 01 | Planned |
| 04 | Maintainable media resolver and transport support | 02 | Planned |
| 05 | Complete Android playback, live and captions | 03/04 | Planned |
| 06 | Durable download transfer engine | 03/04 | Planned |
| 07 | Processing, validated offline assets and export | 05/06; processing decision from 02 | Planned |
| 08 | Complete discovery, subscriptions feed and library UX | 03/04 | Planned |
| 09 | Google read/write subscriptions and playlists | 02 auth proof and 03 | Planned |
| 10 | First Android release and distribution | 05–09 and release gates | Planned |
| 11 | Expanded capabilities and ongoing extractor operations | Stable Android core | Planned |
| 12 | iOS adapter and acceptance programme | Android stability plus iOS access | Planned |

Verification and maintenance span every phase. Dependencies describe logical prerequisites, not a promise of multiple implementers or calendar estimates.

## 6. Phase 00 — Build and evidence baseline

**Problem:** committed JSX and current type errors prevent trusting the build; CI/docs overstate readiness.

**Work packages**

- P00.1 Preserve/review the three local corrections, fix the two invalid filesystem options, and make the application type-clean.
- P00.2 Pin package-manager/toolchain versions; document clean pnpm setup and frozen-lockfile installation. Remove contradictory npm/Replit-only assumptions from normal setup.
- P00.3 Repair native/web import boundaries and make browser-preview checks explicit without coupling native architecture to a hosted proxy.
- P00.4 Reproduce a custom Android development build with correct application ID/version configuration; inspect generated native permissions/config.
- P00.5 Establish a verification ledger identifying commit, dependency lock, device/OS, corpus, commands and results. Replace unverified completion claims in active docs/metadata with measured status.

**Exit gate:** clean checkout passes application/API checks, documented preview checks, and builds an APK that launches on the S21. Preserve an installation/build log. Do not upgrade Expo merely to hide the current defects.

## 7. Phase 01 — Immediate correctness and data-loss containment

**Problem:** R01–R07 are reproduced defects affecting usable sources, completion and readiness.

**Work packages**

- P01.1 Move valid direct-URL handling ahead of unnecessary decipher initialization; correct missing signature operations and remove `cver` player-ID interpretation.
- P01.2 Continue fallback after candidate normalization failure; zero usable candidates is an explicit failure at that stage.
- P01.3 Reject unsuccessful transfer results and arbitrary existing partial files. Keep incomplete media separate from verified assets.
- P01.4 Establish shared database initialization readiness and propagate initialization/migration errors.
- P01.5 Prevent failed hydration from writing empty mirrors; coordinate cancellation/removal so late callbacks cannot recreate deleted downloads.
- P01.6 Convert the seven audit fixtures into durable production-path regression tests. Add deletion-during-completion and hydration-failure scenarios.

**Exit gate:** all seven cases now produce the expected result; failure injection shows no false completed download, premature DB readiness, or silent overwrite. Existing library records survive restart.

**Boundary:** these are tactical repairs. Do not invest in a new bespoke decipher framework before phase 02 decides the maintained extractor path.

## 8. Phase 02 — Architecture decisions supported by a vertical prototype

**Problem:** neither the present JavaScript extractor nor a native replacement should be adopted on assumption.

### Decisions to record

| Decision record | Candidates and tradeoffs | Required experiment |
| --- | --- | --- |
| ADR-01 Extractor | Repair current JS; evaluate maintained JS engines; evaluate maintained NewPipe-derived Android extractor. Compare transport/challenge coverage, Hermes integration, footprint, update burden, license and future iOS cost | Same representative corpus; produce actual playable sources on S21 |
| ADR-02 Player | Existing configured `expo-video` versus a narrow native Media3 integration where capabilities require it | Separate tracks, background/PiP, live, captions, source recovery and queue continuity |
| ADR-03 Download transport | Existing Expo sessions versus native transport/service adapters; Media3 offline caches versus ordinary files | Pause/restart, expired source, safe ranges, media export compatibility |
| ADR-04 Processing | Android muxing APIs for compatible tracks; maintained transcoding/muxing components or owned reproducible FFmpeg build for required formats | Correct MP4 A/V and genuine MP3; measure duration, battery, temp-space and ABI/build cost |
| ADR-05 Auth | Supported Android Google authorization approach with writable scopes and release-signing identities | Real consent, credential expiry/refresh, and one subscription/playlist read/write round trip |

The original FFmpegKit repository is archived. Do not select it by familiar package name. Muxing and transcoding have different costs: copy compatible encoded tracks when possible; encode only when the requested output requires it. An upscaled bitrate does not recover source quality.

**Deliverables:** decision records with tested versions, license/distribution implications, measured results, rejected options and reasons, ownership/upgrade plan, and an architecture recommendation. The owner requested evaluation first; this phase does not pre-authorize a particular engine or license change.

**Exit gate:** one end-to-end native prototype resolves/plays a separate-track video, produces validated offline/export output, and proves the intended account flow. Any missing required transport has an explicit implementation work package. Do not declare feasibility merely because a package installs.

## 9. Phase 03 — Transactional data and recovery foundation

**Work packages**

- P03.1 Introduce versioned migrations, one initialization promise, transaction boundaries, foreign-key checks, typed repositories and actionable error handling.
- P03.2 Make SQLite authoritative for native library/catalog/jobs. Migrate legacy AsyncStorage safely; retain migration backup until verification succeeds. Separate settings from relational records.
- P03.3 Model video metadata, subscriptions, watch positions in seconds plus duration, playlist entries with independent IDs/order, jobs, component assets, exported artifacts, and account mappings.
- P03.4 Allow duplicate playlist entries where remote identity requires them. Do not key a playlist item solely by video ID.
- P03.5 Add job generations/tombstones for cancellation races and account-scoped operation journals for later sync. Do not store access tokens in ordinary relational/AsyncStorage records.
- P03.6 Implement backup/restore and explicit reset semantics: library-only, private downloads, account credentials, and user-exported files have distinct lifecycles.

**Verification:** populated legacy data, malformed records, partial migration, DB write failure, concurrent initialization, duplicate playlist entries, disk/database mismatch, restart, restore and rollback behavior.

**Exit gate:** interrupted migration/write does not silently lose data; actual disk assets and records reconcile; failing storage never masquerades as an empty successful library.

## 10. Phase 04 — Resolver, challenges and transport adapters

**Work packages**

- P04.1 Implement ADR-01 behind `MediaPlan`; preserve headers, codec/container, stream identity, track language, expiry and refresh capability.
- P04.2 Support required challenge mechanisms and validate success; visitor data, signatures, `n`, and proof tokens are distinct concerns.
- P04.3 Build capability-based HLS/DASH/progressive/SABR selection. Live/VOD need separate decisions; do not transplant LibreTube's priority ordering blindly.
- P04.4 Use single-flight acquisition, bounded cache lifetimes, cancellation, total deadlines and backoff. A failed script fetch must not repeat sequentially for every format.
- P04.5 Retry another client/transport after unusable output; retain genuine unavailable/restricted-content reasons. No false success with an empty candidate list.
- P04.6 Keep optional metadata outside readiness. Refresh signed sources safely and preserve identity when playback/download recovery requests replacement URLs.
- P04.7 Test the actual production resolver; remove duplicate benchmark logic as the source of correctness claims.

**Exit gate:** representative VOD/live/audio/HD inputs resolve through the actual adapter; expired-source and challenge failures recover or return accurate actionable errors. S21 playback evidence validates sources beyond URL existence.

## 11. Phase 05 — Android playback, live streams and captions

**Work packages**

- P05.1 Implement long-lived playback ownership outside the route, with a typed command/event bridge and one session model for online/offline/audio.
- P05.2 Integrate synchronized separate tracks, supported adaptive transports, audio selection, decoder compatibility and quality changes.
- P05.3 Enable/test background/PiP, notification/lock-screen controls, audio focus, headset removal, Bluetooth and call interruptions. Use existing Expo support where sufficient.
- P05.4 Restore watch position; flush progress on pause/background/exit. Preserve paused state, speed, position and captions across quality/fallback changes. Fix backward-seek bookkeeping and stale gesture callbacks.
- P05.5 Finish fullscreen/orientation, gesture sizing, accessibility, mini-player/queue and consistent error/retry controls.
- P05.6 Implement live startup/reconnection, live-edge behavior, duration/seek-window handling and caption selection. Do not apply finite-duration progress math to live sessions.
- P05.7 Support caption language selection and downloaded captions for supported offline assets. Distinguish unavailable captions from load/parse errors.

**Exit gate:** required playback modes work on the S21 on Android 15/One UI 7, including live/captions and navigation/lock/PiP interruptions. Source switches retain session intent. Device logs and the corpus ledger show first frame, audible output, seeking and continuity.

## 12. Phase 06 — Durable transfer engine inspired by SnapTube's separation of concerns

**Work packages**

- P06.1 Use unique job/output identities; permit audio and video jobs for one video without overwriting each other. Persist selected format, destination, stage and checkpoints before starting work.
- P06.2 Introduce one coordinator independent of React lifetime, plus protocol providers for ordinary resources and required segmented transports. Maintain handles across UI navigation.
- P06.3 Write partial assets; validate HTTP status, content identity, lengths where available, and returned range offsets. Resuming generally requires a matching `206`/`Content-Range`; handle ignored ranges, `416`, changed validators and unknown lengths explicitly. Never append an entire `200` response to an existing partial file.
- P06.4 Preserve required headers. Re-resolve expired sources and compare media identity before resuming; restart safely if bytes no longer describe the same asset.
- P06.5 Implement pause/resume/cancel/retry, connectivity-aware scheduling, bounded concurrency, backoff and safe storage-space checks. Parallel range workers are a later measured optimization, not a baseline requirement.
- P06.6 Persist generations and cancellation state so late callbacks cannot recreate deleted jobs or finalize stale work. Reconcile abandoned partial files and records after restart.
- P06.7 Integrate notifications and appropriate Android execution mechanisms. Respect OS start/time limits and checkpoint before stopping. No Play Store requirement does not remove Android 15 behavior.

**Conceptual states:** queued → resolving → downloading → processing → validating → completed. Recoverable states include paused, waiting-for-network, needs-source-refresh, failed and cancelled. Persist the stage separately from byte progress; transfer reaching 100% is not final completion.

**Verification:** range honored/ignored/misaligned, changed ETag, missing content length, HTTP 403/404/429/5xx, HTML error body, network change, process death, reboot, low disk, concurrent jobs, cancellation at every transition and deletion racing completion.

**Exit gate:** jobs recover after app restart without false completion or corrupt appends. Failed tasks retain recoverable context; terminal errors explain the failed stage. Ordinary backgrounding, process death and force-stop are measured separately.

## 13. Phase 07 — Processing, private offline assets and standard export

**Work packages**

- P07.1 Implement the evaluated processing path for compatible remuxing, separate-track combination and real audio conversion. Prefer original M4A/Opus when requested; encode genuine MP3 only for an MP3 output.
- P07.2 Preserve correct extensions/MIME/container and expose resolution, codec and source bitrate honestly. Do not infer MP4 or M4A solely from a coarse media-type label.
- P07.3 Schedule CPU-intensive processing independently of network transfers, with progress/cancellation, conservative concurrency, temp-space accounting and restart policy.
- P07.4 Validate completed output for readable container, required tracks, duration and playback. Finalize private files via safe rename; use provider-appropriate pending/finalized publication for shared storage. DB/file operations need reconciliation because they are not a single filesystem/database transaction.
- P07.5 Store metadata/artwork/captions needed for network-independent offline playback. A private segmented/paired asset may differ from its exported single-file artifact.
- P07.6 Add explicit export to MediaStore/storage-access destinations and sharing. Respect content URIs, destination failure, name collisions, cancellation, removable storage, and permission changes.
- P07.7 Define deletion semantics in the UI: deleting a private download, its job, or an exported copy are distinct actions. Recover cleanly if users remove exports externally.

**Verification:** actual codec/track/container inspection, MP3 output, complete A/V from separate streams, long-file seek/sync, offline restart, cancelled conversion, full disk, interrupted export, duplicate names and externally deleted files.

**Exit gate:** private offline playback works in airplane mode after restart; exported files open in independent players with the promised media properties. Neither transfer completion nor file existence alone satisfies this gate.

## 14. Phase 08 — Discovery, local feed and library completeness

**Work packages**

- P08.1 Normalize search/browse responses, filters and continuation. Support cancellation, stale-response protection and paging without duplicates.
- P08.2 Implement channel/detail and playlist routes, subscription refresh, and a cached local subscription feed with bounded concurrency and visible refresh state.
- P08.3 Complete comment pagination/error distinctions, related content, region/language handling and inbound YouTube links.
- P08.4 Complete playlist rename/reorder/remove, offline search/filter/sort, download actions and consistent empty/loading/failure states.
- P08.5 Ensure cached metadata/artwork are useful offline; source failures must not erase local library information.
- P08.6 Audit accessibility labels, large text, touch targets, gesture alternatives and screen-reader navigation while retaining Vyde's visual identity.

**Exit gate:** a user can discover a channel, subscribe locally, refresh its feed, organize videos, download/export and return offline without placeholder interactions or hidden network requirements.

## 15. Phase 09 — First Google account milestone: subscriptions and playlists, read/write

**Scope:** subscriptions and playlists. Google rating/like writes follow in phase 11. Core media remains anonymous and independent.

**Work packages**

- P09.1 Complete supported authorization proven in phase 02, credential protection, scope selection, expiry/refresh, cancellation, revocation and disconnect. Validate release signing/client configuration for each supported distribution identity.
- P09.2 Paginate remote subscriptions/playlists/items; distinguish Google user identity from selected YouTube channel identity.
- P09.3 Implement subscription insert/delete and supported playlist create/rename/delete/item insert/remove/reorder operations. Local-only state remains clearly identifiable.
- P09.4 Persist remote item IDs, duplicates/order and dependencies in a sync journal. Reconcile unknown write results before retrying operations that could duplicate entries.
- P09.5 Coalesce repeated desired-state changes; apply backoff/quota handling and explain waiting/conflicts. Account switching cannot replay operations into another account.
- P09.6 Provide explicit link/import/merge choices for existing local data, sync status/retry controls, conflict handling and disconnect semantics. Do not silently upload all historical local records or delete remote content on disconnect.
- P09.7 Keep history/saves local. Official Watch History/Watch Later retrieval is unavailable through the ordinary API; a named-playlist mapping is a later explicit option, not a claimed equivalent.

**Verification:** consent denied, expired/revoked tokens, quota, interrupted writes with uncertain outcome, duplicate remote entries, edits on another client, reordered items, deleted remote resources, offline writes, switching accounts and disconnect.

**Exit gate:** first delivered account functionality reads and writes subscriptions/playlists end to end, survives interruption, and preserves local data. A saved profile or successful login alone is not the milestone.

## 16. Phase 10 — Android release qualification and distribution

**Work packages**

- P10.1 Gate deterministic regressions, migrations, state-machine tests and native integration checks in CI. Live-network diagnostics are separate, run through production adapters, and never silently substitute for native acceptance.
- P10.2 Use immutable release tags, frozen dependencies, reproducible build instructions, signing ownership, version codes and real tag triggers. Keep keys outside source.
- P10.3 Produce and test release APKs, not only debug artifacts. Verify upgrade from the previous build without data loss and backup restoration to a clean installation.
- P10.4 Validate F-Droid generation/build recipe from a clean source revision, dependencies and actual artifact. Resolve mutable `main` and generated-subdirectory assumptions. Provide an actual repository URL only when a repository exists.
- P10.5 Document sideload/F-Droid signing identities and update compatibility. A differently signed build cannot be treated as an ordinary in-place update; account client IDs/signatures also require verification.
- P10.6 Reconcile README, roadmap, architecture, metadata and troubleshooting with measured behavior. Include open-source notices and source/build provenance for selected native components.
- P10.7 Run the complete S21 matrix under normal settings and investigate failures before asking users to change Samsung battery settings.

**Release gate:** all required core scenarios pass; unresolved first-release defects are resolved rather than hidden by feature removal. Publish measured coverage and known content restrictions accurately. Do not claim a native playback percentage from extraction-only tests.

## 17. Phase 11 — Expanded features and ongoing operation

After the stable Android core: Google ratings/likes writes, explicit saved-to-named-playlist mapping, SponsorBlock integration, chapters, batch/playlist download selection, richer queue controls, and local recommendations with transparent controls. Reuse the same job/sync/data contracts.

Maintain extractor fixtures, dependency compatibility tests, reproducible incident cases, release notes and an update procedure. Keep diagnostics local/exportable by user choice and redact tokens, cookies, signed URLs and identifying details. A provider regression should lead to a repair and regression case, not a permanent feature shutdown.

Evaluate data/battery/storage cost before concurrency or speculative caching changes. Treat remote executable updates as a separate architecture decision; open-source reproducible app releases are the initial maintenance path.

**Exit gates:** each expansion has its own functional/offline/recovery checks and does not regress the first-release contract. This phase continues as maintenance rather than having a fictional final completion date.

## 18. Phase 12 — iOS implementation and acceptance

Retain domain contracts and UI where portable; evaluate iOS extraction, media, background transfers, conversion/export and account adapters with actual platform tooling. An Android Kotlin module does not automatically provide an iOS engine. Secure Mac/build/signing access and a physical iPhone before scheduling acceptance.

**Exit gate:** repeat the relevant playback/download/offline/account matrix on iOS, document platform lifecycle differences, and provide a tested distribution route. iOS does not block the Android release.

## 19. Evidence required across phases

| Test layer | Evidence |
| --- | --- |
| Deterministic fixtures | Seven re-audit cases plus exact recovery/failure scenarios; production code paths |
| Local HTTP server | Range/content/status/expiry simulations without depending on live YouTube |
| Database tests | Seeded legacy migrations, rollback/recovery, account and playlist identity |
| Media inspection | Required tracks/codecs/container/duration; independent-player offline/export checks |
| Native Android | Lifecycle, media session, focus, PiP, captions, live and download recovery |
| Live corpus | Fixed IDs/categories plus replacement policy for removed/private content; no cherry-picked denominator |
| Release | Clean build, signing, install/upgrade/restore and packaging logs |

Create a versioned corpus of roughly 30–50 representative videos as a planning starting point: ordinary VOD, separate-track HD, long-form, audio, live, captioned content, and genuinely unavailable/restricted cases. Record restrictions separately from supported-content failures. The sample size is a proposed test design, not a current pass-rate claim.

Measure resolution time, first frame/audible playback, rebuffering, seek/quality switching, transfer and processing duration, bytes, temp storage, recovery, and battery impact. Establish performance budgets after the first S21 baseline; do not invent speed/quality guarantees before measurement.

Required user journeys include: anonymous install/use; subscribe and refresh; HD playback with sound; background/PiP; live with captions; private download; MP3/video export; offline restart; interrupted transfer/processing; playlist sync and conflicting remote edits; upgrade with existing library.

## 20. First implementation changes, in reviewable order

1. Build corrections and preserved local edits; freeze the baseline commands.
2. Regression fixtures and tactical resolver corrections for R01/R02/R03/R06.
3. Download completion integrity for R04/R05 plus cancellation generations.
4. Initialization/hydration containment for R07/A06.
5. Small S21 verification build and phase-02 prototypes/decision records.
6. Schema/repository migration foundation, followed by selected resolver/player/download integrations.

For every change record: problem, resulting behavior, affected audit IDs, validation and remaining limitation. Update phase status only with evidence. Do not bundle all architecture changes into one large PR.

## 21. Reference documents and primary sources

- [Fresh systematic re-audit](SYSTEMATIC_REAUDIT_2026-11-20.md).
- [SnapTube investigation and APK fingerprint](SNAPTUBE_DOWNLOAD_INVESTIGATION.md).
- [Previous continuation plan](ANDROID_CONTINUATION_PLAN.md).
- [LibreTube repository adapter](https://github.com/libre-tube/LibreTube/blob/master/app/src/main/java/com/github/libretube/api/NewPipeMediaServiceRepository.kt).
- [LibreTube player service](https://github.com/libre-tube/LibreTube/blob/master/app/src/main/java/com/github/libretube/services/OnlinePlayerService.kt).
- [LibreTube download service](https://github.com/libre-tube/LibreTube/blob/master/app/src/main/java/com/github/libretube/services/DownloadService.kt).
- [LibreTube raw download provider](https://github.com/libre-tube/LibreTube/blob/master/app/src/main/java/com/github/libretube/repo/RawByteStreamDownloadProvider.kt).
- [Media3 offline downloads](https://developer.android.com/media/media3/exoplayer/downloading-media).
- [Android foreground-service timeouts](https://developer.android.com/develop/background-work/services/fgs/timeout).
- [Shared media storage](https://developer.android.com/training/data-storage/shared/media).
- [MediaMuxer](https://developer.android.com/reference/android/media/MediaMuxer).
- [Original FFmpegKit repository status](https://github.com/arthenica/ffmpeg-kit).
- [Google native-app authorization](https://developers.google.com/identity/protocols/oauth2/native-app).
- [Playlist-item retrieval restrictions](https://developers.google.com/youtube/v3/docs/playlistItems/list).
- [Playlist-item writes](https://developers.google.com/youtube/v3/docs/playlistItems/insert).
- [Subscription writes](https://developers.google.com/youtube/v3/docs/subscriptions/insert).

External branch links are date-stamped research references and may change. Pin actual dependency/source revisions in phase 02 decision records before implementation reuse.

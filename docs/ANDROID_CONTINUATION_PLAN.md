# Vyde: verified audit and Android continuation plan

> Execution has been reorganized into [IMPLEMENTATION_MASTER_PLAN.md](IMPLEMENTATION_MASTER_PLAN.md), with a [fresh systematic re-audit](SYSTEMATIC_REAUDIT_2026-11-20.md). Use those documents for current phase sequencing and the owner's latest release requirements; this document preserves the preceding audit and plan.

Date: 2026-11-20 (Africa/Kampala)

## 1. Agreed product direction

Vyde is intended to be a fully functional, client-side YouTube alternative. When extraction, playback, or downloads break, repair the implementation rather than removing the feature to bypass the blocker. Preserve Vyde's Expo interface and visual identity.

- First release: Android, with the owner's Samsung S21 as the first physical acceptance device.
- iOS remains a future target and does not block the Android release. This supersedes the earlier Android-and-iOS-together preference.
- Distribution: sideloading, F-Droid, and open source; no Google Play Store compliance constraint.
- Core anonymous discovery, playback, downloads, and local library should operate without a Vyde-hosted backend or Google login.
- The first delivered Google account milestone must support reads and writes, rather than stopping at read-only import.
- Study LibreTube's architecture and behavior while preserving Vyde's UI.

This document records findings and proposed implementation. It does not claim the milestones below have been completed.

## 2. Audit baseline and evidence limits

The audit examined Vyde commit `3aa29843226feae89fae270b7822333fc08f7166` and the working tree. Three pre-existing local changes were present and preserved:

1. A JSX correction in `artifacts/vyde/app/(tabs)/library.tsx`.
2. An offline-candidate type correction in `artifacts/vyde/app/player.tsx`.
3. The legacy filesystem import in `artifacts/vyde/services/download/downloadManager.ts`.

No application source was changed during the audit. The checks below describe the audited state, not future results after implementation.

| Check | Observed result | Interpretation |
| --- | --- | --- |
| Application typecheck | Two TS2353 errors for `{ size: true }` filesystem options | Working tree is not type-clean |
| API typecheck and build | Pass | Server build passes; this does not prove mobile behavior |
| Web export | Cannot resolve Expo SQLite's `wa-sqlite.wasm` dependency | Platform branching does not adequately isolate bundler imports |
| Committed library JSX | Syntax errors | Committed source still needs the existing local correction |
| Working-tree library JSX | Parses successfully | Local correction addresses that parsing defect |
| Targeted production-code fixtures | Seven defects reproduced | Executable evidence described below |
| S21 playback, backgrounding, offline use, and account sync | Not performed | Device reliability remains unmeasured |

### Reproduced defects

1. A direct media URL can be discarded if decipher initialization fails, even though that URL does not need signature deciphering.
2. Signature parsing misses a common no-argument reverse operation. A fixture expected `edcba` and produced `bcdef`.
3. A client version from `cver` can be interpreted as a player-script identifier.
4. The extraction cascade can stop after a nominally successful client response normalizes to zero usable candidates. A later client with a usable source is never attempted.
5. Any existing target download file can be treated as complete, including a partial file.
6. A download response with HTTP 403 can reach the completion callback. The installed Android filesystem implementation can resolve with the response status and downloaded response body, so callers must validate it.
7. A concurrent database caller can receive the database before initialization/migration finishes because readiness is published too early.

These fixtures demonstrate local control-flow and data-integrity failures. They do not measure live YouTube coverage or native decoding success.

### Corrections to earlier conclusions

- Expo's installed legacy filesystem implementation already provides native background sessions. The missing guarantees are durable job tracking, recovery, cancellation, validation, and device verification. Absence of a separate background-task package is not evidence that every transfer stops on backgrounding.
- The installed `expo-video` configuration plugin supports background playback and PiP. Vyde has not fully enabled/integrated them. Test these capabilities before selecting a replacement player engine.
- Extraction benchmark results are not native playback pass rates. The benchmark also needs to exercise production resolution logic and fail CI appropriately where intended.
- Current LibreTube should not be described simply as a Piped-only client. Its inspected source includes local NewPipe-based extraction and explicit modern media transport handling.

## 3. Architecture: Vyde, LibreTube, and Tubular

The fundamental difference is ownership of media work and the amount of mature media infrastructure already behind the UI. React Native does not prevent native media services: Vyde can retain its interface while moving selected responsibilities behind native modules.

| Area | Vyde at audit | Current LibreTube source inspected | Original Tubular repository inspected |
| --- | --- | --- | --- |
| Application/UI | Expo SDK 54, React Native, TypeScript, Expo Router | Kotlin native Android application | Native Android NewPipe fork, Java/Kotlin and Android views |
| Extraction | Custom TypeScript InnerTube clients, parsing and decipher logic | Local NewPipe-based media repository using a LibreTube extractor fork | NewPipe-derived architecture, dependency on `com.github.polymorphicshade:TubularExtractor` |
| Playback integration | `expo-video`; substantial orchestration owned by player screen | Native service with Media3 and explicit SABR/DASH/HLS paths | Native `PlayerService` extending `MediaBrowserServiceCompat`, with ExoPlayer integration |
| Media model | Source candidate lacks a complete transport/track/expiry contract | Explicit handling of separate streams and transport-specific sources | NewPipe extractor stream models consumed by native player infrastructure |
| Downloads | Expo filesystem transfers; active jobs primarily tracked in memory | Native download service, database records, transport-specific providers | Native download-manager service and download missions, including post-processing hooks |
| Local persistence | Expo SQLite plus AsyncStorage mirrors and handwritten initialization | Database-backed repositories for local features | Room database and inherited NewPipe data architecture |
| Account direction | Google profile/token helpers; full read/write sync still to implement | Local and optional remote account repositories; not a Google-sync template | Primarily account-free NewPipe model; not a Google read/write-sync template |
| Backend requirement | Native direct path intended; separate Express helper exists for browser use | Inspected local extraction path does not require a Vyde-style hosted extraction server | On-device extraction; no application extraction server required |
| Platform consequence | UI can remain portable; native media modules need platform adapters | Android-specific implementation | Android-specific implementation |
| Maintenance consequence | Vyde currently owns substantial YouTube parser maintenance | Extractor fork plus app-specific media integration maintenance | Original repository is discontinued and archived; unsuitable as a new maintenance dependency without a successor decision |

Tubular is a NewPipe fork with SponsorBlock and ReturnYouTubeDislike additions. Its dependency manifest pins an extractor fork and the older `com.google.android.exoplayer2` family. LibreTube's inspected implementation uses Media3 and explicit SABR support. This is a source-level difference, not a claim that every video works in one application or fails in another.

The original Tubular repository was archived on July 7, 2026 and announces discontinuation. This statement concerns `polymorphicshade/Tubular`; other forks must be assessed separately.

### What this means for Vyde

1. Preserve the Expo UI. A wholesale UI rewrite is not justified by the current evidence.
2. Move playback ownership out of the route screen so navigation does not own its lifetime.
3. Put extraction behind a stable interface. Compare repairing the JavaScript extractor with using a maintained native Android extractor through an Expo module.
4. Treat SABR, DASH, HLS, separate tracks, token challenges, and source expiry as explicit engineering work.
5. Give downloads persistent identities, state transitions, recovery, and validated completion.
6. Keep Google synchronization independent of anonymous media playback.
7. Study architecture and behavior first. Any source reuse must respect the source project's license; do not silently transplant GPL code into an incompatible licensing arrangement.

### Proposed component boundaries

| Component | Responsibility |
| --- | --- |
| Discovery repository | Search, channels, playlists, comments, continuation, normalized metadata |
| Playback resolver | Video ID to validated alternatives with transport, tracks, codecs, MIME/container, headers, and expiry |
| Playback controller | Playback lifetime, queue, position, source changes, background state, media controls |
| Download coordinator | Persistent jobs, concurrency, cancellation, retries, recovery, integrity, finalization |
| Library repository | Authoritative local data, transactions, migrations, metadata, backup/restore |
| Account bridge | Authentication, remote mappings, queued operations, reconciliation, account isolation |

Introduce these incrementally around existing behavior. Native modules should solve demonstrated gaps rather than being an automatic replacement for every Expo capability.

## 4. Milestone 0 — Reproducible Android baseline

### Work

- Preserve and incorporate the three existing local fixes.
- Fix the remaining filesystem type errors.
- Establish a documented pnpm installation/build path with a frozen lockfile.
- Verify Android identity, versioning, permissions, and development-build configuration.
- Separate platform storage imports so browser bundling does not interfere with Android work.
- Make CI run application typechecking and meaningful regression coverage.
- Correct setup instructions and feature claims that disagree with the implementation.

### Acceptance

A clean checkout produces an installable development APK, opens on the S21, and passes the same checks locally and in CI.

## 5. Milestone 1 — Extractor and transport decision

Run a bounded investigation of the repaired JavaScript extractor, a maintained native Android extractor behind an Expo module, and the player capabilities required by their actual output.

### Work

- Evaluate ordinary and long videos, separate tracks, live streams, unavailable responses, source expiry, and current challenges.
- Verify signature and `n` transformations, player-script discovery/caching, proof-token lifecycle, DASH/HLS, and SABR requirements.
- Distinguish visitor data from proof tokens; one is not a substitute for the other.
- Record maintenance, licensing, integration, cancellation, and upgrade implications.
- In parallel, prove a supported Android Google authentication flow with the required write scopes before committing to a full account implementation.

### Acceptance

A written engine decision supported by S21 results, including audible playback and seeking. Returning a URL alone is insufficient. Record remaining unsupported cases with concrete implementation work rather than removing promised features.

## 6. Milestone 2 — Reliable resolution and fallback

### Work

- Preserve direct URLs when deciphering is unnecessary.
- Fix signature operations and player identification.
- Continue the client cascade after normalization yields no usable sources.
- Return typed failures rather than empty successful results.
- Add cancellation, bounded timeouts, retry budgets, deduplication, and backoff.
- Cache visitor data and player scripts appropriately, including short-lived failure caching.
- Preserve source headers, container/codec information, transport, track pairing, and expiry.
- Re-resolve expired sources during recovery.
- Load related content/comments independently of essential playback resolution.
- Consolidate conflicting client definitions in mobile/server paths.

### Acceptance

Regression tests cover the reproduced extraction failures. Diagnostics distinguish extraction, challenge, transport, decoding, and genuine content unavailability.

## 7. Milestone 3 — Dependable local persistence

### Work

- Use one shared initialization promise and publish readiness only after completion.
- Add versioned, transactional migrations and verify foreign-key enforcement.
- Establish SQLite as the authoritative native library store and remove ambiguous dual writes.
- Preserve metadata for liked, saved, downloaded, and playlist items.
- Model ordering explicitly rather than relying on timestamp positions.
- Return storage errors and reconcile optimistic UI updates.
- Prevent failed hydration from persisting empty state over existing data.
- Add backup/export and restore before major schema changes.
- Prepare account-scoped remote mappings, synchronization records, and deletion markers.

### Acceptance

Restarts, interrupted writes, and migration failures do not silently lose library data.

## 8. Milestone 4 — Android playback lifecycle

### Work

- Move playback ownership out of the route screen into a persistent controller/service.
- Support synchronized audio/video when formats require separate tracks.
- Enable and test existing Expo background/PiP support before replacing infrastructure.
- Integrate notification and lock-screen controls.
- Handle audio focus, calls, headphone removal, and Bluetooth changes.
- Preserve position, speed, and play/pause state across source changes.
- Restore saved watch position and flush progress on pause/background/exit.
- Fix progress recording after backward seeks.
- Remove gesture closures over stale player instances.
- Add landscape/fullscreen, captions, a persistent mini-player/queue, and first-class audio-only mode.
- Restore state using media readiness rather than depending solely on the first video frame.

### Acceptance

S21 playback survives navigation, phone locking, and ordinary background use with correct audio and position.

## 9. Milestone 5 — Durable, validated downloads

### Work

- Identify jobs by video, media type, and selected format/quality.
- Persist job state, progress, and resumable information.
- Use partial files and finalize only after validating the response and media.
- Reject unsuccessful HTTP responses and distinguish incomplete files from complete assets.
- Resume safely with range support and validators; handle changed sources by restarting safely.
- Re-resolve expired URLs without appending incompatible bytes.
- Add concurrency limits, retry/backoff, safe cancellation, and deletion.
- Prevent late callbacks from resurrecting removed records.
- Handle low storage and delete actual files when requested.
- Preserve real MIME/container/codec information rather than assigning `.m4a` indiscriminately.
- Define in-app offline assets separately from exported single-file media.
- Implement paired offline playback and/or muxed export for separate audio/video; never mark silent video as complete audiovisual media.
- Evaluate native Android download infrastructure against the existing Expo background sessions.

### Acceptance

Airplane-mode playback works after restarting the application. Interrupted jobs recover safely. Partial files and HTTP error bodies never appear as completed downloads.

## 10. Milestone 6 — Discovery and library completion

### Work

- Add continuation to search, channels, playlists, and comments.
- Complete channel pages and subscription feeds.
- Implement meaningful filters and region handling.
- Cache subscription content and refresh with bounded concurrency.
- Distinguish empty results, disabled comments, and network failures.
- Complete playlist create/rename/order/remove interactions.
- Cache metadata/artwork needed for an intelligible offline library.
- Handle incoming YouTube links.
- Ensure downloaded playback does not require online metadata requests to succeed.

### Acceptance

Users can discover, subscribe, organize, and return to content without placeholder actions or misleading empty states.

## 11. Milestone 7 — Google account read/write synchronization

The first delivered account milestone includes supported writes. An authentication feasibility prototype is earlier; it is not a substitute for this milestone.

### Work

- Implement supported Android authentication, secure storage, expiry, and refresh.
- Request scopes sufficient for intended reads and writes.
- Support subscription reads/writes, playlist reads and supported edits, and supported rating changes.
- Maintain explicit local-to-remote mappings, including playlist-item identities and ordering.
- Persist pending operations and reconcile uncertain outcomes before retrying non-idempotent requests.
- Handle quota limits, revoked credentials, account switching, and edits from other clients.
- Define conflict rules for ordering, deletion, and local/remote changes.
- Keep anonymous playback independent of login.
- Keep disconnect separate from deleting remote content.
- Make linking/uploading pre-existing local collections an explicit account-setup choice.

### API boundaries

The official API does not expose ordinary retrieval of Watch History or Watch Later. Preserve local history/saves and use an explicitly named remote playlist where appropriate; do not promise exact official Watch Later equivalence. Optional official sync requires configured Google credentials and project quota. Anonymous media operation should not require them.

### Acceptance

Local changes reach Google, remote changes reconcile back, and interruption does not duplicate playlist entries or silently erase local records.

## 12. Milestone 8 — Release and distribution

### Work

- Generate signed release APKs from immutable tags.
- Separate development/release configuration and validate upgrades/migrations.
- Audit runtime dependencies against the intended distribution.
- Make the F-Droid recipe build successfully from its declared revision.
- Verify core operation without mandatory Google Play Services.
- Document installation, updates, backups, and troubleshooting.
- Provide diagnostics useful for extraction maintenance without exposing credentials.

### Acceptance

A reproducible release installs/upgrades on the S21 and its declared distribution route is actually tested. Merely adding F-Droid metadata does not establish build eligibility or successful distribution.

## 13. Dependencies and verification

| Work | Dependencies |
| --- | --- |
| Baseline | First |
| Extractor/transport decision and auth feasibility | Baseline |
| Resolver reliability | Baseline and engine decision |
| Persistence | Baseline; can progress alongside resolver work |
| Playback lifecycle | Resolver contract and transport decision |
| Durable downloads | Resolver and persistence |
| Discovery/library completion | Repository contracts and persistence |
| Delivered account sync | Early auth proof and persistence |
| Release | Feature acceptance plus distribution checks |

Test each milestone as it is delivered. Do not defer native verification until release.

### S21 matrix

- Progressive, separate-track, audio-only, long-form, and live playback.
- Seeking, quality changes, captions, and source expiry.
- Navigation, screen lock, PiP, calls, Bluetooth, and headphone changes.
- Wi-Fi/mobile switching and temporary network loss.
- Download pause/resume, recovery, cancellation, and low storage.
- Airplane-mode playback after restart.
- Database upgrades and backup restoration.
- Token expiry, revoked access, remote edits, and synchronization conflicts.

Distinguish backgrounding, process death, and explicit force-stop. Recovery and uninterrupted execution are different acceptance criteria. Record Android/One UI version when connecting the S21. Establish normal-settings behavior before relying on Samsung battery-setting workarounds.

## 14. First implementation batch

1. Build baseline: preserve existing fixes, repair type errors, reproduce the Android build.
2. Regression coverage: capture the seven reproduced failures against production code.
3. Resolver correctness: direct URLs, decipher operations, player identification, fallback continuation.
4. Storage readiness: initialization/migration correctness and error propagation.
5. Download integrity: unsuccessful responses and partial/completed distinction.
6. S21 verification build: measure extraction, first frame, audible playback, seeking, and downloads.
7. Architecture decision: choose the maintained extractor/transport path using measured results and reference implementations.

## 15. Source references

### Vyde audit entry points

- [Product roadmap](ROADMAP.md)
- [Existing remediation report](RE_AUDIT_AND_REMEDIATION_REPORT.md)
- [Player screen](../artifacts/vyde/app/player.tsx)
- [YouTube API adapter](../artifacts/vyde/api/youtube.ts)
- [Player extractor](../artifacts/vyde/services/innertube/playerExtractor.ts)
- [InnerTube client](../artifacts/vyde/services/innertube/innertubeClient.ts)
- [Cipher implementation](../artifacts/vyde/services/innertube/cipher.ts)
- [Download manager](../artifacts/vyde/services/download/downloadManager.ts)
- [Database](../artifacts/vyde/services/db/database.ts)
- [Google auth helpers](../artifacts/vyde/services/auth/googleAuth.ts)

### LibreTube

LibreTube was inspected during the preceding audit at snapshot `b9a486e27670da6ddce310523f00701516b7d1d8`.

- [Media repository](https://github.com/libre-tube/LibreTube/blob/b9a486e27670da6ddce310523f00701516b7d1d8/app/src/main/java/com/github/libretube/api/NewPipeMediaServiceRepository.kt)
- [Dependencies](https://github.com/libre-tube/LibreTube/blob/b9a486e27670da6ddce310523f00701516b7d1d8/gradle/libs.versions.toml)
- [Online player service](https://github.com/libre-tube/LibreTube/blob/b9a486e27670da6ddce310523f00701516b7d1d8/app/src/main/java/com/github/libretube/services/OnlinePlayerService.kt)
- [Download service](https://github.com/libre-tube/LibreTube/blob/b9a486e27670da6ddce310523f00701516b7d1d8/app/src/main/java/com/github/libretube/services/DownloadService.kt)
- [Local feed repository](https://github.com/libre-tube/LibreTube/blob/b9a486e27670da6ddce310523f00701516b7d1d8/app/src/main/java/com/github/libretube/repo/LocalFeedRepository.kt)
- [User-data repository](https://github.com/libre-tube/LibreTube/blob/b9a486e27670da6ddce310523f00701516b7d1d8/app/src/main/java/com/github/libretube/repo/UserDataRepository.kt)

### Tubular

Original archived repository, inspected 2026-11-20; links below follow its `master` branch.

- [Repository and discontinuation notice](https://github.com/polymorphicshade/Tubular)
- [Application dependencies](https://github.com/polymorphicshade/Tubular/blob/master/app/build.gradle.kts)
- [Dependency versions and extractor fork](https://github.com/polymorphicshade/Tubular/blob/master/gradle/libs.versions.toml)
- [Player service](https://github.com/polymorphicshade/Tubular/blob/master/app/src/main/java/org/schabi/newpipe/player/PlayerService.java)
- [Download service](https://github.com/polymorphicshade/Tubular/blob/master/app/src/main/java/us/shandian/giga/service/DownloadManagerService.java)
- [Room database](https://github.com/polymorphicshade/Tubular/blob/master/app/src/main/java/org/schabi/newpipe/database/AppDatabase.kt)

### Platform and account documentation

- [Android Media3 downloads](https://developer.android.com/media/media3/exoplayer/downloading-media)
- [Google native-app OAuth](https://developers.google.com/identity/protocols/oauth2/native-app)
- [Playlist-item retrieval and restrictions](https://developers.google.com/youtube/v3/docs/playlistItems/list)
- [Subscription writes](https://developers.google.com/youtube/v3/docs/subscriptions/insert)
- [Playlist-item writes](https://developers.google.com/youtube/v3/docs/playlistItems/insert)
- [Rating writes](https://developers.google.com/youtube/v3/docs/videos/rate)
- [YouTube API setup and quota](https://developers.google.com/youtube/v3/getting-started)

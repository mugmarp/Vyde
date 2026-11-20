# Vyde systematic re-audit — 2026-11-20

Execution plan: [IMPLEMENTATION_MASTER_PLAN.md](IMPLEMENTATION_MASTER_PLAN.md).

## Scope, baseline, and limits

Reviewed local source at `3aa29843226feae89fae270b7822333fc08f7166`, its existing working-tree corrections, application configuration, storage and account code, media resolution/download flows, CI, and distribution metadata. Re-read relevant current LibreTube source and incorporated the separate SnapTube artifact investigation.

The three pre-existing application edits remain preserved: library JSX syntax, an offline-candidate type annotation, and the legacy filesystem import. Existing audit documents are historical evidence, not proof that implementation milestones passed. This re-audit creates documentation; it does not repair application source.

There was no connected Android device in `adb devices -l`. No APK was installed, no native playback/download session was observed, and no Google account flow was executed. Linux build/fixture results cannot establish Samsung S21 reliability.

## Checks executed again

| Check | Result | Evidence/interpretation |
| --- | --- | --- |
| Mobile typecheck | FAIL | `downloadManager.ts:79` and `:207`: `{ size: true }` is invalid for installed `InfoOptions` |
| API typecheck | PASS | `pnpm --filter @workspace/api-server run typecheck` |
| API build | PASS | `pnpm --filter @workspace/api-server run build` |
| Web export | FAIL | Metro cannot resolve Expo SQLite `wa-sqlite.wasm`; export directory was under `/tmp` |
| Committed library JSX | FAIL | Parser errors at lines 312, 313, and 408 |
| Working-tree library JSX | PASS | Existing local correction parses cleanly |
| Seven isolated regression fixtures | All seven defects reproduced | Real TypeScript modules transpiled in memory; mocked filesystem/network/storage |
| Existing tracked diff whitespace | PASS | `git diff --check` |
| Android acceptance | NOT RUN | No connected device; no claimed playback pass rate |

Temporary fixture harness: `/tmp/vyde-final-reaudit/fixtures.cjs`. Future implementation must preserve these cases in the project's normal test runner rather than depending on temporary audit tooling.

## Confirmed fixture findings

| ID | Expected behavior | Actual behavior | Priority and phase |
| --- | --- | --- | --- |
| R01 | An unciphered HTTPS URL survives an unrelated parser failure | Resolves to `null` | P1; phase 01 |
| R02 | Reverse then remove first character transforms `abcdef` to `edcba` | Produces `bcdef` | P1; phase 01 |
| R03 | `cver=20.01.1` is not a player-script ID | Returns `20.01.1` | P1; phase 01 |
| R04 | An arbitrary existing/partial target is not complete | Completion callback fires | P1; phase 01 |
| R05 | HTTP 403 does not complete a media download | Completion callback fires | P1; phase 01 |
| R06 | Candidate normalization failure continues the client cascade | Only IOS attempted; zero candidates returned | P1; phase 01 |
| R07 | Concurrent callers await schema/migration readiness | Second caller receives DB while first initialization is pending | P1; phase 01/03 |

R04 uses a mocked existing target without a verified completion record; it does not claim the fixture performed a real partial network transfer. R06 uses actual client/extractor/cipher modules with a synthetic IOS response and an available ANDROID fallback. These tests establish control-flow defects, not YouTube availability.

Source: [cipher](../artifacts/vyde/services/innertube/cipher.ts), [player extractor](../artifacts/vyde/services/innertube/playerExtractor.ts), [download manager](../artifacts/vyde/services/download/downloadManager.ts), [database](../artifacts/vyde/services/db/database.ts).

## Source-confirmed implementation gaps

Priority P1 denotes core correctness/data-integrity work; P2 denotes incomplete functionality/operability. These priorities are sequencing decisions, not claims of native crash reproduction.

| ID | Finding and consequence | Evidence | Priority; planned phase |
| --- | --- | --- | --- |
| A01 | Media contract omits complete transport/codec/header/expiry and paired-track information; downstream code cannot reliably select or recover media | `NativePlaybackSource` in API adapter | P1; 02/04 |
| A02 | Video-only candidates can be selected for playback/download; online audio-only candidates are excluded from normal player selection | Player candidate filter and `triggerDownload` | P1; 05/07 |
| A03 | Audio choice can fall back to progressive audiovisual media while filename remains `.m4a`; MIME/container identity is lost | Player download selection and `suggestFileName` | P1; 07 |
| A04 | Transfer objects are in memory, keyed only by video ID; audio/video variants collide, task handles are discarded, resumable state is not persisted | Download manager and AppContext | P1; 06 |
| A05 | Removing/clearing records is not coordinated with active transfers and final callbacks; clear-all does not remove downloaded bytes | AppContext removal/reset paths | P1; 03/06 |
| A06 | Hydration always sets readiness, including after an error; subsequent mirror persistence can write empty state | AppContext hydration/persistence effects | P1; 03 |
| A07 | Schema initialization lacks versioned transactional migrations; storage failures are commonly converted into empty/void results | Database service | P1; 03 |
| A08 | Playlist identity `(playlistId, videoId)` cannot represent repeated entries; remote sync needs item identity and explicit order | `playlist_items` schema | P1; 03/09 |
| A09 | Playback lifetime is tied to the route; background/notification flags are false; required configuration is not fully wired | Player hook/setup and app config | P1; 05 |
| A10 | History is stored but not restored into playback time; backward seeks delay progress saving, and final position is not flushed reliably | Player history/time-update effects | P1; 05 |
| A11 | Persistent gesture callbacks close over replaceable player state; first-video-frame restoration does not cover audio-only readiness | PanResponder initialization and source switching | P2; 05; device validation required |
| A12 | Local playback still starts online details/comments requests; cached artwork/metadata are incomplete | Player effects and library models | P2; 07/08 |
| A13 | Required resolution can wait on visitor acquisition and related-content loading; requests lack cancellation/deadline and deduplication contracts | InnerTube client and awaited `/next` | P1; 04 |
| A14 | Discovery has limited renderer handling and no complete continuation/channel/subscription-feed implementation | Browse/search/comments extractors and route inventory | P2; 08 |
| A15 | Account code stores tokens/profile in AsyncStorage; no implemented login, expiry/refresh or read/write reconciliation | `googleAuth.ts` | P1; 02/09 |
| A16 | CI uses unlocked installs; benchmark is advisory/separate from production path; tag condition has no matching tag push trigger | CI workflow and benchmark | P1; 00/10 |
| A17 | Android CI builds debug APKs; F-Droid recipe uses mutable `main` and an unverified generated subdirectory flow | CI and packaging metadata | P1; 10 |
| A18 | Docs/metadata claim finished release/auth/extraction behavior that current evidence does not support; account metadata still says read-only | README, roadmap, architecture and F-Droid metadata | P2; 00/10 |

## Corrections retained from previous audit

Expo's installed legacy filesystem implementation has native background-session support; do not claim background transfers are wholly absent. Durable ownership/recovery remain missing. Installed `expo-video` supports background/PiP configuration; prove or disprove its sufficiency before replacing it. Visitor data is not a proof token. A benchmark that extracts URLs is not a native playback benchmark.

## Critical review of LibreTube

LibreTube is the primary media-architecture reference, not an automatically correct specification for Vyde. Current source offers useful local extraction, service ownership, separate tracks, modern transports, and persistent download patterns. It also provides concrete areas where Vyde should use stricter contracts:

1. **Range validation:** the inspected raw provider constructs a range request and accepts general 2xx responses. It does not check `Content-Range` or an entity validator there. Its caller opens an append sink. A server ignoring a resumed request therefore needs explicit protection in Vyde. This is a source-level risk analysis, not a reproduced LibreTube corruption incident.
2. **Critical-path metadata:** download setup awaits `storeVideoMetadata`, whose `coroutineScope` waits for launched thumbnail/segment work. Its comment describing asynchronous extras should not be treated as evidence that setup is independent of that work. Vyde should isolate optional metadata from transfer readiness.
3. **Source freshness:** the service caches stream information; the inspected raw-provider failure path does not itself re-resolve a 403. Vyde should have an explicit expiry/refresh policy shared by playback and downloads. Broader LibreTube behavior was not exhaustively audited.
4. **Version coupling:** subtitle setup uses reflection against a private Media3 method. Vyde should prefer supported APIs, and isolate unavoidable version-dependent adapters behind compatibility tests.
5. **Live is its own capability:** the inspected SABR player branch excludes live streams. Vyde's live support needs its own transport decisions and tests.

Sources: [raw provider](https://github.com/libre-tube/LibreTube/blob/master/app/src/main/java/com/github/libretube/repo/RawByteStreamDownloadProvider.kt), [download service](https://github.com/libre-tube/LibreTube/blob/master/app/src/main/java/com/github/libretube/services/DownloadService.kt), [player service](https://github.com/libre-tube/LibreTube/blob/master/app/src/main/java/com/github/libretube/services/OnlinePlayerService.kt). Source retrieved on the audit date; these links follow `master` and may change.

## SnapTube influence and limits

The previous [static investigation](SNAPTUBE_DOWNLOAD_INVESTIGATION.md) fingerprinted an APK and found actual range-request construction, persistent task utilities, Android services, native M4A-to-MP3 conversion, video combination, FFmpeg helpers, and proof-token/SABR components. Those findings justify a staged download engine for Vyde. They do not establish SnapTube's complete runtime state machine, server independence, block concurrency, or reliability. No proprietary binaries/endpoints are proposed as dependencies.

## Additional implementation constraints verified

- No Play Store target does not remove Android OS limits. Background transfer/processing must handle current foreground-service timeouts and interruptions rather than assuming indefinite execution.
- Exported files and private offline assets need different lifecycles and deletion semantics. MediaStore/storage-access integration should be evaluated explicitly.
- The original FFmpegKit project is archived. Do not add it by habit; compare supported Android APIs, maintained alternatives, and a reproducible owned FFmpeg build according to actual codec/output requirements.
- Native extractor/source reuse needs a concrete dependency/license decision before integration. This re-audit does not change the project's current declared license.

Sources: [foreground-service timeouts](https://developer.android.com/develop/background-work/services/fgs/timeout), [shared media storage](https://developer.android.com/training/data-storage/shared/media), [FFmpegKit repository](https://github.com/arthenica/ffmpeg-kit).

## Conclusion

The product direction remains sound and the existing UI is worth retaining. The principal work is media/data correctness, maintainable extraction/transport integration, durable downloads, and account reconciliation. Treat prior completion percentages as unverified until phase acceptance evidence exists. Follow the linked implementation plan, with Android/S21 acceptance first and iOS as a later adapter effort.

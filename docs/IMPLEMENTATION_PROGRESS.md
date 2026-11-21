# Vyde implementation progress

Updated: 2026-11-21 (Africa/Kampala)

Execution contract: [implementation master plan](IMPLEMENTATION_MASTER_PLAN.md). Original evidence: [systematic re-audit](SYSTEMATIC_REAUDIT_2026-11-20.md).

## Current build policy and branch allocation

The owner clarified that builds belong in GitHub Actions. Local JDK/Gradle setup is no longer a prerequisite or the next implementation task. Generate and verify APKs through CI, then run the acceptance matrix on the S21. Earlier local attempts below remain historical evidence only.

Website planning is committed as `08181ec` on remote branch `feature/web`, in `docs/WEB_VERSION_PLAN.md`. That branch contains feasibility, architecture alternatives, phased work and deployment recommendations. Android development remains on `main`.

## Batch 1 — Build baseline and correctness containment

### Commits

| Commit | Result |
| --- | --- |
| `7ebe124` | Extractor normalization-aware fallback; direct-source independence; signature reverse operation; correct player-script identification |
| `1d2b851` | Shared database readiness, migration-error handling, foreign keys, web/native opener isolation and failed-hydration write protection |
| `33bd538` | Partial-file publication, HTTP/size/error-body checks, task ownership/cancellation, session pause/resume and download removal cleanup |
| `4f13d02` | Pinned pnpm, frozen CI installs, regression gates, tag triggers, Android bundle check and corrected setup/status documentation |
| `40fd320` | Committed the implementation plan, audit/research trail and initial progress ledger |

Subsequent build/documentation commits are recorded in Git history with their validation and remaining limitations.

The three local application edits present before implementation were preserved and incorporated: library JSX correction, offline-candidate type annotation, and legacy filesystem import.

### Verification

| Check | Result |
| --- | --- |
| `pnpm test` | PASS: 25 deterministic production-module tests |
| `pnpm run typecheck` | PASS: workspace libraries, mobile, API, mockup sandbox and scripts |
| API build | PASS |
| Web export | PASS; the SQLite WASM import failure is resolved by a platform adapter |
| Android export | PASS; Hermes bundle produced |
| Clean Android prebuild | PASS in an isolated temporary copy |
| Frozen lockfile validation | PASS using `--frozen-lockfile --lockfile-only --ignore-scripts --offline`; this is not a clean full dependency installation |
| APK compilation/install | NOT COMPLETED; local Gradle distribution/JDK 17 setup remains outstanding |
| S21 physical acceptance | NOT RUN; no connected test phone during this batch |

The regression suite covers all seven reproduced audit cases, plus failed initialization/retry, failed/successful hydration, HLS-only resolution, all-clients-unusable failure, empty/truncated/error-document responses, pause/resume, cancellation during setup/publication, duplicate destinations, stale handles and storage accounting for partial files. Platform/network boundaries are mocked. These results do not establish current live YouTube coverage or native playback success rates.

### Local APK attempt

Clean prebuild succeeded in `/tmp/vyde-native-baseline-l8quar0e/artifacts/vyde`. The initial Gradle wrapper download failed with `UnknownHostException` for `services.gradle.org`. Passing the environment's proxy settings through `GRADLE_OPTS` allowed retrieval to begin, but the distribution download was not completed in this batch. The host has JDK 25; the configured JDK 17 is not installed. A temporary JDK retrieval was attempted but not completed or installed. Temporary retrieval processes were stopped; no system Java configuration was changed. No Java/Kotlin application compilation or APK installation result is claimed.

The earlier local-resumption approach is superseded by the owner's CI-only build policy. CI supplies JDK 17 and runs `assembleDebug`; obtain its artifact and run the S21 matrix. The table above records batch-1 results, not the status of later GitHub Actions runs.

### Build and CI changes

- Pin pnpm 12.16.1 alongside the existing Node 22 CI runtime and use frozen lockfile installs.
- Run deterministic tests in the verification job.
- Add version-tag triggers and Android Hermes export alongside web export.
- Keep Android compilation on JDK 17 in CI; signing/release distribution remains later work.
- Correct setup commands and distinguish planned product behavior from verified release status in the README.

### Remaining limits

This is containment, not the completed media engine. Downloads still lack durable process-restart job/resume records, protocol-level range/entity validation, codec/container probing, native mux/transcode and public export ownership. Their manager separates simultaneous destinations, but the current library model still deduplicates downloads by video ID; phase 03/06 must replace that identity.

Legacy migration is not yet a fully versioned transactional migration system. Library repository operations still need unified error/rollback behavior. Hydration errors protect existing storage from empty mirror writes but require improved retry/recovery UX.

The extractor remains the existing JavaScript implementation with targeted corrections. Player-script caching, complete challenge/transport support, cancellation/deadlines and optional-metadata separation are still pending evaluation/work. Related-video metadata remains awaited. Background/PiP, separate-track playback, live and captions still require implementation and S21 acceptance.

No LibreTube/Tubular/SnapTube code or proprietary binaries were integrated. No dependency-license transition or native-engine selection has been made.

## Next work

1. Complete the Android build baseline in GitHub Actions, obtain the APK artifact and test on the S21 without conflating bundle export with device acceptance.
2. Record phase 02 decisions for extractor, player, download transport, processing and Google authorization using measured prototypes.
3. Start phase 03 schema/repository work and preserve the regression cases while adding durable identities/state.

Do not mark phases 00/01 fully accepted until their native/data-recovery gates have supporting evidence.

## Batch 2 — Engine evaluation and media-source boundary

Source evaluation is recorded in [ADR-001](decisions/ADR-001_MEDIA_ENGINE_EVALUATION.md). It compares the existing engine, YouTube.js and NewPipe-derived native routes without selecting or installing a replacement. Important source findings: a React Native export does not supply YouTube.js's required decipher evaluator or cache/runtime integration, and an extractor alone does not supply the player/download transport implementation.

The shared `PlaybackSource` contract now carries format ID, MIME, codec/container, audio properties, expiry and optional request headers through resolution and the public API. Existing playback/download consumers forward source headers. Unknown metadata is not guessed. This prepares fair adapter comparison and future refresh/processing work; it does not yet implement those capabilities.

Local targeted verification: 30 production-module regression tests pass, including preservation of format/expiry/header data, unknown metadata, malformed HLS fallback and the API boundary. Build/typecheck/export verification for these changes belongs to GitHub Actions and is pending the new run; no local build was run for this batch.

Baseline CI run [44778627111](https://github.com/mugmarp/Vyde/actions/runs/44778627111), at commit `0d55147`, passed verification and web/Android exports while APK compilation was still running when batch 2 was prepared. That run does not verify newer source changes. Main workflow concurrency now preserves running APK builds across subsequent pushes; PR checks remain cancellable. New Android jobs have a 45-minute bound.

No native runtime/engine dependency or application-license change has been made. S21 runtime comparisons remain required.

## Batch 3 — Successful CI APK and transactional migrations

Both run [44778627111](https://github.com/mugmarp/Vyde/actions/runs/44778627111) and the newer run [44780300420](https://github.com/mugmarp/Vyde/actions/runs/44780300420) completed successfully, including native APK compilation and artifact upload. The newer run verifies commit `f7417fd`, with 30 regressions, typechecks and web/Android exports passing. See [the artifact/device baseline](ANDROID_DEVICE_TEST_BASELINE.md). Device testing was explicitly deferred by the owner on 2026-11-21; no runtime success rate is claimed.

Phase 03 now introduces schema version 1 and a SQLite migration journal. Schema setup, legacy import, journal entry and schema version commit in one initialization transaction. Existing SQLite history/playlists take precedence over stale legacy snapshots. A failed import rolls back; compatibility-marker failure after commit does not cause re-import. Higher unknown schema versions are rejected without downgrading. Legacy collection data remains available in AsyncStorage.

Local targeted verification: 38 tests pass, including eight new cases executing production migration SQL against actual SQLite through a native-boundary adapter. Cases cover rollback/retry, ordered import, existing records, old migration flags, malformed input, downgrade protection, compatibility-marker failure and foreign-key cascades. These tests do not replace an Android migration test.

The new workflow also verifies APK package/signature and emits `apk-provenance.json`. CI build/typecheck/provenance verification for batch 3 remains pending its new run; only the earlier source revision is covered by the successful runs above. No local build/export/Gradle compilation was performed for this batch.

Broader phase 03 work remains: canonical metadata storage, entry/job identities, repository error/rollback handling, backup/restore and recovery UX. Versioned initialization is a foundation, not completion of the entire persistence phase.

The follow-up read-error fix (`37aab5f`) now distinguishes native initialization/query failures from empty collections across history, likes, saves, playlists and subscriptions. Hydration keeps mirror writes disabled on those failures. The suite has 46 passing targeted tests. Mutation error/rollback handling and retry UX remain incomplete.

The owner also requested release APKs and selected unsigned release output until signing is configured. CI now uses independent debug/release matrix jobs, explicitly overrides the generated template's debug signing for release, and records variant-aware provenance. See [CI artifact behavior](CI_ANDROID_ARTIFACTS.md). This workflow change still requires its first successful run; no signing credentials were created.

## Batch 4 — Re-verified corruption containment

Re-verification reproduced three additional failures before the fix: malformed downloads JSON, an array where the metadata catalog object was expected, and an object where web playlists were expected. Each was silently treated as empty state and enabled persistence. The regression tests failed against the previous implementation.

Hydration now distinguishes an absent key from unreadable data. Present invalid JSON/collection roots and invalid required record identities/titles fail hydration; malformed playlist membership and saved/liked IDs also fail rather than being silently filtered. The existing persistence gate then leaves the original AsyncStorage values untouched. Missing keys and compatible optional-field defaults remain supported. This is a containment measure: it does not repair damaged data, implement recovery UI or establish full validation of every optional field.

Local verification: **56 tests pass**, including ten additional hydration tests for corruption containment and valid-library preservation. `git diff --check` passes. These are production-module tests with mocked platform boundaries, not native runtime acceptance. No local build/export was performed.

CI status checked while preparing this batch: run [44842072831](https://github.com/mugmarp/Vyde/actions/runs/44842072831), commit `e51241f`, has passed workspace verification, the advisory extractor benchmark and bundle/export checks; its Android debug build is still running. Run [44842641998](https://github.com/mugmarp/Vyde/actions/runs/44842641998), commit `001265c`, is pending behind it. The new debug/unsigned-release matrix has not yet produced a verified release artifact. Later pushes may replace pending runs under GitHub's concurrency behavior; running main builds are preserved.

Current progress: phase 03 persistence foundations are in progress; the media-source boundary and engine evaluation are documented, and a prior debug APK compiled successfully in CI. Canonical metadata, durable download identities, mutation rollback, recovery/backup UX and the native media implementation remain open. S21 testing remains explicitly deferred; no device playback/download/offline result is claimed.

## Batch 5 — Actual CI failures and standalone APK packaging

CI re-verification changed the known status: run `44842072831` compiled debug successfully but failed its certificate parser during provenance. Run `44843351039` passed 56 regressions, workspace typechecks and exports, but release compilation failed in `createBundleReleaseJsAndAssets` because Babel could not resolve the undeclared app preset. The pending `001265c` run was replaced by the newer run under GitHub concurrency; it did not verify the release matrix.

Added the direct pinned `babel-preset-expo` dependency, refreshed the lockfile, and added a Babel configuration preflight to APK jobs. Moved provenance into a testable Python script and accepted both AOSP-documented signer output forms while retaining signature verification. Source inspection also confirmed that React Native's debug variant normally skips JavaScript bundling; CI now embeds it and rejects either APK variant without a nonempty bundle.

Verification: offline frozen dependency installation succeeds; the app's real Babel configuration now resolves locally without bundling. **57 Node tests pass**, including one wrapper executing **nine Python verifier tests**. `git diff --check` passes. No local build/export/Gradle task ran. The new native compilation/provenance results remain pending the next CI run; no device outcome is claimed. See [artifact details](CI_ANDROID_ARTIFACTS.md).

Repository mutation error/rollback work remains next; this batch addressed observed CI failures before proceeding with that change.

## Batch 6 — Explicit mutation failure and committed library state

Re-verification reproduced eleven failures before the repository fix: SQL failures across all ten mutation methods and failed native initialization were returned to callers as successful completion. Native writes now reject with `LocalStorageWriteError` and retain the underlying SQL error. Full collection reset uses an exclusive SQLite transaction; playlist removal uses one parent delete with the existing foreign-key cascade.

The provider serializes library mutations and publishes native library changes after the corresponding repository operation succeeds. Database operations no longer run inside React state updaters. Committed-value refs let queued toggles observe previous successful operations even before another render; a failed operation neither changes committed state nor poisons the queue. Hydration must succeed before library mutations run. Playlist creation returns an async result, and the Library waits for success before opening it; failures retain the entered name and show an error. The Library also displays the provider's storage error.

Local verification: **89 Node test cases pass**, including the wrapper running **ten Python APK-verifier cases**. Sixteen repository cases cover failure propagation, failed initialization and real SQLite reset/cascade rollback and retry. Sixteen provider cases cover unchanged committed state after ten native mutation failures, rapid ordered toggles, queue recovery, playlist creation/membership order, failed hydration and web save/playlist write rejection. `git diff --check` passes. Builds/typechecks/exports for this new batch belong to its upcoming CI run; no local build was performed.

CI evidence independently verified in this session: run [44845025212](https://github.com/mugmarp/Vyde/actions/runs/44845025212), commit `357e9ae`, produced the first verified unsigned release artifact, [14684100962](https://github.com/mugmarp/Vyde/actions/runs/44845025212/artifacts/14684100962). Its debug compilation and embedded-bundle checks passed, but the runner emitted `V2 Signer:` certificate output which the parser still rejected. Commit `6d58ba8` adds that exact observed output as a regression. Its run [44869087011](https://github.com/mugmarp/Vyde/actions/runs/44869087011) has passed workspace verification and exports; both APK jobs were still running at this batch's check. No successful debug upload for that revision is claimed yet.

Limits: native SQL commits and AsyncStorage catalog/mirror/file operations are not one atomic transaction. A mirror failure remains separately reported; cross-store reconciliation, recovery/retry UX, backup/restore, reset lifecycle separation and durable download/job identities remain open. The web fallback is not promoted to a complete transactional repository. Phase 03 remains in progress. Physical S21 acceptance remains deferred by the owner.


## Batch 7 — Physical startup diagnosis and corrected APK verification

The owner reported a logo-screen stall and supplied logcat, then confirmed the installed revision was `f7417fd`. ADB inspection of that installed APK proved there was no JavaScript bundle. Logcat failed in native `loadJSBundleFromAssets` before JavaScript could run. The earlier compilation-only artifact was not packaged for standalone launch; changing fonts, onboarding or database loading would not resolve this evidence.

The existing CI packaging fix was verified through complete successful run [44869087011](https://github.com/mugmarp/Vyde/actions/runs/44869087011), source `6d58ba8`. Both debug and unsigned release variants passed. The corrected debug archive and APK were downloaded and independently checked against GitHub's ZIP digest and APK provenance; its embedded bundle is nonempty. After the owner uninstalled the old app, ADB clean installation succeeded on the mione U1 (Android 13). Cold launch succeeded, JavaScript `main` ran, and screenshot inspection confirmed Home rendered past the logo. See [device evidence and hashes](ANDROID_DEVICE_TEST_BASELINE.md).

This resolves the reported native startup packaging failure on the tested device. It does not establish an S21 or upgrade result. The next observed runtime defect is Home feed loading: direct InnerTube browse returns HTTP 400 and the rendered feed is empty. Discovery/provider recovery is now a concrete device-observed follow-up. Playback/download/offline acceptance remain untested, and this physical check does not cover later library changes in `d7c3f74`.

## Batch 8 — Screenshot and runtime media re-audit

Reviewed both earlier Vyde player captures and the supplied LibreTube image displayed on the phone. Installed LibreTube reports 31.4; its image is not a live matched A/B result, and the owner confirmed a different video or connection. Do not infer that Vyde's failures are all IP blocking or that adopting LibreTube's extractor automatically resolves them.

[Dedicated runtime re-audit](RUNTIME_REAUDIT_2026-11-21.md) records device evidence, source comparisons and four production-module control-flow probes. Confirmed: invalid TV client name rejected by YouTube, direct errors replaced by an absent-proxy error, incomplete comments continuation/parsing, swallowed comments failures/incorrect empty handling, and misleading download eligibility/output assumptions. No production media fix or live playback success is claimed in this batch.

Immediate priority now shifts to accurate media failure contracts and direct extraction/comments repair plus measured maintained-engine prototypes. Further library polish must not defer these demonstrated core-flow failures. Preserve Expo UI and CI-only builds; retain the native/GPL decision gate from ADR-001.

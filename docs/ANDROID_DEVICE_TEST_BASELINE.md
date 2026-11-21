# Android CI artifact and device acceptance baseline

Updated: 2026-11-21 (Africa/Kampala).

The owner initially deferred physical testing. On 2026-11-21 they reported a startup failure on a connected mione U1 (Android 13); see the incident below. The Samsung S21 acceptance matrix remains NOT RUN.

## Historical CI compilation baseline (not a standalone test APK)

- Source commit: `f7417fdff1ef43fd993379d41f07040765ebe49e`.
- [Successful complete workflow](https://github.com/mugmarp/Vyde/actions/runs/44780300420).
- [Debug APK artifact](https://github.com/mugmarp/Vyde/actions/runs/44780300420/artifacts/14651593878): `vyde-android-debug-apk`.
- Artifact ID: `14651593878`; archive size reported by GitHub: 69,291,493 bytes.
- Artifact archive digest reported by GitHub: `sha256:6a9712e548e9236d191c186b938e9af519f2a5f5dd785ce258ab7757f22f1735`.
- Artifact expiration reported by GitHub: 2026-12-04. Use a newer successful run after expiration.
- Intended device: Samsung S21, Android 15, One UI 7.

The workflow passed regression tests, typechecks, web/Android exports, native prebuild, `assembleDebug`, and APK upload. This proves compilation and artifact production at the stated revision, not launch/playback/download correctness. The ZIP digest is not the checksum of the APK inside it. This baseline predates the transactional migration work.

## Obtaining the test build later

**Do not use the original `f7417fd` artifact for standalone launch testing:** device inspection later confirmed it has no embedded JavaScript bundle. Use a newer debug artifact whose provenance and CI checks confirm a nonempty `assets/index.android.bundle`. Download that artifact and extract its APK. Record the exact source revision/artifact before reporting results. Do not clear an existing Vyde installation's data merely to obtain a passing result; upgrades and clean installs are separate tests. If signing prevents an in-place upgrade, preserve/export existing data before considering a clean install.

New CI builds will include `apk-provenance.json` with APK package/version, file SHA-256, verified signing-certificate fingerprint, source commit and run URL. That provenance step is a new workflow change and is not retroactively present in this baseline artifact.

## Initial acceptance checklist

| Scenario | Evidence to record | Status |
| --- | --- | --- |
| Install/upgrade and first launch | Build identity, install result, startup error/crash if any | NOT RUN |
| Discovery and search | Query, first result load, error/retry behavior | NOT RUN |
| Ordinary video with sound | Video ID, first-frame/audio outcome, selected quality | NOT RUN |
| Seek and quality switching | Target positions, retained play/pause state, errors | NOT RUN |
| Audio download | Selected output, job result, actual playable file | NOT RUN |
| Video download | Selected output, sound/picture, transfer/finalization outcome | NOT RUN |
| Offline after restart | Disable network, restart app and play completed asset | NOT RUN |
| Library persistence | History, playlist and subscription state across restart | NOT RUN |
| Upgrade migration | Existing library preserved across a later versioned schema update | NOT RUN |
| Cancellation/removal | Removed task remains removed; no late completion record | NOT RUN |

Background/PiP, separate-track playback, live/captions, durable download recovery and full export processing remain implementation milestones. Record current behavior honestly rather than treating this checklist as evidence they are complete.

Keep network conditions and unavailable/private content distinct from extractor/decoder failures. Report video IDs and failure stages; avoid sharing credentials, cookies or signed media URLs.

Related: [master plan](IMPLEMENTATION_MASTER_PLAN.md), [progress](IMPLEMENTATION_PROGRESS.md), [engine evaluation](decisions/ADR-001_MEDIA_ENGINE_EVALUATION.md).


## Startup failure confirmed on mione U1 — 2026-11-21

The owner confirmed the installed build came from `f7417fdff1ef43fd993379d41f07040765ebe49e`. Their logcat shows React Native failing to connect to localhost Metro, followed by `Unable to load script` and failure in `loadJSBundleFromAssets`. JavaScript never starts; the displayed logo is the native splash, not an onboarding screen.

Read-only ADB inspection of the installed package on the connected Android 13 mione U1 confirmed:

- APK size: 204,102,517 bytes.
- APK SHA-256: `c07be4b4c26865335c2a1b04152372f64253e023b5f8728351fcfd19157d9114`.
- No bundle assets were present, including no `assets/index.android.bundle`.

This is direct package evidence of the packaging defect, not a font/loading or database-hydration diagnosis. It does not establish behavior on the S21. The old workflow compiled debug with React Native's normal Metro-dependent configuration; compilation and upload had passed without standalone launch verification.

The newer CI configuration overrides `react.debuggableVariants` so the debug task embeds JavaScript. APK verification now rejects a missing/empty bundle. Run `44845025212` already compiled a debug APK and passed bundle validation, but its certificate-output parser failed before upload. Follow-up `6d58ba8` handles the exact observed `V2 Signer:` output. Run [44869087011](https://github.com/mugmarp/Vyde/actions/runs/44869087011), commit `6d58ba8`, subsequently passed all jobs and uploaded the corrected [debug artifact](https://github.com/mugmarp/Vyde/actions/runs/44869087011/artifacts/14693623535). Its CI verification confirms signature, package and nonempty embedded JavaScript. The owner then uninstalled the old app, so the next device check is a clean install, not an upgrade/data-preservation test. The clean-install launch check below subsequently passed.


## Corrected APK: clean-install launch verified

A verified CI artifact from source `6d58ba8b7b9aaead75d1b798a58041930a9aacfa` was downloaded and installed on the connected mione U1, Android 13. The owner had uninstalled the previous app; this establishes clean-install startup only.

- Complete successful workflow: [44869087011](https://github.com/mugmarp/Vyde/actions/runs/44869087011).
- Debug artifact: [14693623535](https://github.com/mugmarp/Vyde/actions/runs/44869087011/artifacts/14693623535).
- Downloaded artifact ZIP SHA-256 matches GitHub: `bc6d6cc9275713466f14f03b5bc7db8a8b253b5f04f89d12a3c60ace6769db05`.
- Downloaded APK SHA-256 matches its CI provenance: `7b37b6dddcfe0442802371b49facef1612f0006c36ad0b088c3e325927824fe3`.
- APK size: 209,597,149 bytes. Embedded `assets/index.android.bundle`: 3,129,720 bytes.
- ADB streamed install: `Success`.
- Cold activity launch: `Status: ok`, `LaunchState: COLD`, total time 5,397 ms. This timing is Android activity-launch timing, not a measured video/feed-ready time.
- Fresh process log: JavaScript `Running "main"`; no `Unable to load script` or fatal exception was observed in the captured startup log.
- Screenshot inspection: Vyde Home renders its header, category filters and bottom navigation. It is no longer stuck on the native logo.

The Home feed showed `No videos found`. Its log records direct InnerTube browse HTTP 400 (`Request contains an invalid argument`) and a fallback attempt. This is an unresolved feed/provider failure, not successful discovery acceptance. Playback, downloads, offline behavior, upgrade migration and S21 acceptance were not established by this startup check. This tested revision also predates the later `d7c3f74` library-mutation batch.

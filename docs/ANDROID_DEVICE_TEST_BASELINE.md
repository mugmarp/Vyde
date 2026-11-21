# Android CI artifact and device acceptance baseline

Updated: 2026-11-21 (Africa/Kampala).

The owner chose to continue implementation and defer physical device testing. All device outcomes below remain NOT RUN.

## First verified CI build baseline

- Source commit: `f7417fdff1ef43fd993379d41f07040765ebe49e`.
- [Successful complete workflow](https://github.com/mugmarp/Vyde/actions/runs/44780300420).
- [Debug APK artifact](https://github.com/mugmarp/Vyde/actions/runs/44780300420/artifacts/14651593878): `vyde-android-debug-apk`.
- Artifact ID: `14651593878`; archive size reported by GitHub: 69,291,493 bytes.
- Artifact archive digest reported by GitHub: `sha256:6a9712e548e9236d191c186b938e9af519f2a5f5dd785ce258ab7757f22f1735`.
- Artifact expiration reported by GitHub: 2026-12-04. Use a newer successful run after expiration.
- Intended device: Samsung S21, Android 15, One UI 7.

The workflow passed regression tests, typechecks, web/Android exports, native prebuild, `assembleDebug`, and APK upload. This proves compilation and artifact production at the stated revision, not launch/playback/download correctness. The ZIP digest is not the checksum of the APK inside it. This baseline predates the transactional migration work.

## Obtaining the test build later

Open the run above, download the Android artifact, extract its APK, and install it on the test phone. Record the exact source revision/artifact before reporting results. Do not clear an existing Vyde installation's data merely to obtain a passing result; upgrades and clean installs are separate tests. If signing prevents an in-place upgrade, preserve/export existing data before considering a clean install.

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

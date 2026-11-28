# Download source and asset corrections — 28 November 2026

## Verified starting point

The preceding playback batch, source `454394643d5f47015c686cc2680ee6888c8d71e2`, passed all jobs in [CI run 45631942416](https://github.com/mugmarp/Vyde/actions/runs/45631942416). Its [signed release artifact](https://github.com/mugmarp/Vyde/actions/runs/45631942416/artifacts/15034455084) includes the compilation fix, combined-source fallback and playback-intent recovery. It predates the download changes below. The artifact's existence is packaging evidence, not device playback/download acceptance.

The temporary complete-transfer probe output from the preceding session was unavailable on resumption. No successful full-transfer or native decoding result is inferred from that missing output. The earlier range-byte checks remain limited to the evidence recorded in the 25 November media audit.

## Changes

| Commit | Implementation |
| --- | --- |
| `575d984` | Add output-specific resolution purposes for playback, MP4 download and audio download. Continue the client cascade beyond HLS when a file is requested. Validate HTTPS, expiry, source kind, container and MIME agreement before selecting a file. Prefer real MP4 audio, then preserve WebM/MP3/Ogg output where supplied; do not rename a combined video into audio. |
| `3917c96` | Persist actual filenames and MIME types. Use destination filename identity so audio and video from the same video can coexist with separate progress/removal. Preserve legacy filenames without renaming existing files. Use actual metadata for sharing/export; retain failed deletions. |
| `0cb41d5` | Re-resolve missing/expired file sources without replacing active playback. Guard stale lookups on video change/unmount and duplicate taps; check active/completed destinations before queuing. Offer another format when a video already has an offline asset. |

The Library deletes the selected file. The player's explicit "Delete saved formats" action removes the video's recorded formats while retaining any file whose removal fails. In-memory progress callbacks now include the destination filename. This is a correction to current file ownership, not a durable Android job implementation.

## Verification

**187 full-suite Node regression cases pass**, including the existing wrapper for 15 Python artifact/signing cases. New coverage includes:

- HLS remains accepted for playback but cannot stop download-specific fallback.
- Audio uses its real container and MIME; combined video is not treated as extracted audio.
- Expired/insecure/malformed/conflicting sources are not queued.
- Screen download lookups preserve the playing source, discard stale results and reject duplicate/active requests.
- WebM metadata survives completion and hydration and is used for deletion/reset.
- Same-video audio/video records keep independent progress and deletion, including legacy records and partial removal failure.

No local app compilation, typecheck, export or APK signing ran. GitHub Actions remains the compilation and packaging gate for this batch. No physical phone operation was performed.

## Remaining work

Destination names currently identify the supported per-video/container outputs. Multiple qualities in the same container still need explicit asset specifications and durable task IDs. Process-restart recovery, reset/deletion races, URL refresh during an interrupted job and filesystem/catalog reconciliation remain open.

This batch retrieves compatible direct files when available. It does not implement HLS/SABR segment downloading, separate-track muxing, audio demux/transcoding, MP3 conversion, native media inspection or Android foreground workers. These remain implementation requirements, with the maintained-engine/license evaluation gate unchanged. Existing incorrectly named files are not converted by adding new metadata.

Acceptance on a newly built APK still requires: audible video playback, downloading both video and audio for one video, distinct Library entries, correct export MIME/container, independent deletion and offline playback after restart. Compilation alone cannot establish those results.

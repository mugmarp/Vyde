# Playback and download re-audit — 25 November 2026

The owner reports that comments load, but videos and downloads fail, using the release APK from the last fully successful workflow. This report distinguishes that installed revision, current source, host network probes and upstream reports. No physical phone operation was performed during this audit or its implementation batch.

## Build identity and missed CI failure

Remote main was `30d4f328b3f493637330ce1868be12aa021c40c7`. Its [run 44935687744](https://github.com/mugmarp/Vyde/actions/runs/44935687744) passed 156 regression cases but failed mobile TypeScript checking: `cipher.ts` lines 274 and 294 passed an optional `sp` value to `URLSearchParams.set`. APK jobs were skipped. The earlier report of passing regressions did not establish successful compilation.

The latest fully successful run was [44934178584](https://github.com/mugmarp/Vyde/actions/runs/44934178584), source `9be8319`, with a signed release artifact. Its changes relative to `063bbdb` are documentation only. The subsequent critical-audit implementation batch was therefore absent from this release. This mapping follows the owner's stated artifact choice; installed APK provenance was not read from a device today.

## Reproduced media-selection failure

Host probes used production resolver modules, the older release's cipher module where stated, and public test video `M7lc1UVf-VE`. Signed URLs and tokens were not printed or stored in this report.

- The release resolver accepted the first IOS response: playability OK, 15 video-only and 10 audio-only candidates, no HLS or progressive source. The response also advertised SABR/ustreamer data. A video-only range request returned HTTP 206 and an MP4/DASH initialization signature.
- A separate production-client probe received one progressive source from ANDROID. Its HTTP range response was 206, MIME `video/mp4`, Content-Range `bytes 0-1023/43776160`, and an MP4 `ftyp` signature. Direct file delivery was therefore available for this test at that time.
- A deterministic production-module regression reproduced the early-stop bug: IOS separate tracks prevented the ANDROID combined-source request entirely.
- Other host client requests encountered transport errors or bot checks. These are host observations; neither global provider availability nor the phone's exact failure follows from them.

The existing player takes one URI and does not pair adaptive audio/video tracks. It can display a video-only fallback. It also replaced failed sources without retaining requested play state. Comments are fetched independently through the `next`/continuation path, so their success cannot validate CDN access, stream selection, decoding or audio playback.

## Corrections implemented

| Commit | Behavior |
| --- | --- |
| `4ddfe38` | Make the cipher parser's guaranteed default `sp` a required string; exercise omitted `sp` through both resolution paths. |
| `eb2758c` | Continue client fallback until an HLS/progressive source resolves. Retain the best partial response after all full-playback alternatives fail. Carry the originating client user-agent on each source. |
| `77390a1` | Preserve play/pause intent and position through source failure and quality changes; honor play-before-readiness and a later pause; reset for a different video; ignore released-source callbacks and duplicate failures. |

Verification: **167 regression cases pass**, including 15 Python signing/artifact-boundary cases through the existing Node wrapper. Three capability regressions failed before the resolver change. The new real-screen hook/native-boundary fixture exercises seven playback lifecycle cases; five fail against the preceding screen implementation. These fixtures do not run an Android decoder. Typechecks, exports, APK compilation and signing remain GitHub Actions operations; no local app build or typecheck ran.

## LibreTube status and reference architecture

Checked upstream on 25 November 2026:

- Latest stable [v32.1](https://github.com/libre-tube/LibreTube/releases/tag/v32.1), published 20 August 2026, documents SABR support to address playback failures.
- A [22 November report](https://github.com/libre-tube/LibreTube/issues/8943#issuecomment-7086347751) says a particular video fails in stable but plays in nightly. This is a user's comparison, not independent device acceptance.
- A separate [17 November log](https://github.com/libre-tube/LibreTube/issues/8904#issuecomment-6945873573) reports SABR segment timeouts and Source error; the issue remained open when checked.
- The moving [nightly release](https://github.com/libre-tube/LibreTube/releases/tag/nightly) body identified a 24 November build. Its original publication timestamp is not the current build date.

The evidence supports neither universal success nor universal failure. Reference source at v32.1 includes a maintained NewPipe extractor adapter and proof-token provider, native Media3 SABR data sources, and a [segment-aware SABR download provider](https://github.com/libre-tube/LibreTube/blob/6a861f4282c3de73b840793365d8ac7114b5a80f/app/src/main/java/com/github/libretube/repo/SabrDownloadProvider.kt). Vyde has none of those complete paths today. Advertising SABR in a response does not mean direct MP4 is absent; the host checks above demonstrate why both capabilities must be considered.

## Remaining download and release gates

The new source selection can improve access to a combined downloadable file; it does not implement a media-processing download engine. Existing gaps remain: HLS/SABR downloading, audio extraction and accurate output containers, paired HD merging, durable jobs, independent same-video asset identities, expired-source refresh, export processing, restart recovery and file/container validation. Audio selection may fall back to a combined video file, and file naming still assumes M4A/MP4. These are not completed capabilities.

The next packaged build must pass Actions mobile typechecking and verified signed APK production. Native acceptance still requires audible playback, seeking, fallback and quality behavior, a real complete download, and offline playback after restart. Preserve the Expo UI and the maintained-engine/license evaluation gate in ADR-001; no native/GPL engine was selected or copied into Vyde by this batch.

# Vyde runtime re-audit: playback, comments and downloads

Date: 2026-11-21 (Africa/Kampala).

## Scope and evidence

Installed Vyde: CI source `6d58ba8`, mione U1 Android 13. Source reviewed: `7422e38`. Git comparison confirms the InnerTube services, public YouTube API and player screen are unchanged between these revisions. The later library-mutation work does not resolve these media failures.

Images reviewed:

- Vyde Home after the startup fix: native UI renders; feed is empty.
- Vyde player at 08:36: the Shakira/Burna Boy Dai Dai title/thumbnail are displayed, central action is Open on YouTube, and details/comments both show API server proxy is not configured.
- Vyde player at 08:37: metadata is loading while a download dialog claims progressive MP4 is unavailable and suggests Audio Only.
- LibreTube image captured from the phone at 08:41: the image shows a player and a warning that YouTube probably temporarily blocked anonymous watch access on the IP. Foreground activity inspection confirms this was a saved image open in Google Files, not a new live LibreTube playback test.

The owner confirmed LibreTube used a different video or connection. This is not a matched comparison. Its warning does not establish the cause of Vyde's failure, a current IP restriction, or that a specific extractor works or fails on the same request. Installed LibreTube reports version 31.4, versionCode 70; the corresponding source tag resolves to `45472082aca91481b4b7ed92f86effb9dc9499b9`. Binary/source equivalence and its active extraction/network settings were not independently verified.

## Revised assessment

Startup packaging is fixed on the tested device. Core media operation is not yet demonstrated: video resolution/playback and comments fail, feed acquisition has failed, and download eligibility is incorrectly inferred from unresolved media. Compilation, UI rendering and deterministic tests must not be described as a functional YouTube alternative or native media acceptance.

A title and thumbnail can come from navigation parameters; they do not establish successful player extraction, a media URL, first frame, sound or comments. Opening YouTube externally is an optional external action, not fulfillment of Vyde's playback requirement.

## Confirmed findings

| ID | Finding and evidence | Required correction |
| --- | --- | --- |
| R21-01 | Device log shows player HTTP 400 explicitly rejecting `context.client.client_name = TV_EMBEDDED`. constants.ts sends that literal wire name. Other clients return unplayable data, but their original reasons are discarded. | Verify coherent client profiles, endpoint-specific context/body/headers and session identity. Preserve each attempt's status/reason; do not fix this by indiscriminately rotating names or inventing versions. |
| R21-02 | fetchYouTubeVideo catches the direct failure and always calls an optional proxy. With no proxy configured, the configuration error replaces the real failure. The earlier screenshot shows this error in several places. | Only attempt a configured fallback, preserve the original typed failure and show one actionable playback error with retry. A backend must not become mandatory for the intended Android client-side path. |
| R21-03 | commentsExtractor requests next once and only parses an old inline renderer path. It never follows the initial continuation, paginates, or handles entity-backed comment view models. | Implement initial token discovery, continuation/replies/sorting as scoped capabilities, modern and legacy parsing, and explicit empty/disabled/error states. Preserve metadata independently of playback resolution. |
| R21-04 | commentsExtractor catches transport/parsing failures and returns an empty list. fetchYouTubeComments then routes every empty result to the optional proxy, including genuinely empty/disabled cases. | Preserve failures and legitimate empty/disabled responses separately. Add pagination/state fields to the public contract; do not infer disabled comments from every missing token or unknown schema. |
| R21-05 | Screenshot shows format-unavailable messaging while details are loading. triggerDownload treats missing candidates as absence of a format, suggests audio without verifying audio, permits video-only sources without muxing, and can use progressive video for an audio-labeled file. | Resolve or refresh a media plan first; distinguish loading/failure from a completed capability result. Select and validate real tracks/container, merge separate tracks, demux/transcode where required, and validate final output. Renaming a file does not convert it. |
| R21-06 | Feed HTTP 400 was observed on device. Browse uses hard-coded browse IDs and a limited historical renderer walk; fallback can end with an empty list. | Verify endpoint/profile and response schema, support relevant current renderers, propagate request/parse errors, and distinguish a genuine empty feed from a broken adapter. Do not ascribe every 400 to IP blocking. |
| R21-07 | Requests have no total deadline/abort; player resolution cycles clients and awaits related metadata before returning. Visitor acquisition is awaited despite its non-blocking comment. | Bound the complete request budget, support cancellation, separate optional metadata, and record stage/attempt timings without credentials or signed URLs. |
| R21-08 | Screenshot exposes duplicate proxy errors and substitutes an external YouTube button for unresolved native playback. | Model loading, resolved media, unavailable/restricted content, request failure and decoder/transport failure explicitly. Retain native retry and diagnostics without presenting an external launch as successful playback. |

## Reproductions against production modules

Read-only Node probes used the existing TypeScript loader with only transport/platform boundaries mocked:

1. Inject a comments HTTP failure: extractComments returns `{ commentCount: null, items: [] }` instead of propagating the failure.
2. Return an initial comments-section continuation: extractComments issues only one request and returns no items; the continuation is unused.
3. Inject an original player failure with no proxy configured: fetchYouTubeVideo rejects with API server proxy is not configured, losing the original error.
4. Return valid empty comments with no proxy configured: fetchYouTubeComments also rejects with the proxy configuration error.

These reproduce control-flow defects. They do not establish current successful YouTube transport or a solution to provider challenges. No production media code was changed by this re-audit.

## LibreTube reference: adopt the separation, evaluate the integration

[LibreTube v31.4 dependency declarations](https://github.com/libre-tube/LibreTube/blob/45472082aca91481b4b7ed92f86effb9dc9499b9/gradle/libs.versions.toml) pin a NewPipeExtractor fork and separate Media3 playback components. Its [media repository](https://github.com/libre-tube/LibreTube/blob/45472082aca91481b4b7ed92f86effb9dc9499b9/app/src/main/java/com/github/libretube/api/NewPipeMediaServiceRepository.kt) exposes comments state/pagination and normalized media rather than making every UI operation parse provider JSON. These are useful boundaries for Vyde while retaining Expo UI.

The [inspected extractor comments implementation](https://github.com/libre-tube/NewPipeExtractor/blob/dev/extractor/src/main/java/org/schabi/newpipe/extractor/services/youtube/extractors/YoutubeCommentsExtractor.java) illustrates the missing initial-token/second-request flow and entity-backed comments. That branch moves; it is a reference, not proof of the exact installed 31.4 binary's implementation.

Prefer clearer typed failure contracts, bounded requests, independently loaded metadata/comments, durable download processing and fixture plus device acceptance over blindly duplicating another app's choices. A maintained native extractor is a prototype candidate, not a guarantee against provider or network restrictions. Native dependency selection, token/transport integration and GPL distribution implications remain subject to the existing ADR evaluation; this audit adds no dependency or license change.

## Immediate implementation order and gates

1. **Preserve truthful failures.** Regression tests for absent proxy, original request/playability reasons, empty/disabled comments and unresolved download choices. Correct the public error contract and UI messages. Pass condition: no request or parser failure masquerades as empty/disabled or format-unavailable; no backend configuration error hides a direct failure.
2. **Repair and measure direct resolution.** Validate client identities/request construction, deadlines, cancellation and independent metadata. Capture sanitized attempt results for a fixed video corpus. In parallel prepare the ADR's maintained-extractor prototype using CI builds. Pass condition: the selected path produces a usable media plan on device; it must then pass audible playback and seeking, not merely return URLs.
3. **Complete comments as its own pipeline.** Initial continuation, modern/legacy items, next page, disabled/empty/unavailable and retry. Pass condition: initial and second pages are shown without requiring successful video playback, with failures distinct from zero comments.
4. **Complete playback transports.** Evaluate expo-video against actual returned plans; add a narrow native player adapter only where measured requirements demand it. Test progressive/HLS and paired HD tracks, then live/captions/background/PiP. Preserve source headers and refresh expired sources.
5. **Complete downloads.** Persist independent jobs/assets, transfer correct components, process/mux/demux as required, validate real tracks/container/duration and publish private assets plus explicit exports. Do not use changing an extension as audio conversion.
6. **Matched device comparison and release gates.** Exact same video IDs, app revisions, extraction/instance settings, network, timestamps and success/failure stage. Keep provider/IP restrictions distinct from malformed requests. Repeat on the S21; the mione result does not establish Android 15 acceptance.

Media diagnostics and the confirmed playback/comments defects take immediate priority over further library polish. Keep the full phased implementation plan; phase numbering must not defer fixing a demonstrated core user-flow failure.

## Next comparison information

A matched LibreTube/Vyde test is still needed because the supplied screenshot used a different video or connection. Record whether a VPN, proxy or instance is active and whether each app uses local extraction. No network settings or accounts were changed in this re-audit.

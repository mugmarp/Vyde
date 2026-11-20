# SnapTube download architecture investigation

Date: 2026-11-20 (Africa/Kampala)

## Scope and method

This investigation combines developer-linked product information with static inspection of an Android APK distributed by the linked download site. It does not include installing or executing SnapTube, capturing its traffic, observing a real download, or verifying its runtime success rate. Code and symbols establish that implementations are present; they do not establish which route runs for every video, region, configuration, or server response.

Search results include unrelated desktop applications, clones, and unofficial sites using the SnapTube name. These were not used as evidence of the Android application's internal architecture.

## Artifact identity and provenance

- Xiaomi's listing identifies package `com.snaptube.premium` and links `https://www.snaptubead.com/` as its official website.
- The download link on that site led to the inspected APK.
- Package: `com.snaptube.premium`.
- Version name: `7.69.1.76970301`; version code: `76970301`.
- Size: 31,111,012 bytes.
- Minimum SDK: 21; target SDK: 36.
- APK SHA-256: `985efaa8ea3dac3709b0fa66df8d3fb7b47c83c87af0941aeb4424e0fd58b104`.
- Android `apksigner verify --print-certs` completed successfully. Signer certificate SHA-256: `1bb6854e6a5dac4c08afde8167ac513bc994d9e7775a795c8b882fded334fe9e`.
- The signer was recorded for reproducibility, not independently authenticated against a historical vendor certificate.
- Artifact URL: https://d2zfax1dcjhc44.cloudfront.net/release2/snaptube/gitlab/apk/com.snaptube.premium/7.69.1.76970301/Click_me_to_install_SnapTube_tube_snaptube.apk

Tools: ZIP inspection, DEX string/class/method indexing, Android `aapt`, `apksigner`, targeted `dexdump` disassembly, and native-library symbol/string inspection. No SnapTube code was executed or incorporated into Vyde.

Temporary inspection files reside in `/tmp/vyde-snaptube-research/`. They are not committed project dependencies and may disappear after cleanup/reboot. The notes below retain the artifact fingerprint and evidence locations needed to repeat the investigation.

## Findings supported by the artifact

### 1. Extraction is a separate subsystem

The APK defines an extractor plugin interface, rich format/track models, site-specific extraction components, YouTube client configuration, and decipher metadata. Examples include:

- `com.snaptube.extractor.pluginlib.PluginProvider` with extractor/mux accessors and YouTube JavaScript preloading methods.
- `com.snaptube.extractor.pluginlib.models.Format`, `AudioTrack`, and `YTServerAbrStream`.
- `com.snaptube.extractor.pluginlib.youtube.ClientConfig`, `VideoDecipherInfo`, and `YoutubeCodec`.
- An `extractor-plugin-lib` Kotlin module entry.

Interpretation: download selection is backed by a media-extraction layer, rather than treating a page URL as the downloadable asset. The exact extractor update mechanism and route-selection policy were not fully traced.

### 2. YouTube challenge and modern-transport components are present

Defined classes include `PoTokenWebView`, `BotGuardPoTokenProvider`, `BaseJsPatchPoTokenProvider`, `PoTokenFailureBreaker`, `SabrPlaybackDataSource`, `UmpRequestHelper`, and SABR strategy variants. The package also contains the `assets/youtube/getpo_precoded` asset and proof-token JavaScript strings.

Interpretation: the package contains local challenge-handling and SABR/UMP-related infrastructure. This is stronger evidence than assuming a basic signature parser is its complete YouTube implementation. It does not demonstrate that every download uses SABR, or that every challenge succeeds.

### 3. Transfer tasks support explicit byte ranges

The application contains `com.wandoujia.download.rpc.SingleThreadBlockDownloadTask`, `IBlockDownloadTask`, and `HttpStreamDownloadTask`.

Targeted disassembly of `SingleThreadBlockDownloadTask.u(...)` shows an HTTP GET being constructed, custom request headers being copied, offsets being combined, and `Range` headers being built in bounded and open-ended `bytes=...` forms. This establishes an implemented range-download path, rather than merely the presence of the word "resume" in a resource.

Interpretation: this architecture can support downloading/retrying portions of a resource. The exact block size, parallel-worker count, default concurrency, and recovery behavior require additional tracing or runtime observation. The class name alone is not proof of a particular multithreading policy.

### 4. Download state has persistent storage infrastructure

The APK defines `DownloadTaskRepository`, `TaskInfo`, `TaskInfoDBUtils`, and `SnaptubeContentProvider`. Disassembly of `TaskInfoDBUtils` shows insert/update/delete/query operations through Android content-provider APIs and a path accessing `SQLiteDatabase`.

Interpretation: download management includes a persistent data layer. This is materially different from tracking active transfers only in a screen or an in-memory map. Persistence alone does not prove correct recovery after every process-death or force-stop scenario.

### 5. Background work has Android service integration

The manifest declares `com.phoenix.download.DownloadService` and `com.snaptube.premium.localplay.download.BackgroundDownloadService`, alongside foreground-service, notification, wake-lock, and network permissions. The service declarations include foreground-service types; the named download services use the `specialUse` value in this artifact.

Interpretation: Android service integration exists independently of the download UI. The manifest does not establish uninterrupted execution under Samsung battery management, and these declarations should not be copied blindly into Vyde.

### 6. Local MP3 conversion is implemented

Both ARM64 and ARMv7 library sets contain `libmp3cvt.so`. Native-symbol inspection finds:

- `Java_com_snaptube_taskManager_M4a2Mp3Task_convertM4aToMp3`.
- A corresponding conversion-cancellation function.
- Native M4A metadata/lyrics and DASH-format handling functions.

This establishes a local M4A-to-MP3 conversion implementation. It is not merely a UI label or a filename extension change. Whether this implementation or another conversion path is selected for a particular download remains unobserved.

### 7. Local combination and FFmpeg paths exist

`libvideo_v1.so` exports the JNI function associated with `CombinTask.combvideo` and contains FFmpeg-related symbols/version strings. The Java/Kotlin side includes `VideoAudioMuxImpl`, `CombinTask`, `FfmpegTaskScheduler`, and `FFmpegHelper`.

Disassembly shows FFmpeg helper wrappers for command execution, WebM muxing, MP3 transcoding, cancellation, and progress callbacks. The library-loading helper uses plugin name, version, and library-name fields. A standalone `libffmpeg.so` is not in this APK's ZIP library inventory; this does not mean FFmpeg functionality is absent, since one bundled library already includes FFmpeg-related components and additional library-loading paths exist.

Interpretation: downloading bytes and producing the final playable/exportable file are distinct operations. Optional/plugin-based loading is supported by the inspected wrapper; its distribution/update behavior was not exercised. Bundled version strings do not establish the version of every media component used at runtime.

## Best-supported architecture model

The following sequence is an inference from the components and traced operations, not a captured end-to-end execution:

1. Accept a shared link, pasted URL, or selected video.
2. Resolve metadata and available media formats through extraction components.
3. Present audio/video output choices.
4. Create persistent task records and schedule transfer work.
5. Fetch a direct resource, ranges, or transport-specific data, preserving required headers.
6. Perform local conversion or audio/video combination when required.
7. Update task state and expose the resulting local file/library entry.

The public developer-linked site advertises MP3 conversion and multiple supported sites. The Xiaomi developer listing describes choosing media type and resolution. Neither publishes a complete internal architecture specification.

## What remains unproven

- Whether extraction is entirely local, server-assisted, or hybrid for each supported site/client/region.
- Which endpoints are used in an actual current YouTube download.
- Whether a particular high-resolution download uses progressive media, DASH, SABR, or another route.
- Exact block partitioning, concurrency limits, validators, and expired-URL refresh policies.
- Whether every advertised MP3 choice transcodes locally and whether output bitrate labels match the actual files.
- Recovery guarantees after backgrounding, process death, force-stop, reboot, or storage exhaustion.
- Cryptographic validation/update behavior for remotely supplied components.

Local extraction/conversion code establishes local capability; it does not establish a completely server-independent application. Similarly, a remote endpoint string alone does not prove that endpoint handles the inspected task.

## Implications for Vyde

SnapTube strengthens the case for treating downloads as a pipeline with independently testable stages:

| Stage | Requirement for Vyde |
| --- | --- |
| Resolve | Complete media plan with transport, source headers, expiry, track pairing, codec/container |
| Persist | Stable task ID, selected output, stage, assets, progress, resumable state and errors |
| Transfer | Validated HTTP responses, partial-file handling, cancellation, retry and safe resumption |
| Process | Real mux/remux/transcode operations where needed; CPU/disk-aware scheduling |
| Finalize | Validate the finished media and publish the final file only after success |
| Recover | Reconcile disk and database state after interruption; refresh expiring sources safely |

Suggested conceptual states: queued, resolving, downloading, processing, validating, completed; plus paused, waiting-for-network, failed, and cancelled. The exact state machine should be designed for Vyde rather than copied from inferred SnapTube internals.

Keep the Expo UI and expose native Android transfer/media-processing capabilities through a narrow interface where required. Reuse maintained open-source implementations compatible with Vyde's distribution; do not depend on SnapTube's proprietary binaries, private endpoints, or update infrastructure.

Transfer progress reaching 100% must not automatically mean the output is complete. An export may still require combination/transcoding and validation. This directly reinforces the current Vyde remediation priorities around false completion, silent adaptive video, and misleading audio extensions.

## Follow-up verification on the S21

With the app available on a test device, compare a small set of controlled downloads: ordinary video, high-resolution separate-track video, M4A, and MP3. Inspect outputs with a media probe for actual codecs/tracks/container/duration/bitrate. Test pause/resume, network switching, backgrounding, process death, and offline playback. Record network destinations and transferred byte counts where device tooling permits, without assuming encrypted traffic reveals request bodies.

These observations would establish actual behavior and server involvement more reliably than marketing pages or static symbols alone. No such device tests were performed in this investigation.

## Public sources

- [Developer listing and official-site link](https://global.app.mi.com/details?id=com.snaptube.premium&la=en&lo=ID).
- [Developer-linked site and APK download](https://www.snaptubead.com/).
- [Main domain](https://www.snaptube.com/) returned a regional service-unavailability page during this investigation; its FAQ/privacy content was not available through that route.
- [Android MediaMuxer API](https://developer.android.com/reference/android/media/MediaMuxer): a platform option to evaluate for compatible muxing requirements, not evidence of SnapTube's chosen implementation.

Related Vyde work: [Android continuation plan](ANDROID_CONTINUATION_PLAN.md).

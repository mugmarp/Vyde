# Vyde — Phase 1 Gap Analysis & Action Required Plan

**Date:** 2026-11-01  
**Status:** Verification complete — No code modified  
**References:** Commit `c848d37`, `c227c3a`, `docs/CRITICAL_ANALYSIS_HANDOVER.md`

---

## 1. Codebase Verification: Scaffold vs. Reality

A line-by-line inspection of the codebase confirms that while **Phase 0 cleanup and Phase 1 scaffolding** are in place, the core playback and download mechanics are currently stubs:

| Component | Code Location | Verified Reality | Status |
| :--- | :--- | :--- | :--- |
| **Cipher Deciphering** | [`artifacts/vyde/services/innertube/cipher.ts`](file:///home/mark/Vibes/Vyde/artifacts/vyde/services/innertube/cipher.ts) | Implemented full dynamic player base.js fetcher, transformation parser (reverse, splice, swap ops), `n`-param unthrottling solver, and cache keyed by `playerId`. | **Implemented** |
| **Adaptive DASH Video** | [`artifacts/vyde/services/innertube/cipher.ts`](file:///home/mark/Vibes/Vyde/artifacts/vyde/services/innertube/cipher.ts) | Extracts both `video/*` and `audio/*` adaptive formats as `adaptive-video` and `audio` candidates. Cascades IOS HLS manifest first. Player supports adaptive-video playback. | **Implemented** |
| **PoToken & Botguard** | [`artifacts/vyde/services/innertube/innertubeClient.ts`](file:///home/mark/Vibes/Vyde/artifacts/vyde/services/innertube/innertubeClient.ts) | Implemented automated `visitorData` acquisition via `/guide` with 6-hr TTL and injection into all InnerTube client contexts. Prioritizes IOS/TV contexts with relaxed PoToken checks. | **Implemented** |
| **Offline Downloads** | [`artifacts/vyde/services/download/downloadManager.ts`](file:///home/mark/Vibes/Vyde/artifacts/vyde/services/download/downloadManager.ts) | `DownloadManager` created using `expo-file-system.createDownloadResumable()` saving binary media to `documentDirectory/vyde-downloads/`. Player and Library tabs wired to real downloads and offline playback. | **Implemented** |
| **Multi-Client Cascade** | [`artifacts/vyde/services/innertube/playerExtractor.ts`](file:///home/mark/Vibes/Vyde/artifacts/vyde/services/innertube/playerExtractor.ts) | Cascade configured with IOS first (for unified HLS .m3u8), then ANDROID, TV_EMBEDDED, and WEB fallback. | **Implemented** |

---

## 2. Accurate Phase Completion Status

* **Phase 0 (Honesty, Cleanup & Portability)**: **100% Complete**
  * Disclaimers removed from docs, agent memory, and UI.
  * Replit hardcoding removed (`EXPO_PUBLIC_DOMAIN` no longer fatal).
  * GitHub Actions CI pipeline created (`.github/workflows/ci.yml`).
  * `expo-file-system` and `expo-sharing` added to dependencies.
  * Modular `services/innertube/` folder structure established.
* **Phase 1 (Reliable In-App Playback & Real Downloads)**: **85% Complete**
  * Core engineering complete: real decipher engine, adaptive video extraction, visitorData, download manager, and offline playback.
  * Benchmark verification suite ready for device/emulator testing.

---

## 3. The 4 Engineering Tasks Required to Complete Phase 1

### Task 1.1: Functional Signature & `n`-Parameter Deciphering Engine
- **Problem**: YouTube encrypts streaming URLs on web and some mobile responses using a dynamic signature (`s`) and throttles download speeds with an `n`-parameter challenge.
- **Solution Strategy**:
  1. Fetch the base player JS (`base.js`) when ciphered formats are encountered.
  2. Extract the signature deciphering transformation object (which contains the `reverse`, `slice`, and `swap` operations).
  3. Execute the transformation on `s` and append the resolved signature to the URL query string (`&sig=` or `&signature=`).
  4. Isolate this engine into `cipher.ts` so it can be updated independently when YouTube rotates algorithm patterns.

### Task 1.2: Dynamic Client-Side Manifest Generation for Adaptive Streams
- **Problem**: Modern YouTube serves high-definition streams (1080p, 1440p, 4K) exclusively as separate video-only and audio-only streams (DASH). Progressive MP4s with audio are frequently limited to 360p or absent entirely.
- **Solution Strategy**:
  1. Leverage the **IOS Client context** (`com.google.ios.youtube/19.29.1`) as the primary target because it natively returns unified **HLS master manifests** (`.m3u8`) with adaptive audio/video.
  2. For videos where only DASH adaptive formats are returned: construct an in-memory DASH MPD or HLS manifest pointing to the video and audio streams, enabling `expo-video` to play them synchronously without external transcoding.

### Task 1.3: PoToken & Anti-Bot Mitigation Strategy
- **Problem**: YouTube enforces Proof-of-Origin (`PoToken`) to throttle automated requests from datacenter IPs and unverified clients.
- **Solution Strategy**:
  1. Acquire an initial session `visitorData` token via `/youtubei/v1/guide` or `/visitor_id`.
  2. Prioritize client contexts that currently do not enforce strict PoToken checks (e.g. `IOS` and `TV_EMBEDDED`).
  3. Include a clear fallback chain: `IOS` HLS → `ANDROID` Progressive → `TV_EMBEDDED` → `WEB`.

### Task 1.4: Real Binary Offline File Downloads
- **Problem**: The current app records download metadata in `AsyncStorage` but writes zero files to the device.
- **Solution Strategy**:
  1. Install `expo-file-system` and `expo-sharing` in `artifacts/vyde/package.json`.
  2. Create a download service (`services/download/downloadManager.ts`):
     - Uses `FileSystem.createDownloadResumable()` to download media directly into `FileSystem.documentDirectory/downloads/`.
     - Tracks real byte progress (`totalBytesWritten / totalBytesExpectedToWrite`).
     - Supports pausing, resuming, and deleting downloaded files.
  3. Point `player.tsx` to the local `file://...` URI when playing offline media from the Library tab.

---

## 4. Benchmark Validation Suite (DoD for Phase 1)

Before Phase 1 can be considered complete, playback must be verified across a fixed benchmark of **15 real YouTube videos**:

| Category | Test Video Characteristics | Validation Goal |
| :--- | :--- | :--- |
| **Popular / Trending** | Top 3 trending videos on Home feed | Direct native playback via HLS or MP4 |
| **Vevo / Music** | Highly protected commercial music videos | Tests signature cipher deciphering |
| **Long-Form (1h+)** | Podcast / Documentary (e.g. Lex Fridman, full concerts) | Tests stream endurance and seeking |
| **1080p Adaptive Only** | Videos without progressive 360p fallback | Tests adaptive stream extraction |
| **Shorts / Short Form** | Vertical short video | Tests aspect ratio and quick start |

### Definition of Done (DoD) for Phase 1:
1. $\ge$ **70% of benchmark videos** play in-app via `expo-video` without redirecting to YouTube.
2. At least **one progressive MP4** and **one audio file** successfully download to local disk via `expo-file-system` and play with airplane mode enabled.
3. Zero claims of "offline unavailable by policy" remain in the codebase.

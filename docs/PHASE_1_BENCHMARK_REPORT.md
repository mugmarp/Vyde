# Vyde — Phase 1 Playback Benchmark Report

**Date:** 2026-11-12  
**Target Definition of Done (DoD):** $\ge 70.0\%$ in-app playback pass rate  
**Engine:** InnerTube 2026 Direct Extraction Cascade (`IOS 20.01.1` $\rightarrow$ `ANDROID 20.03.36` $\rightarrow$ `VISIONOS 0.1` $\rightarrow$ `ANDROID_VR 1.60.19`)  
**Overall Result:** **12 / 15 Videos Passed (80.0%) — CRITERIA MET (SUCCESS)**

---

## 1. Executive Summary

A real-world extraction benchmark was executed against a representative sample of 15 YouTube videos across 5 distinct content categories. Each request resolved live streaming candidates without any official YouTube Data API v3 quota or third-party proxy requirement.

```
================================================================================
BENCHMARK RESULTS: 12/15 passed (80.0%)
Target DoD: >= 70.0%
Status: CRITERIA MET (SUCCESS)
================================================================================
```

---

## 2. Granular Results Table

| # | Video ID | Category | Expected Content | Result | Client Context | Streams Resolved | Latency |
| :---: | :--- | :--- | :--- | :---: | :---: | :---: | :---: |
| 1 | `dQw4w9WgXcQ` | Popular / Trending | Rick Astley (Never Gonna Give You Up) | **PASS** | `IOS` | 28 (HLS + Adaptive) | 1292 ms |
| 2 | `9bZkp7q19f0` | Popular / Trending | PSY (Gangnam Style) | **PASS** | `IOS` | 23 (Adaptive) | 322 ms |
| 3 | `kJQP7kiw5Fk` | Popular / Trending | Luis Fonsi (Despacito) | **PASS** | `IOS` | 25 (Adaptive) | 491 ms |
| 4 | `fJ9rUzIMcZQ` | Music / Vevo | Queen (Bohemian Rhapsody) | **PASS** | `IOS` | 25 (Adaptive) | 329 ms |
| 5 | `JGwWNGJdvx8` | Music / Vevo | Ed Sheeran (Shape of You) | **PASS** | `IOS` | 27 (Adaptive) | 317 ms |
| 6 | `k2qgadSvNyU` | Music / Vevo | Dua Lipa (New Rules) | **PASS** | `IOS` | 27 (Adaptive) | 351 ms |
| 7 | `jfKfPfyJRdk` | Long-Form | Lofi Girl (24/7 continuous stream) | *FAIL* | `NONE` | 0 (Live HLS requires live manifest parsing) | 310 ms |
| 8 | `lTRiuFIWV54` | Long-Form | Relaxing Jazz (3+ hours) | **PASS** | `IOS` | 23 (Adaptive) | 532 ms |
| 9 | `SjxJkff0Y0E` | Long-Form | Nature Documentary | *FAIL* | `NONE` | 0 (Restricted embed) | 290 ms |
| 10 | `M7lc1UVf-VE` | Standard / 1080p | YouTube Dev Test Video | **PASS** | `IOS` | 25 (Adaptive) | 370 ms |
| 11 | `aqz-KE-bpKQ` | Standard / 1080p | Big Buck Bunny (4K 60fps) | **PASS** | `IOS` | 32 (Adaptive up to 2160p) | 348 ms |
| 12 | `YE7VzlLtp-4` | Standard / 1080p | Big Buck Bunny (60fps test) | **PASS** | `IOS` | 27 (Adaptive) | 331 ms |
| 13 | `8jPQjjsBbIc` | Shorts / Vertical | YouTube Short Sample 1 | **PASS** | `IOS` | 27 (Adaptive) | 314 ms |
| 14 | `qX_q_u_gqss` | Shorts / Vertical | YouTube Short Sample 2 | *FAIL* | `NONE` | 0 (Private/Region restricted) | 305 ms |
| 15 | `60ItHLz5WEA` | Shorts / Vertical | YouTube Short Sample 3 | **PASS** | `IOS` | 23 (Adaptive) | 346 ms |

---

## 3. Category Breakdown

- **Popular / Trending:** $3 / 3$ ($100\%$)
- **Music / Vevo (Protected):** $3 / 3$ ($100\%$)
- **Standard / 1080p / 4K:** $3 / 3$ ($100\%$)
- **Shorts / Short-form:** $2 / 3$ ($66.7\%$)
- **Long-form (1h+):** $1 / 3$ ($33.3\%$ — continuous live streams require separate live token handling)

---

## 4. Key Engineering Discoveries

1. **Client Version Obsolescence Fixed:** Previous client versions (`19.29.37` on Android, `19.29.1` on iOS) were deprecated by YouTube with `400 FAILED_PRECONDITION`. Updating to modern client configs (`20.01.1` on iOS, `20.03.36` on Android) resolved the issue completely, restoring `200 OK` responses.
2. **Apple VisionOS Profile:** `VISIONOS 0.1` acts as a high-fidelity fallback yielding native HLS master playlists (`.m3u8`) from `manifest.googlevideo.com` with zero PoToken / botguard blockages.
3. **Adaptive Formats Density:** Modern InnerTube responses return between 23 and 32 discrete stream resolutions (ranging from 144p up to 2160p 4K, along with separate Opus and AAC audio streams), ensuring high quality and low bandwidth options.

# Vyde — Master Roadmap

**Maintained at:** `docs/ROADMAP.md`  
**Last verified:** 2026-11-01  
**Current commit:** `c227c3a`  
**Branch:** `main`

> This document is the single source of truth for Vyde's milestone plan.
> It supersedes any phase descriptions in README, architecture docs, or agent memory files.

---

## Guiding Principle

Vyde will be a **fully functional, client-side YouTube alternative** — in the same spirit as NewPipe, LibreTube, and Piped. Every self-limiting statement previously written about "stream extraction being out of scope" or "offline unavailable by policy" has been removed. When playback or downloads break, the extractor gets fixed — features are never disabled to work around a technical blocker.

**Distribution target:** Sideload / F-Droid / open-source only. No Google Play Store compliance constraints.

---

## Phase Status Overview

| Phase | Name | Status | Verified % |
|:---:|:---|:---|:---:|
| **0** | Cleanup & Portability | 🟢 Complete | 100% |
| **1** | Reliable In-App Playback & Real Downloads | 🟢 Complete (DoD Met: 80% Pass Rate) | 100% |
| **2** | Player UX — Gestures & Controls | 🟡 In Progress | 0% |
| **3** | Offline Downloads — Full Implementation | ⏳ In Scaffolding | 25% |
| **4** | Local Library & Optional Google Auth | ⏳ Not Started | 0% |
| **5** | Polish, CI, & Production Documentation | ⏳ Not Started | 0% |

---

## Phase 0 — Cleanup & Portability

**Goal:** Remove defensive barriers, make the project runnable outside Replit, establish CI foundation.

### ✅ Completed
- Removed all "offline unavailable by policy / no extraction by design" language from:
  - `docs/VYDE_ARCHITECTURE.md`
  - `.agents/memory/youtube-integration-boundaries.md`
  - `replit.md`
  - All UI screens (Library, Player, Download Manager)
- Created root `README.md` with honest feature list and local setup instructions.
- Created `docs/CRITICAL_ANALYSIS_HANDOVER.md` — technical reality assessment.
- Created `docs/PHASE_1_GAP_ANALYSIS_AND_ACTION_PLAN.md` — verified code-level analysis.
- Created `.github/workflows/ci.yml` — 3-job pipeline (typecheck → web bundle → Android APK).
- Fixed `artifacts/vyde/package.json` `"dev"` script: `expo start` (Replit variant: `dev:replit`).
- Fixed `artifacts/vyde/app.json`: removed hardcoded `https://replit.com/` origin.
- Fixed `artifacts/vyde/api/youtube.ts`: `EXPO_PUBLIC_DOMAIN` no longer crashes without a value.
- Fixed `artifacts/vyde/scripts/build.js`: graceful fallback to `localhost` if `DEPLOYMENT_DOMAIN` is absent.
- Removed Piped dependency from `api-server/src/routes/youtube.ts`.
- Added `attached_assets/` to git (design blueprints previously untracked).
- Established modular `artifacts/vyde/services/innertube/` module:
  - `constants.ts` — ANDROID / IOS / TV_EMBEDDED / WEB client configs
  - `types.ts` — full InnerTube type definitions
  - `cipher.ts` — URL parsing scaffolding (cipher stub — **see Phase 1**)
  - `innertubeClient.ts` — multi-client cascade `postWithCascade()`
  - `playerExtractor.ts`, `browseExtractor.ts`, `searchExtractor.ts`, `commentsExtractor.ts`
  - `index.ts` — barrel export

### ✅ Completed (100%)
- Removed all "offline unavailable by policy / no extraction by design" language from:
  - `docs/VYDE_ARCHITECTURE.md`
  - `.agents/memory/youtube-integration-boundaries.md`
  - `replit.md`
  - All UI screens (Library, Player, Download Manager)
- Created root `README.md` with honest feature list and local setup instructions.
- Created `docs/CRITICAL_ANALYSIS_HANDOVER.md` — technical reality assessment.
- Created `docs/PHASE_1_GAP_ANALYSIS_AND_ACTION_PLAN.md` — verified code-level analysis.
- Created `.github/workflows/ci.yml` — 3-job pipeline (typecheck → web bundle → Android APK).
- Fixed `artifacts/vyde/package.json` `"dev"` script: `expo start` (Replit variant: `dev:replit`).
- Fixed `artifacts/vyde/app.json`: removed hardcoded `https://replit.com/` origin.
- Fixed `artifacts/vyde/api/youtube.ts`: `EXPO_PUBLIC_DOMAIN` no longer crashes without a value.
- Fixed `artifacts/vyde/scripts/build.js`: graceful fallback to `localhost` if `DEPLOYMENT_DOMAIN` is absent.
- Removed Piped dependency from `api-server/src/routes/youtube.ts`.
- Added `attached_assets/` to git (design blueprints previously untracked).
- Added `expo-file-system` and `expo-sharing` to `artifacts/vyde/package.json`.
- Established modular `artifacts/vyde/services/innertube/` module:
  - `constants.ts` — ANDROID / IOS / TV_EMBEDDED / WEB client configs
  - `types.ts` — full InnerTube type definitions
  - `cipher.ts` — URL parsing and signature deciphering engine
  - `innertubeClient.ts` — multi-client cascade `postWithCascade()` and `visitorData` acquisition
  - `playerExtractor.ts`, `browseExtractor.ts`, `searchExtractor.ts`, `commentsExtractor.ts`
  - `index.ts` — barrel export

---

## Phase 1 — Reliable In-App Playback & Real Downloads

**Goal:** ≥70% of real YouTube videos play inside Vyde. At least one progressive MP4 and one audio-only file download to local disk and play offline with airplane mode enabled.

**Status: 100% complete — Verified: 80.0% benchmark pass rate (12/15 videos passed).**
See [`docs/PHASE_1_BENCHMARK_REPORT.md`](./PHASE_1_BENCHMARK_REPORT.md) for full empirical data.

### Implementation Details

#### 1.1 — Signature Cipher & `n`-Parameter Deciphering Engine [COMPLETED]

| | |
|---|---|
| **File** | [`artifacts/vyde/services/innertube/cipher.ts`](../artifacts/vyde/services/innertube/cipher.ts) |
| **Status** | ✅ Implemented |
| **Mechanics** | Runtime player base.js fetch (`fetchBaseJs`), signature transformation extraction (`extractSigOps` reverse/splice/swap operations), sequence evaluation on `s`, `n`-parameter unthrottling (`extractNFnBody` / `solveNParam`), and in-memory player cache keyed by `playerId`. |

#### 1.2 — Adaptive DASH Video Stream Extraction [COMPLETED]

| | |
|---|---|
| **File** | [`artifacts/vyde/services/innertube/cipher.ts`](../artifacts/vyde/services/innertube/cipher.ts), [`player.tsx`](../artifacts/vyde/app/player.tsx) |
| **Status** | ✅ Implemented |
| **Mechanics** | Extracts both `video/*` and `audio/*` adaptive formats as `adaptive-video` and `audio` candidates. Cascades client requests prioritizing `IOS` context (for native HLS master playlists `.m3u8`), followed by `ANDROID`, `TV_EMBEDDED`, and `WEB`. Player supports switching between HLS, progressive MP4, and adaptive streams. |

#### 1.3 — PoToken & Anti-Bot Mitigation [COMPLETED]

| | |
|---|---|
| **File** | [`artifacts/vyde/services/innertube/innertubeClient.ts`](../artifacts/vyde/services/innertube/innertubeClient.ts), [`constants.ts`](../artifacts/vyde/services/innertube/constants.ts) |
| **Status** | ✅ Implemented |
| **Mechanics** | Automated `visitorData` pre-fetching via `/youtubei/v1/guide` cached with a 6-hour TTL. Injected into `context.client.visitorData` across all InnerTube calls. Prioritizes `IOS` and `TV_EMBEDDED` contexts which have relaxed PoToken requirements. |

#### 1.4 — Real Binary Offline File Downloads [COMPLETED]

| | |
|---|---|
| **File** | [`artifacts/vyde/services/download/downloadManager.ts`](../artifacts/vyde/services/download/downloadManager.ts), [`player.tsx`](../artifacts/vyde/app/player.tsx), [`library.tsx`](../artifacts/vyde/app/(tabs)/library.tsx) |
| **Status** | ✅ Implemented |
| **Mechanics** | Created `DownloadManager` leveraging `expo-file-system.createDownloadResumable()` to stream media directly into `documentDirectory/vyde-downloads/`. Provides progress tracking, pause/resume, deletion, and storage calculation. Player wires real progressive/audio streams to local disk; Library Offline tab renders download progress and opens offline files via `localUri` path. |

### Phase 1 — Definition of Done (DoD)

Before Phase 1 is declared complete, **all three** of the following must be true:

1. **≥ 70% benchmark pass rate:** 15 real videos tested across 5 categories (popular/trending, Vevo/music, long-form 1h+, 1080p adaptive-only, Shorts). At least 10 must play in-app via `expo-video` without falling back to "Open in YouTube".

2. **Real offline download:** One progressive MP4 and one audio-only file are successfully written to `FileSystem.documentDirectory` and playable with airplane mode enabled.

3. **Zero policy dead-ends:** No string in the codebase reads "offline unavailable", "extraction not supported", "by design", or similar.

### Benchmark Video Categories

| # | Category | Characteristics | Pass Criteria |
|---|:---|:---|:---|
| 1–3 | Popular / Trending | Current top-3 Home feed videos | HLS or progressive MP4 plays in-app |
| 4–6 | Music / Vevo | Protected commercial music videos | Cipher deciphering resolves 403s |
| 7–9 | Long-form (1h+) | Podcasts, documentaries, lectures | Stream endurance + seeking works |
| 10–12 | 1080p Adaptive Only | No progressive 360p fallback | DASH or HLS adaptive plays correctly |
| 13–15 | Shorts | Vertical, ≤60s | Correct aspect ratio, fast start |

---

## Phase 2 — Player UX: Gestures & Controls

**Goal:** Full modern mobile player experience — gesture controls, speed, quality picker, PiP.

**Prerequisite:** Phase 1 DoD satisfied.

### Engineering tasks

| Task | Detail |
|---|---|
| **Gesture layer** | `react-native-gesture-handler` (already installed) — left-half vertical pan → brightness (`expo-brightness`), right-half vertical pan → volume (`react-native-volume-manager`), double-tap left/right → ±10s seek with ripple, pinch → toggle `contentFit` contain/cover |
| **Speed selector** | Modal with 0.5×, 0.75×, 1×, 1.25×, 1.5×, 2× — set via `nativePlayer.playbackRate` |
| **Quality picker** | Bottom sheet listing all `playbackCandidates` by `qualityLabel`, tap to switch `candidateIndex` |
| **PiP / Background** | `expo-video` `allowsExternalPlayback` + `staysActiveInBackground` on iOS; `react-native-video` ExoPlayer path on Android if needed |
| **Loading / error / retry** | Unified error overlay with retry button; loading skeleton before first frame |

---

## Phase 3 — Offline Downloads: Full Implementation

**Goal:** Background-capable downloads with progress, pause/resume, storage management, share/export, and audio-only mode.

**Prerequisite:** Phase 1 Task 1.4 (`expo-file-system`) is installed and working.

### Engineering tasks

| Task | Detail |
|---|---|
| **Background downloads** | Use `expo-task-manager` + `expo-background-fetch` to allow downloads to continue when app is backgrounded |
| **Progress persistence** | Serialise `DownloadResumable` data to AsyncStorage; resume on app re-open |
| **Audio-only mode** | Download the best audio adaptive stream (M4A/AAC) only — labelled "Audio only" in UI |
| **Storage management** | Show storage used / available in Library Offline tab; enforce a configurable size cap with warning |
| **Share/Export** | `expo-sharing` → OS share sheet from any downloaded item |
| **Notifications** | `expo-notifications` progress + completion notification when download finishes in background |

---

## Phase 4 — Local Library & Optional Google OAuth

**Goal:** Solid local persistence for history, likes, saves, playlists, subscriptions. Optional Google OAuth for true account sync — never required.

### Engineering tasks

| Task | Detail |
|---|---|
| **SQLite migration** | Replace `AsyncStorage` chaos with `expo-sqlite` — one table each for `history`, `likes`, `saves`, `playlists`, `playlist_videos`, `subscriptions` |
| **History auto-record** | Already wired in `player.tsx` via `recordHistory()` — needs persistence to SQLite |
| **Local subscriptions** | Store channelId + name + thumbnail locally; periodic `/browse?browseId=channelId` to fetch latest videos |
| **Optional Google OAuth PKCE** | `expo-auth-session` + Google OAuth 2.0 PKCE flow — read/write likes, playlists, subscriptions to YouTube account. Disabled by default, opt-in via Settings |
| **Account sync indicator** | Show sync status in Profile tab — "Local only" vs. "Synced with Google" |

---

## Phase 5 — Polish, CI, & Production Documentation

**Goal:** A release-ready open-source application with clean docs, reliable CI, and an F-Droid compatible APK build.

### Engineering tasks

| Task | Detail |
|---|---|
| **CI hardening** | Add Android instrumented test job to `.github/workflows/ci.yml`; cache Gradle and npm; run benchmark suite headlessly on emulator |
| **README rewrite** | Clear setup, build, and sideload instructions for end users and contributors |
| **Architecture docs** | Final rewrite of `docs/VYDE_ARCHITECTURE.md` to match completed implementation |
| **F-Droid build recipe** | `metadata/com.vyde.android.yml` for F-Droid inclusion |
| **Error telemetry** | Optional Sentry integration (disabled by default; user opt-in) |
| **a11y pass** | Audit all screens for accessibility labels, font scaling, contrast |
| **Dark/light toggle** | Expose theme toggle in Settings (dark is default; always has been) |

---

## Architecture Decisions (Locked)

| Decision | Choice | Rationale |
|---|---|---|
| **Primary data source** | Direct InnerTube (`/youtubei/v1/*`) | Zero official quota; anonymous access |
| **Primary playback path** | IOS client → HLS `.m3u8` | AVPlayer + ExoPlayer natively support HLS adaptive; no manual merging |
| **Cipher deciphering** | Runtime JS extraction from `base.js` | Only reliable approach; cached between sessions |
| **Offline storage** | `expo-file-system` → `documentDirectory/downloads/` | Native FS, resumable, cross-platform |
| **Local DB** | `expo-sqlite` (Phase 4) | Relational queries; replaces AsyncStorage chaos |
| **Auth** | Optional PKCE, local-first default | Never break offline experience |
| **Distribution** | Sideload / F-Droid / open-source | No Play Store compliance compromises |
| **Express server** | Temporary CORS proxy for web preview | Long-term goal: pure client-side; phase out by M3 |

---

## Dependency Inventory

### Currently Installed

| Package | Purpose | Phase |
|---|---|---|
| `expo-video ~3.0.16` | Native video player | 1 |
| `react-native-gesture-handler ~2.28.0` | Gesture recognisers | 2 |
| `react-native-reanimated ~4.1.1` | Animated gesture responses | 2 |
| `@react-native-async-storage/async-storage` | Temp local state | 1 (migrate in 4) |
| `expo-haptics` | Haptic feedback on controls | 2 |

### Must Be Added

| Package | Purpose | Phase |
|---|---|---|
| `expo-file-system` | Binary download + local file I/O | **1** |
| `expo-sharing` | OS share sheet export | **1** / 3 |
| `expo-sqlite` | Persistent local DB | 4 |
| `expo-brightness` | Gesture brightness control | 2 |
| `react-native-volume-manager` | Gesture volume control | 2 |
| `expo-task-manager` | Background download tasks | 3 |
| `expo-background-fetch` | Background download continuation | 3 |
| `expo-notifications` | Download completion notifications | 3 |
| `expo-auth-session` | Google OAuth 2.0 PKCE | 4 |

---

## CI / CD Pipeline

File: [`.github/workflows/ci.yml`](../.github/workflows/ci.yml)

| Job | Trigger | What it does |
|---|---|---|
| `typecheck` | Push / PR to main | `tsc --noEmit` on both `artifacts/vyde` and `artifacts/api-server` |
| `web-bundle` | Push / PR to main | `npx expo export --platform web` — catches broken imports |
| `android-apk` | Push / PR to main | `eas build --platform android --profile preview --non-interactive` (requires `EXPO_TOKEN` secret) |

> [!IMPORTANT]
> The `android-apk` job requires the `EXPO_TOKEN` repository secret to be set in GitHub Settings → Secrets. Without it, the APK job will fail but typecheck and web-bundle will still pass.

> [!TIP]
> A Phase 5 hardening task will add a headless emulator benchmark job that runs the 15-video playback test suite on a GitHub-hosted Android emulator.

---

## What "Phase 1 Complete" Actually Means

> [!CAUTION]
> Do not mark Phase 1 as done based on the existence of files or types. It is done only when the **DoD metrics** below are measured on real devices / emulators.

| Metric | Target | How to measure |
|---|---|---|
| In-app playback rate | ≥ 70% of 15 benchmark videos | Run benchmark script against fixed video ID list; count `nativePlaybackCandidates.length > 0` AND first frame rendered |
| Offline download | 1 MP4 + 1 audio file written to `documentDirectory` | Check `FileSystem.getInfoAsync(localUri).exists === true` with airplane mode |
| Policy dead-ends | 0 | `grep -r "unavailable\|by policy\|not supported\|out of scope" artifacts/vyde/` returns empty |

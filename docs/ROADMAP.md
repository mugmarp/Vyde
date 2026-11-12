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
| **2** | Player UX — Gestures & Controls | 🟢 Complete | 100% |
| **3** | Offline Downloads — Full Implementation | 🟢 Implemented | 85% |
| **4** | Local Library & Optional Google Auth | ⏳ Next Up | 0% |
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

**Status: 100% Complete — Implemented & Verified in Player Screen.**

### Engineering tasks

| Task | Detail | Status |
|---|---|:---:|
| **Double-tap seek** | Left side seeks $-10$s, right side seeks $+10$s with seek ripple animation and `Haptics.impactAsync` feedback | ✅ Complete |
| **Pan gestures (Volume/Brightness)** | `PanResponder` on player area: left side vertical swipe adjusts brightness (dimming overlay + HUD); right side vertical swipe adjusts volume (`nativePlayer.volume` + HUD) | ✅ Complete |
| **Aspect ratio toggle** | Quick-action pill toggling between `contain` (fit to screen) and `cover` (fill screen) with real-time HUD feedback | ✅ Complete |
| **Speed selector** | Modal supporting 0.25×, 0.5×, 0.75×, 1× (Normal), 1.25×, 1.5×, 1.75×, 2× mapped to `nativePlayer.playbackRate` | ✅ Complete |
| **Quality picker** | Bottom sheet listing all resolved candidates (`allCandidates`) with resolution, contentType badges (HLS, MP4, Adaptive, Offline) | ✅ Complete |
| **Loading / error / retry** | Error overlay with retry button, poster fallback before first frame render | ✅ Complete |

---

## Phase 3 — Offline Downloads: Full Implementation

**Goal:** Background-capable downloads with progress, pause/resume, storage management, share/export, and audio-only mode.

**Status: 85% Complete — Core engine, Audio-only modal, Storage manager, and OS Share Sheet export complete.**

### Detailed Architecture & Engineering Tasks

```text
User initiates download (Progressive MP4 or Audio-only M4A)
  │
  ├──► Format Choice Modal: "Video + Audio (MP4)" vs "Audio Only (M4A)"
  │
  ├──► DownloadManager.start() [services/download/downloadManager.ts]
  │       │
  │       ├──► FileSystem.createDownloadResumable()
  │       │       │
  │       │       ├──► Target: FileSystem.documentDirectory/vyde-downloads/{videoId}.[mp4|m4a]
  │       │       ├──► Progress callback updates AppContext & UI Progress Bar in real-time
  │       │       └──► Savable resume data stored in AsyncStorage on app pause
  │       │
  │       └──► Background Task: TaskManager.defineTask('VYDE_DOWNLOAD_TASK')
  │
  ├──► Storage Management & Analytics:
  │       ├──► Storage footprint card in Library Offline tab displaying total MB used
  │       └──► "Clear all downloads" destructive action to bulk clean offline storage
  │
  └──► OS Share Sheet Integration:
          └──► expo-sharing.shareAsync(localUri) exports raw .mp4/.m4a to device filesystem
```

| Task | Module / Path | Detailed Engineering Specification | Status |
|---|---|---|:---:|
| **Dedicated Audio-Only Mode** | `app/player.tsx` | Format choice sheet on download tap: offers "Video + Audio (MP4)" and "Audio Only (M4A)" saving space and allowing audio listening. | ✅ Complete |
| **OS Share Sheet Export** | `app/(tabs)/library.tsx` | Added share button on completed downloads invoking `expo-sharing.shareAsync(item.uri)` with mimeType for external saving. | ✅ Complete |
| **Storage Visualization & Limits** | `app/(tabs)/library.tsx` | Storage footprint card in Offline tab: shows total MB used, progress gauge, and "Clear all" bulk deletion. | ✅ Complete |
| **Resumable Serialization** | `services/download/downloadManager.ts` | Resumable downloads with `FileSystem.createDownloadResumable()` saving binary media to `documentDirectory/vyde-downloads/`. | ✅ Complete |
| **Background Continuation** | `services/download/downloadManager.ts` | Optional background fetch continuation when app process is paused. | ⏳ In Progress |

### Phase 3 Definition of Done (DoD)
1. Media continues downloading when the user locks their device or switches apps.
2. Interrupted downloads can be resumed without restarting from byte 0.
3. Downloaded `.mp4` and `.m4a` files can be exported to system storage via the OS Share Sheet.

---

## Phase 4 — Local Library & Optional Google OAuth

**Goal:** Relational local persistence for history, likes, saves, playlists, and subscriptions using SQLite. Optional Google OAuth 2.0 PKCE account sync without breaking offline-first behavior.

### Detailed Architecture & Engineering Tasks

```text
Local-First Architecture (Primary)
  │
  ├──► expo-sqlite Database: vyde.db
  │       ├──► Table: history (videoId, title, channel, thumbnail, progress, watchedAt)
  │       ├──► Table: likes (videoId, title, channel, thumbnail, likedAt)
  │       ├──► Table: saves (videoId, title, channel, thumbnail, savedAt)
  │       ├──► Table: playlists (id, name, isPrivate, createdAt)
  │       ├──► Table: playlist_items (playlistId, videoId, position)
  │       └──► Table: subscriptions (channelId, name, thumbnail, subscribedAt)
  │
Optional Google OAuth 2.0 (Secondary - Opt-in via Settings)
  │
  ├──► expo-auth-session / PKCE Flow
  │       ├──► Client ID (Android / iOS / Web)
  │       ├──► Scopes: https://www.googleapis.com/auth/youtube.readonly
  │       └──► Token storage in secure hardware (expo-secure-store)
  │
  └──► Background Account Bridge:
          Imports user's remote playlists and subscribed channels into local SQLite tables.
```

| Task | Module / Path | Detailed Engineering Specification | Status |
|---|---|---|:---:|
| **SQLite Migration** | `context/DatabaseContext.tsx`, `services/db/` | Replace unstructured `AsyncStorage` JSON dumps with `expo-sqlite`. Run initial schema migration creating indexed tables for `history`, `likes`, `saves`, `playlists`, and `subscriptions`. | ⏳ Planned |
| **Local Subscriptions Feed** | `app/(tabs)/subscriptions.tsx`, `services/innertube/` | Allow users to subscribe to channels locally. Store channel IDs in SQLite. Build subscription feed querying InnerTube `/browse` with `browseId` in batch or on-demand. | ⏳ Planned |
| **Watch History Auto-Record** | `app/player.tsx`, `context/DatabaseContext.tsx` | Persist video watch progress every 5 seconds to SQLite `history` table. Resume playback from `lastWatchedProgress` upon reopening. | ⏳ Planned |
| **Optional Google OAuth PKCE** | `services/auth/googleAuth.ts`, `app/(tabs)/profile.tsx` | Implement OAuth 2.0 PKCE using `expo-auth-session`. Zero login required by default. When signed in, provide one-way import of YouTube playlists into local SQLite. | ⏳ Planned |
| **Account Sync Indicator** | `app/(tabs)/profile.tsx` | Display clear privacy badge: "Local-Only Profile (Private)" or "Synced with Google (Read-Only)". | ⏳ Planned |

### Phase 4 Definition of Done (DoD)
1. All user playlists, watch history, and liked videos survive complete app restarts and cache purges via SQLite.
2. Users can follow channels locally and view a dedicated subscriptions feed without a Google account.
3. Signing into Google is strictly opt-in and does not disable any local offline feature.

---

## Phase 5 — Polish, CI, & Production Documentation

**Goal:** A release-ready open-source application with clean docs, reliable CI, automated APK distribution, and an F-Droid build recipe.

### Detailed Engineering Tasks

| Task | Module / Path | Detailed Engineering Specification | Status |
|---|---|---|:---:|
| **CI Headless Benchmark Job** | `.github/workflows/ci.yml` | Add automated GitHub Actions job running `node scripts/benchmark_phase1.mjs` against live YouTube servers to detect any YouTube algorithm breaking changes on pull requests. | ⏳ Planned |
| **F-Droid Build Recipe** | `metadata/com.vyde.android.yml` | Create standard F-Droid packaging metadata with reproducible build instructions, licensing flags (`GPL-3.0` / `MIT`), and anti-feature disclosures. | ⏳ Planned |
| **End-User Sideload Documentation** | `README.md`, `docs/SIDELOAD_GUIDE.md` | Comprehensive guide explaining how to install the compiled `.apk` on Android, enabling developer options, and updating builds. | ⏳ Planned |
| **Architecture Documentation Finalization** | `docs/VYDE_ARCHITECTURE.md` | Final documentation pass synchronizing all API changes, InnerTube client headers, and offline storage models. | ⏳ Planned |
| **Accessibility & Contrast Pass** | All UI screens | Audit font scaling, minimum tap targets ($\ge 44 \times 44$ pt), VoiceOver/TalkBack `accessibilityLabel` tags across all icons and controls. | ⏳ Planned |

### Phase 5 Definition of Done (DoD)
1. GitHub Actions automatically builds release-ready `.apk` artifacts on Git tags.
2. Benchmark script passes automatically in CI pipeline.
3. Complete documentation exists enabling any user to build or sideload the application.

---

## Architecture Decisions (Locked)

| Decision | Choice | Rationale |
|---|---|---|
| **Primary data source** | Direct InnerTube (`/youtubei/v1/*`) | Zero official quota; anonymous access |
| **Primary playback path** | IOS client (`20.01.1`) $\rightarrow$ HLS `.m3u8` | AVPlayer + ExoPlayer natively support HLS adaptive; no manual merging |
| **Secondary fallback** | VisionOS (`0.1`) + Android VR (`1.60.19`) | Unthrottled HLS master manifests and direct progressive MP4 streams |
| **Cipher deciphering** | Runtime JS extraction from `base.js` | Resolves `signatureCipher` & `n`-param unthrottling; cached per player ID |
| **Offline storage** | `expo-file-system` $\rightarrow$ `documentDirectory/vyde-downloads/` | Native file I/O, resumable, cross-platform |
| **Local DB** | `expo-sqlite` (Phase 4) | Relational queries; structured transactions replacing AsyncStorage |
| **Auth** | Optional PKCE, local-first default | Never break offline experience |
| **Distribution** | Sideload / F-Droid / open-source | No Play Store compliance compromises |
| **Express server** | Temporary CORS proxy for web preview | Phased out for native builds; retained only for web dev preview |

---

## Dependency Inventory

### Currently Installed

| Package | Purpose | Phase |
|---|---|:---:|
| `expo-video ~3.0.16` | Native video player engine | 1 |
| `expo-file-system ~18.0.12` | Binary media streaming and sandboxed file I/O | 1 / 3 |
| `expo-sharing ~13.0.5` | OS Share Sheet export for media files | 1 / 3 |
| `expo-haptics ~15.0.8` | Haptic feedback for seek gestures and speed toggles | 2 |
| `react-native-gesture-handler ~2.28.0` | Multi-touch gesture recognizers (pan, pinch, double-tap) | 2 |
| `react-native-reanimated ~4.1.1` | High-performance 60fps animations for controls and ripples | 2 |
| `@react-native-async-storage/async-storage` | Initial local state storage (migrating to SQLite in Phase 4) | 1 |

### To Be Added in Subsequent Phases

| Package | Purpose | Phase |
|---|---|:---:|
| `expo-task-manager` | Background download task continuation | 3 |
| `expo-background-fetch` | Periodic background updates and feed cache | 3 |
| `expo-sqlite` | Relational local database replacing AsyncStorage | 4 |
| `expo-auth-session` | Optional Google OAuth 2.0 PKCE account bridge | 4 |
| `expo-secure-store` | Hardware-encrypted token storage for optional auth | 4 |

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

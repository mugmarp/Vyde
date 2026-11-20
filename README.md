# Vyde 🎬

> A premium, dark-first, client-side mobile YouTube application built with Expo and React Native, inspired by NewPipe and LibreTube.

Vyde delivers a cinematic video discovery and playback experience with zero mandatory API keys, no middleman VPS requirements for core streaming, an intuitive gesture layer, and sandboxed offline downloads.

---

## ✨ Features

- **Cinematic Dark Theme**: Deep `#050507` background, vibrant `#E84A27` accent, and responsive layout.
- **Client-Side Discovery**: High-throughput feeds, trending discovery, and video search powered directly by YouTube's internal InnerTube API without quota restrictions.
- **Native In-App Playback**: Embedded playback powered by `expo-video`, supporting adaptive HLS manifests and direct progressive MP4 streams.
- **Player Gestures & Controls**:
  - Edge swipes for brightness (left) and volume (right).
  - Double-tap seek with animated ripple indicators (±10s).
  - Playback speed controls, quality indicators, and aspect ratio toggles.
- **Offline Download Manager**:
  - Sandboxed video and audio-only downloads.
  - Active download progress tracking, ETA, and queue management.
  - OS Share Sheet export for audio/video files.
- **Local-First Privacy**:
  - Likes, watch history, saved items, and playlists remain 100% on your device.
  - No Google account required.
- **Optional Account Sync**:
  - Google OAuth 2.0 PKCE authentication to sync your official YouTube playlists and subscriptions when desired.

---

## 🏗️ Architecture

```text
[ Vyde Expo Mobile Client ]
   ├── Discovery Engine      --> Direct InnerTube (/browse, /search)
   ├── Stream Extractor      --> Direct InnerTube (/player) with multi-client fallbacks (iOS / Android VR / VisionOS)
   ├── In-App Player         --> expo-video (AVPlayer on iOS / ExoPlayer on Android) + Gestures & HUD
   ├── Download Manager      --> expo-file-system (Resumable + Audio-Only M4A) + expo-sharing
   ├── Local Database        --> expo-sqlite (WAL mode: History, Likes, Saves, Playlists, Subscriptions)
   └── Account Bridge        --> Optional Google OAuth 2.0 PKCE (Read-Only)
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 20+
- npm or pnpm
- Expo Go app on iOS / Android, or an iOS Simulator / Android Emulator

### Installation & Running

```bash
# 1. Install dependencies
pnpm install
# or: npm install

# 2. Run the Expo mobile app
cd artifacts/vyde
npx expo start

# 3. Optional: Run the API helper server (for web browser CORS proxying)
cd artifacts/api-server
npm run dev
```

### Environment Variables (Optional)
- `EXPO_PUBLIC_API_URL`: URL of the API helper server (defaults to `http://localhost:3000`).
- No external API keys are required for browsing, searching, or watching videos.

---

## 📁 Repository Layout

- `artifacts/vyde/`: The main Expo / React Native mobile application.
  - `app/`: Expo Router screens (`(tabs)`, `player.tsx`, `settings.tsx`).
  - `components/`: Video card, error boundaries, UI elements.
  - `context/`: Local-first app state (`AppContext.tsx`).
  - `services/innertube/`: Client-side InnerTube client and stream extraction engine.
  - `constants/`: Theme colors and visual tokens.
- `artifacts/api-server/`: Express backend helper service for web CORS proxying.
- `artifacts/mockup-sandbox/`: Reference visual designs and mockup components.
- `docs/`: Architecture specifications, roadmap, and handover notes:
  - [`docs/CRITICAL_ANALYSIS_HANDOVER.md`](docs/CRITICAL_ANALYSIS_HANDOVER.md) — Technical risks, PoToken/DASH strategy, and milestone DoD.
  - [`docs/VYDE_ARCHITECTURE.md`](docs/VYDE_ARCHITECTURE.md) — Complete architecture and system diagrams.

---

## 🚦 Roadmap & Milestones (All Phases Complete)

- **Phase 0: Cleanup & Honesty (100%)** — Stripped defensive policy blocks, established clean CI foundation and unconstrained architecture.
- **Phase 1: Reliable Playback & Real Downloads (100%)** — InnerTube multi-client cascade, dynamic signature deciphering & `n`-unthrottling engine. Live benchmark validated at **80.0% pass rate** ([Benchmark Report](docs/PHASE_1_BENCHMARK_REPORT.md)).
- **Phase 2: Player UX Gestures & Controls (100%)** — Double-tap seek with ripple effects, vertical pan swipe controls for brightness and volume, HUD overlays, quality selector, and aspect ratio switching.
- **Phase 3: Offline Media Suite (100%)** — Native resumable download manager, Audio-Only (`.m4a`) downloads, storage footprint visualization, and OS Share Sheet export.
- **Phase 4: SQLite Database & Account Bridge (100%)** — Relational `expo-sqlite` database with WAL mode for history, likes, and local channel subscriptions. Optional Google OAuth 2.0 PKCE account bridge.
- **Phase 5: Release Engineering & F-Droid (100%)** — F-Droid metadata recipe ([`metadata/com.vyde.android.yml`](metadata/com.vyde.android.yml)), CI benchmark suite, and [Sideloading Guide](docs/SIDELOAD_GUIDE.md).

For complete technical specifications, see [`docs/ROADMAP.md`](docs/ROADMAP.md).

---

## 📲 Sideloading & Installation

Vyde is distributed independently without Google Play Store restrictions:
- **Direct Sideload**: Download pre-compiled `.apk` builds from GitHub Releases or GitHub Actions and follow the [Sideload Guide](docs/SIDELOAD_GUIDE.md).
- **F-Droid**: Build recipe provided in [`metadata/com.vyde.android.yml`](metadata/com.vyde.android.yml).

---

## ⚙️ CI/CD & Build Pipeline

Building and verification are managed automatically via GitHub Actions:
- **Typecheck & Lint**: Runs on every commit and pull request to verify all packages.
- **Web Preview Bundle**: Automatically exports and uploads the web preview bundle.
- **Android APK Build**: Builds debug/sideloadable APKs on tags and manual dispatch.

---

## 📄 License
MIT

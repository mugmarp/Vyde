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
   ├── Stream Extractor      --> Direct InnerTube (/player) with multi-client fallbacks
   ├── In-App Player         --> expo-video (AVPlayer on iOS / ExoPlayer on Android)
   ├── Download Manager      --> expo-file-system + expo-sharing
   └── Local State Store     --> AsyncStorage (History, Playlists, Catalog, Likes)
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
- `docs/`: Architecture specifications and runbooks.

---

## 📄 License
MIT

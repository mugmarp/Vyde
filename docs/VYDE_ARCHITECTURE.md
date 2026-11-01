# Vyde — Product & Architecture

Vyde is a premium, dark-first mobile client for YouTube built with Expo and React Native. It provides a focused, cinematic video discovery and watching experience inspired by open-source clients such as NewPipe and LibreTube.

---

## 1. Product Vision

- **Cinematic Dark-First UI**: Near-black (`#050507`), custom typography (Outfit), high contrast, and refined micro-interactions.
- **Zero-Quota Discovery**: High-volume video discovery, search, and trending feeds sourced directly via internal InnerTube endpoints, operating without official Data API v3 quotas or third-party proxy dependencies.
- **True In-App Playback**: Native video streaming using `expo-video` supporting adaptive HLS manifests, progressive MP4 streams, and multi-client resolution fallbacks (`ANDROID`, `IOS`, `TV_EMBEDDED`, `WEB`).
- **Complete Gesture Layer**: Modern video player conventions including edge swipes for brightness and volume, double-tap seek ripples, and pinch-to-toggle aspect ratio (fit/fill).
- **Sandboxed Offline Downloads**: In-app download manager for video and audio-only media with background downloads, storage visualization, progress tracking, and OS share-sheet export.
- **Local-First Privacy**: Watch history, playlists, liked videos, and subscriptions are stored locally on the device by default.
- **Optional Account Sync**: Optional Google OAuth 2.0 PKCE authentication allowing users to sync their YouTube account playlists, subscriptions, and likes via YouTube Data API v3.

---

## 2. System Architecture

```text
+--------------------------------------------------------------------------+
|                               Vyde Mobile Client                          |
|                                                                          |
|  +--------------------+  +--------------------+  +--------------------+  |
|  |     Home Feed      |  |   Explore/Search   |  |   In-App Player    |  |
|  +--------------------+  +--------------------+  +--------------------+  |
|  |  Download Manager  |  |   Local Playlists  |  |  Settings & Sync   |  |
|  +--------------------+  +--------------------+  +--------------------+  |
|                                                                          |
|  +--------------------------------------------------------------------+  |
|  |                     Client-Side InnerTube Engine                   |  |
|  |  • Multi-Client Contexts (ANDROID / IOS / TV_EMBEDDED / WEB)       |  |
|  |  • Stream Resolution (HLS Master Playlists, Progressive MP4s)      |  |
|  |  • Cipher Deciphering & Parameter Transformations                 |  |
|  +--------------------------------------------------------------------+  |
+--------------------------------------------------------------------------+
             |                                             |
             | Direct HTTPS (Client-Side)                  | Direct CDN Stream
             v                                             v
  +--------------------+                       +------------------------+
  |  YouTube InnerTube |                       | googlevideo.com CDN    |
  |  /browse, /search, |                       | HLS (.m3u8), MP4, M4A  |
  |  /player, /next    |                       +------------------------+
  +--------------------+
             |
             | Optional Authenticated Path (PKCE)
             v
  +----------------------------------+
  | YouTube Data API v3 (Sync Only)   |
  | playlists, subscriptions, rating |
  +----------------------------------+
```

---

## 3. Playback & Stream Resolution Strategy

YouTube serves media through multiple client configurations. Vyde employs a cascaded client resolution strategy:

1. **ANDROID Context (`com.google.android.youtube/19.29.37`)**:
   - Queries `/youtubei/v1/player`.
   - Often provides direct progressive MP4 streams with audio and clean HLS manifests.
2. **IOS Context (`com.google.ios.youtube/19.29.1`)**:
   - Yields adaptive HLS master manifests (`.m3u8`) natively supported by iOS AVPlayer and Android ExoPlayer via `expo-video`.
3. **TV_EMBEDDED / WEB Context**:
   - Provides backup DASH streaming manifests and progressive video fallbacks.
4. **Playback Candidates Priority**:
   - **HLS Manifests**: Preferred for adaptive bitrate, native audio/video synchronization, and scrubbing efficiency.
   - **Progressive MP4 (with audio)**: Secondary candidate for offline downloads and direct seeking.
   - **Audio Streams (M4A/MP3)**: For background audio and audio-only offline export.
   - **YouTube Watch Fallback**: Clean fallback button when network or playback issues occur.

---

## 4. Local-First Data & Offline Media

- **Storage**: AsyncStorage / SQLite for persistent storage of local playlists, video metadata catalog, playback positions, and watch history.
- **Offline Downloads**: Downloaded items reside in sandboxed app storage managed by `expo-file-system`.
- **Exporting**: Users can export completed downloads to the system files or share via `expo-sharing`.

---

## 5. Development & Running

### Mobile App (`artifacts/vyde`)
```bash
# Run locally with Expo
cd artifacts/vyde
npx expo start

# Run with web preview
npx expo start --web
```

### Environment Configuration
- `EXPO_PUBLIC_API_URL`: Optional URL override for the Express helper server (defaults to local `http://localhost:3000` when running hybrid web).
- No mandatory API keys are required for anonymous discovery, search, and playback.

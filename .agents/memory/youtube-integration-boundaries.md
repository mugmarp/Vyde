---
name: YouTube integration boundaries
description: Core architectural requirements and milestones for Vyde as a full client-side YouTube app.
---

Vyde is a dark-first, privacy-respecting client-side YouTube alternative application inspired by NewPipe, LibreTube, and Piped.

**Core Architecture & Vision:**
1. **Discovery**: Direct client-side InnerTube requests (`/youtubei/v1/browse`, `/youtubei/v1/search`) using mobile client contexts (`ANDROID`, `IOS`) without consuming official Data API v3 quotas.
2. **Playback**: In-app native video and audio playback using `expo-video` backed by InnerTube player stream resolution (`/youtubei/v1/player`). Streams include adaptive HLS manifests, progressive MP4s, and adaptive audio formats with multi-client fallbacks (`ANDROID`, `IOS`, `TV_EMBEDDED`, `WEB`).
3. **Offline Media**: Local sandboxed download manager using `expo-file-system` and `expo-sharing` supporting video and audio-only formats, download progress, and OS share-sheet exports.
4. **Local-First State**: Device-local persistence for watch history, liked videos, saved videos, local playlists, and local subscriptions.
5. **Account Bridge (Optional)**: Optional Google OAuth 2.0 PKCE authentication for syncing playlists, likes, and subscriptions via YouTube Data API v3, isolated strictly to authenticated user actions.

**Execution Milestones:**
- Phase 0: Cleanup, remove defensive rationalizations, establish local-first portability.
- Phase 1: Reliable client-side InnerTube discovery and in-app native video playback.
- Phase 2: Full player UX (gestures for volume/brightness, seek ripples, aspect ratio, quality/speed controls).
- Phase 3: Sandboxed download manager with progress tracking and export.
- Phase 4: Local subscriptions, playlist management, and optional Google OAuth 2.0 PKCE.
- Phase 5: Documentation and cross-platform verification.

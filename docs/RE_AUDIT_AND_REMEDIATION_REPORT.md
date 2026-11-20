# Deep Re-Audit & Remediation Report

**Date:** 2026-11-20  
**Repository:** [https://github.com/mugmarp/Vyde](https://github.com/mugmarp/Vyde)  
**Branch:** `main`  
**Commits:** `8408bd8`, `3563daa`, `8211a37`

---

## 1. Executive Summary

Following the initial delivery of Roadmap Phases 0 through 5, a comprehensive, deep line-by-line audit was conducted across the entire Vyde codebase. This audit uncovered several critical runtime edge cases, touch responder conflicts, silent stream playback scenarios, and local state persistence desynchronizations.

All identified flaws were organized into 3 phased releases and resolved on `origin/main`:
- **Phase A (Commit `8408bd8`)**: InnerTube Cascade Validation, Player ID Fallback, Modernized Express Proxy Clients.
- **Phase B (Commit `3563daa`)**: Gesture Conflicts Resolution, Silent Adaptive Audio Elimination, Seek Preservation, MP4 Download Integrity.
- **Phase C (Commit `8211a37`)**: SQLite Relational Playlist Synchronization, Native Video Catalog Hydration.

---

## 2. Issues Diagnosed and Resolved

### 2.1 Cascade Premature Return on HTTP 200 Unplayable Responses
* **Subsystem:** [`artifacts/vyde/services/innertube/innertubeClient.ts`](file:///home/mark/Vibes/Vyde/artifacts/vyde/services/innertube/innertubeClient.ts) & [`playerExtractor.ts`](file:///home/mark/Vibes/Vyde/artifacts/vyde/services/innertube/playerExtractor.ts)
* **Problem:** YouTube returns HTTP `200 OK` even when a video has `LOGIN_REQUIRED`, `UNPLAYABLE`, or botguard restrictions for a given client (e.g. `IOS`). Previously, `postWithCascade` returned immediately on any truthy response, aborting before trying `VISIONOS` or `ANDROID_VR`.
* **Fix:** Implemented an optional `validator?: (data: T) => boolean` predicate in `postWithCascade`. In `playerExtractor.ts`, the cascade validates `status === 'OK'` and verifies that streaming formats exist before accepting a response. If invalid, it continues down the cascade.

### 2.2 Dynamic Player ID Fallback for Signature Deciphering
* **Subsystem:** [`artifacts/vyde/services/innertube/cipher.ts`](file:///home/mark/Vibes/Vyde/artifacts/vyde/services/innertube/cipher.ts)
* **Problem:** Mobile InnerTube responses omit `assets.js` and have direct Google CDN streaming URLs without `/s/player/` paths. If `extractPlayerId` returned `null`, signature deciphering was skipped and formats returned HTTP 403 Forbidden.
* **Fix:** Implemented `getOrFetchPlayerId()` with automatic fallback to `https://www.youtube.com/iframe_api`. Extracted player IDs are cached globally across video requests.

### 2.3 Express Proxy Obsolete 2024 Clients Upgraded
* **Subsystem:** [`artifacts/api-server/src/routes/youtube.ts`](file:///home/mark/Vibes/Vyde/artifacts/api-server/src/routes/youtube.ts)
* **Problem:** The Express helper server still held deprecated 2024 versions (`ANDROID: 19.29.37` and `IOS: 19.29.1`), which caused YouTube to return `400 FAILED_PRECONDITION` on web preview proxy calls.
* **Fix:** Upgraded clients to modern 2026 versions: `IOS 20.01.1`, `ANDROID 20.03.36`, and added `VISIONOS 0.1`.

### 2.4 `PanResponder` Stealing Touches from Player Controls & Double-Tap
* **Subsystem:** [`artifacts/vyde/app/player.tsx`](file:///home/mark/Vibes/Vyde/artifacts/vyde/app/player.tsx)
* **Problem:** `playerPanResponder` had `onStartShouldSetPanResponder: () => true`, capturing the gesture lock on `ACTION_DOWN` and preventing the parent `TouchableOpacity` from ever receiving touch taps. Double-tap seek ($\pm 10$s) and overlay toggling were completely disabled.
* **Fix:** Set `onStartShouldSetPanResponder: () => false` and `onStartShouldSetPanResponderCapture: () => false`. Set `onMoveShouldSetPanResponder` to require vertical swipe distance $> 12$px (`Math.abs(dy) > 12 && Math.abs(dy) > Math.abs(dx) * 1.5`), allowing taps to pass through to controls.

### 2.5 Silent Video Playback from `adaptive-video` Streams Eliminated
* **Subsystem:** [`artifacts/vyde/app/player.tsx`](file:///home/mark/Vibes/Vyde/artifacts/vyde/app/player.tsx)
* **Problem:** `adaptive-video` streams from YouTube InnerTube are DASH video-only elementary streams with no audio track. Passing them to `expo-video` caused silent playback.
* **Fix:** Filtered default playback candidates to only full audio+video containers (HLS `.m3u8` and progressive MP4). If only video-only streams exist, they are explicitly tagged as `(No Audio)` in the Quality modal.

### 2.6 Preserving Timestamp Across Stream Quality Changes
* **Subsystem:** [`artifacts/vyde/app/player.tsx`](file:///home/mark/Vibes/Vyde/artifacts/vyde/app/player.tsx)
* **Problem:** Changing stream quality in the Quality sheet replaced the player source, resetting `currentTime` back to `0:00`.
* **Fix:** Captured `nativePlayer.currentTime` prior to quality switch and restored position automatically in `onFirstFrameRender`. Also ensured user playback rate (`speed`) is re-applied to the new source.

### 2.7 Download Candidate Selection Guarded from HLS Manifests
* **Subsystem:** [`artifacts/vyde/app/player.tsx`](file:///home/mark/Vibes/Vyde/artifacts/vyde/app/player.tsx)
* **Problem:** Tapping "Download MP4" fell back to `playbackCandidates[0]`, which was often an HLS `.m3u8` text playlist URL, saving a 2KB text file as `.mp4`.
* **Fix:** Strictly restricted MP4 downloads to binary progressive streams (`contentType === 'progressive'`). If only HLS is available, the UI guides the user to the Audio-Only format.

### 2.8 Local Playlists Synchronized with SQLite Database
* **Subsystem:** [`artifacts/vyde/context/AppContext.tsx`](file:///home/mark/Vibes/Vyde/artifacts/vyde/context/AppContext.tsx)
* **Problem:** Playlist operations (`createPlaylist`, `addVideoToPlaylist`, `removeVideoFromPlaylist`, `deletePlaylist`) updated React state and `AsyncStorage` but never called the corresponding SQLite methods. On native restarts, `Db.fetchAllPlaylists()` wiped out all session changes.
* **Fix:** Connected `Db.createNewPlaylist`, `Db.addVideoToPlaylistDb`, `Db.removeVideoFromPlaylistDb`, and `Db.removePlaylist` directly to `AppContext` actions.

### 2.9 Native Video Catalog Hydration
* **Subsystem:** [`artifacts/vyde/context/AppContext.tsx`](file:///home/mark/Vibes/Vyde/artifacts/vyde/context/AppContext.tsx)
* **Problem:** In native mode (`if (db)`), `AppContext` skipped reading `STORAGE_KEYS.catalog`, leaving `videoCatalog` empty and causing saved/liked videos to render without titles or thumbnails.
* **Fix:** Added `AsyncStorage.getItem(STORAGE_KEYS.catalog)` to the native SQLite hydration block.

---

## 3. Commit Verification

```bash
8211a37 fix(db,library): synchronize playlist mutations with SQLite and hydrate video catalog
3563daa fix(player): resolve PanResponder gesture conflicts, eliminate silent adaptive playback, preserve seek position, and protect MP4 downloads
8408bd8 fix(innertube,proxy): add cascade playability validation, dynamic player ID fallback, and modernize proxy clients
```

All 3 phases have been committed, verified, and pushed to `main`.

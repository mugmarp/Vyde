# Phase 4 Architecture: Local SQLite Database & Optional Account Bridge

## 1. Overview & Privacy Guarantees

In accordance with Vyde's core ethos as an honest, privacy-first, client-side mobile client (inspired by NewPipe and LibreTube), **Phase 4** replaces ephemeral or plain key-value web storage with an indexed, robust, on-device **SQLite** database while introducing an **optional, read-only Google OAuth 2.0 PKCE account bridge**.

### Core Guarantees:
- **Zero Mandatory Accounts**: Vyde works completely anonymously out-of-the-box. Users never need to register or sign in to browse, watch, bookmark, organize playlists, or download media.
- **Strictly Local Persistence**: History, likes, saves, playlists, and channel subscriptions are saved in an isolated SQLite database file on the device (`documentDirectory/SQLite/vyde_v1.db`).
- **Zero Telemetry / Tracking**: No analytic beacons, tracking cookies, or remote logging exist.
- **Seamless Web & Native Compatibility**: Transparent fallback to `AsyncStorage` on web runtimes, and automatic schema migration from legacy storage keys to SQLite on first launch.

---

## 2. SQLite Database Schema & Indices

The database layer is located in [`artifacts/vyde/services/db/database.ts`](file:///home/mark/Vibes/Vyde/artifacts/vyde/services/db/database.ts).

### PRAGMA Configuration
```sql
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
```
Write-Ahead Logging (WAL) ensures high concurrency and fast write throughput during rapid seek/watch events.

### Tables

1. **`history`**
   ```sql
   CREATE TABLE IF NOT EXISTS history (
     video_id TEXT PRIMARY KEY,
     title TEXT NOT NULL,
     channel TEXT NOT NULL,
     thumbnail TEXT NOT NULL,
     duration TEXT NOT NULL,
     progress REAL NOT NULL DEFAULT 0,
     watched_at INTEGER NOT NULL
   );
   CREATE INDEX IF NOT EXISTS idx_history_watched ON history (watched_at DESC);
   ```

2. **`likes`**
   ```sql
   CREATE TABLE IF NOT EXISTS likes (
     video_id TEXT PRIMARY KEY,
     title TEXT,
     channel TEXT,
     thumbnail TEXT,
     created_at INTEGER NOT NULL
   );
   CREATE INDEX IF NOT EXISTS idx_likes_created ON likes (created_at DESC);
   ```

3. **`saves`**
   ```sql
   CREATE TABLE IF NOT EXISTS saves (
     video_id TEXT PRIMARY KEY,
     title TEXT,
     channel TEXT,
     thumbnail TEXT,
     created_at INTEGER NOT NULL
   );
   CREATE INDEX IF NOT EXISTS idx_saves_created ON saves (created_at DESC);
   ```

4. **`playlists` & `playlist_items`**
   ```sql
   CREATE TABLE IF NOT EXISTS playlists (
     id TEXT PRIMARY KEY,
     name TEXT NOT NULL,
     created_at INTEGER NOT NULL
   );

   CREATE TABLE IF NOT EXISTS playlist_items (
     playlist_id TEXT NOT NULL,
     video_id TEXT NOT NULL,
     added_at INTEGER NOT NULL,
     PRIMARY KEY (playlist_id, video_id),
     FOREIGN KEY (playlist_id) REFERENCES playlists (id) ON DELETE CASCADE
   );
   ```

5. **`subscriptions`**
   ```sql
   CREATE TABLE IF NOT EXISTS subscriptions (
     channel_id TEXT PRIMARY KEY,
     name TEXT NOT NULL,
     thumbnail TEXT NOT NULL,
     subscribed_at INTEGER NOT NULL
   );
   CREATE INDEX IF NOT EXISTS idx_subs_subscribed ON subscriptions (subscribed_at DESC);
   ```

---

## 3. Subscriptions Management

### Player Integration
On the video player screen ([`artifacts/vyde/app/player.tsx`](file:///home/mark/Vibes/Vyde/artifacts/vyde/app/player.tsx)), the channel header now includes an interactive follow pill:
- Displays **"Follow"** with an orange accent outline when not subscribed.
- Displays **"Following"** with dark elevated styling and checkmark when subscribed.
- Triggers haptic feedback (`Haptics.ImpactFeedbackStyle.Medium`) and synchronizes with SQLite in background.

### Profile & Management
In [`artifacts/vyde/app/(tabs)/profile.tsx`](file:///home/mark/Vibes/Vyde/artifacts/vyde/app/(tabs)/profile.tsx):
- **Stat Pill**: Added `Following` count pill alongside History, Liked, and Saved.
- **Channel Preview**: Displays top followed channels directly on the Profile screen with channel avatars and quick unsubscribe.
- **Management Modal**: A dedicated presentation sheet lists all followed channels, complete with channel avatars, fallback letter avatars, and one-tap unfollow confirmations.

---

## 4. Optional Google OAuth 2.0 PKCE Account Bridge

The bridge service is implemented in [`artifacts/vyde/services/auth/googleAuth.ts`](file:///home/mark/Vibes/Vyde/artifacts/vyde/services/auth/googleAuth.ts).

### Design:
- **Authorization Code with PKCE**: Uses standard Proof Key for Code Exchange supported by `expo-auth-session` and `expo-crypto`.
- **Read-Only Scopes**: Only requests `https://www.googleapis.com/auth/youtube.readonly` and `openid email profile`. Never requests write access or permissions to modify the user's remote Google account.
- **Profile Status UI**:
  - Unconnected: Shows "Local Private Profile" badge, emphasizing 100% on-device operation.
  - Connected: Displays Google profile avatar, user display name, email, and a secure "Disconnect" action that wipes cached tokens and profile data immediately.

---

## 5. Settings & Local Data Control

In [`artifacts/vyde/app/settings.tsx`](file:///home/mark/Vibes/Vyde/artifacts/vyde/app/settings.tsx):
- Displays live counts for **Subscribed channels** and **Watch history**.
- Displays storage engine: `SQLite (WAL)` on native, `AsyncStorage` on web.
- Includes granular data clearing:
  - **Clear watch history**: Purges SQLite `history` table while keeping likes, saves, playlists, and subscriptions intact.
  - **Clear all Vyde data**: Completely purges all local tables (`history`, `likes`, `saves`, `playlists`, `playlist_items`, `subscriptions`) and local app state.

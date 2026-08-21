# Vyde — Product Description and Architecture

## 1. Product description

Vyde is a premium, dark-first mobile YouTube client built with Expo and React Native. Its purpose is to make YouTube discovery, watching, and personal organization feel more focused and cinematic than a conventional feed.

The main product surfaces are:

- **Home** — popular YouTube videos, category filters, and continuation shelves.
- **Explore** — YouTube search and discovery categories.
- **Video** — metadata, channel information, actions, comments, and an official YouTube viewing handoff.
- **Library** — saved items, playlists, and the download-manager experience.
- **Profile** — signed-out and signed-in account states, subscriptions, and liked content.
- **Settings** — playback, appearance, downloads, gesture, account, and about settings.
- **Sign in** — the entry point for future per-user Google/YouTube authorization.

The visual language is near-black (`#050507`) with an orange-red Vyde accent (`#E84A27`) and Outfit typography.

## 2. Repository layout

```text
artifacts/
  vyde/                         # Expo mobile application
    app/                        # Expo Router routes/screens
      (tabs)/                   # Home, Explore, Library, Profile
      player.tsx                # Video detail/player surface
      settings.tsx              # Settings
      sign-in.tsx               # Sign-in entry point
    api/youtube.ts              # Mobile YouTube API client
    components/                 # Shared React Native components
    context/                    # Local app and auth state
    data/mockData.ts            # Prototype-only fallback/content fixtures
    constants/colors.ts         # Theme tokens
    assets/                     # App icon and generated visual assets

  api-server/                   # Express API service
    src/routes/youtube.ts       # YouTube connector proxy endpoints
    src/routes/index.ts         # Route registration
    src/app.ts                  # Express app setup
    src/index.ts                # Server entry point

  mockup-sandbox/               # Earlier visual mockup/design artifact

docs/
  VYDE_ARCHITECTURE.md          # This document
```

## 3. Runtime architecture

```text
Expo / React Native mobile app
          |
          | HTTPS REST requests
          | EXPO_PUBLIC_DOMAIN/api/youtube/*
          v
Express API server
          |
          | Replit connector proxy
          v
YouTube Data API v3
```

### Mobile application

The mobile app uses Expo Router's file-based routing. The root layout loads fonts, safe-area support, error handling, React Query's provider, authentication context, app context, and gesture/keyboard providers.

Shared state is intentionally split:

- `AuthContext` — current local authentication state and user presentation data.
- `AppContext` — local likes, saves, playlists, and download-manager state.
- `useState` — screen-local state such as search text, player controls, loading indicators, and selected filters.
- React Query is available at the root and should become the preferred home for server-backed cache/state as the API surface grows.

### API server

The Express service is the trust boundary for YouTube connector access. The mobile client calls the server and never receives connector credentials.

Current routes:

| Route | Purpose |
| --- | --- |
| `GET /api/youtube/feed` | Fetches YouTube `mostPopular` video metadata |
| `GET /api/youtube/search?q=...` | Searches YouTube videos |
| `GET /api/youtube/videos/:id` | Fetches video details, statistics, duration, and watch URL |

The server normalizes YouTube responses into app-friendly objects containing fields such as `id`, `title`, `description`, `channel`, `thumbnail`, and `watchUrl`.

## 4. Current data flows

### Home feed

1. Home mounts and calls `fetchLiveFeed()`.
2. The mobile client requests `/api/youtube/feed`.
3. The API server calls YouTube through the Replit connector.
4. The server maps the response into `LiveVideo` objects.
5. Home renders loading, live results, empty, or retry/error states.

### Search

1. The user enters at least two characters.
2. Search waits briefly after typing to avoid issuing a request for every keystroke.
3. The client calls `/api/youtube/search?q=...`.
4. Results are mapped into shared `VideoCard` data.
5. Quota and connector failures are shown as an explicit error state.

### Video viewing

1. A video ID is passed to the `/player` route.
2. For a live YouTube ID, the screen requests `/api/youtube/videos/:id`.
3. Vyde displays the returned metadata and opens the official YouTube watch URL when the user selects **Watch on YouTube**.
4. The app must not represent a YouTube Data API response as a playable stream URL.

## 5. What is prototype-only today

The following areas are UI/state prototypes and should not be described as complete YouTube synchronization:

- `AuthContext` currently persists a local simulated sign-in state.
- Some profile, playlist, comments, continuation, and download-manager content comes from `mockData.ts`.
- Likes and saves currently update local state only.
- The download UI represents local download state, but no official YouTube media download pipeline exists.
- Player controls and progress are retained for the original design prototype; live YouTube results use the official YouTube handoff instead of an extracted stream.

## 6. Recommended production architecture

### Per-user authentication

For a published multi-user app, replace local simulated sign-in with an actual Google OAuth flow using the correct YouTube scopes. The server should:

1. Start the user authorization flow.
2. Receive the OAuth callback.
3. Store encrypted, server-side refresh-token material.
4. Associate the YouTube account with the app user.
5. Proxy only the permitted user-scoped operations.
6. Revoke/delete tokens on account disconnect.

The currently attached Replit YouTube connection is environment-level authorization. It is useful for development and connector-backed server calls, but it is not automatically a complete per-user identity system for a deployed app.

### Server-backed YouTube features

Add normalized routes for:

- `videos` and channel details
- comments and replies
- liked videos
- playlists and playlist items
- subscriptions
- rating/like mutations where scopes permit them

Each route should validate IDs and query parameters, return a stable Vyde response shape, and preserve upstream quota/auth errors instead of returning fabricated data.

### Server state and caching

Use React Query for feed/search/video-detail requests with:

- short stale times for feed/search results
- query-keyed caching by search term and video ID
- retry only for transient network errors, not quota or authorization errors
- cancellation of stale search requests

### Offline behavior

The official YouTube Data API does not provide third-party stream URLs or downloadable video files. Therefore the production design should choose one of these explicit directions:

1. Keep Vyde as an online discovery/client experience and remove claims of permanent YouTube downloads.
2. Integrate an officially permitted YouTube offline/playback capability if YouTube makes one available for the target platform and use case.
3. Support offline storage only for app-owned metadata, thumbnails, and user-created local content—not extracted YouTube media.

## 7. Operational constraints

- YouTube API quota is a runtime dependency. Search and feed calls can fail even when the code is correct.
- Never put API keys, connector credentials, OAuth tokens, or refresh tokens in the mobile bundle, source files, logs, or chat.
- `EXPO_PUBLIC_DOMAIN` is the mobile-to-server routing configuration; do not hardcode localhost or a production hostname in the app.
- Restart the API workflow after server route/dependency changes.
- Run both package typechecks after changes:

```bash
pnpm --filter @workspace/api-server run typecheck
pnpm --filter @workspace/vyde run typecheck
```

## 8. Definition of “production-ready”

Vyde should only be called production-ready after:

- live feed/search/video requests work with an available YouTube quota;
- per-user OAuth is implemented and tested;
- account-scoped reads/writes respect YouTube scopes and consent;
- local prototype data is removed or clearly isolated from production paths;
- playback behavior uses an officially supported mechanism;
- download claims are removed or backed by an officially supported offline capability;
- API error, quota, loading, empty, and retry states are covered across mobile screens.
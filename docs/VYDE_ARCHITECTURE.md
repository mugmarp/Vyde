# Vyde — product and architecture

## Product

Vyde is an Expo/React Native mobile frontend for discovering YouTube videos through a configurable third-party Piped API. It gives users live search, trending discovery, video details, comments, related videos, and a native playback attempt on Android and iOS. If native playback is unavailable, Vyde opens the video's YouTube watch page.

The app does not currently connect a user's YouTube account. Likes, saves, playlists, and watch history are stored locally on the device and are not synced. YouTube offline downloads are unavailable.

## Workspace layout

- `artifacts/vyde/app/` — Expo Router screens
- `artifacts/vyde/api/youtube.ts` — mobile client and runtime validation for normalized API responses
- `artifacts/vyde/context/AppContext.tsx` — device-local likes, saves, playlists, and watch history
- `artifacts/vyde/data/mockData.ts` — legacy design fixtures; production screens must not import seeded content from this file
- `artifacts/api-server/src/routes/youtube.ts` — server-side Piped adapter
- `docs/YOUTUBE_LIVE_CONTENT_RUNBOOK.md` — provider boundary, references, smoke checks, and release qualification

## Request flow

```text
Vyde Expo app
    | HTTPS /api/youtube/*
    v
Express API server
    | PIPED_API_BASE_URL (HTTPS)
    v
Piped-compatible upstream
```

The server defaults to `https://api.piped.private.coffee`, a public third-party instance that returned live responses during implementation. Configure `PIPED_API_BASE_URL` on the API server to use another HTTPS-compatible endpoint. The default instance has no availability or privacy guarantee and is not automatically suitable for a production service.

## API routes

| Route | Purpose |
| --- | --- |
| `GET /api/youtube/feed?region=UG` | Live trending videos |
| `GET /api/youtube/search?q=...` | Live video search |
| `GET /api/youtube/videos/:id` | Live metadata, permitted playback candidates, and related videos |
| `GET /api/youtube/comments/:id` | Live comments |

The API server validates video IDs and query length, requires HTTPS upstream and media URLs, normalizes provider data, and returns explicit errors. It does not substitute mock data on failure.

## Native playback

The Piped adapter exposes HTTPS HLS manifests and progressive MP4 formats marked as containing audio. The mobile client validates the response shape and candidate URL/type again, tries candidates in order, and falls back to the official YouTube watch URL after playback failures. Media URLs are used internally by `expo-video`; the UI does not print or log them, and they are not stored in local history.

Vyde does not implement YouTube `signatureCipher`/`cipher` deciphering, player-JavaScript scraping, PoToken generation, separate audio/video stream assembly, background playback, now-playing notifications, media caching, or offline downloads. A public provider returning candidates is not evidence that the playback path is policy-approved or reliable. Physical Android and iOS verification remains required.

## Screens and local data

- **Home:** live feed, searchable category chips, and recently watched items from local history.
- **Explore:** debounced live search, live trending results, and category queries.
- **Player:** live metadata, real comments, related videos, native playback attempt, and YouTube fallback.
- **Library:** local playlists and an explicit unavailable state for offline YouTube media.
- **Profile:** local device data only; no simulated account, subscriptions, or seeded video previews.
- **Settings:** concise playback/provider and account/local-storage disclosures.

Provider errors and empty responses are visible. There is no fake feed, fake comments, fake account, seeded subscription shelf, fabricated watch progress, or simulated download manager in these production screen paths.

## Operations and checks

- API workflow: `artifacts/api-server: API Server`
- Mobile workflow: `artifacts/vyde: expo`
- The mobile app requires `EXPO_PUBLIC_DOMAIN` to reach the API.
- `PIPED_API_BASE_URL` belongs on the server and must use HTTPS.
- Run:

```bash
pnpm --filter @workspace/api-server run typecheck
pnpm --filter @workspace/vyde run typecheck
```

See `docs/YOUTUBE_LIVE_CONTENT_RUNBOOK.md` for live endpoint smoke checks and physical-device test steps.

## Production gates

Before production use, select and review a provider that the operator is authorized to use, document its privacy/availability implications, and establish failover behavior. Keep any future user OAuth integration separate from anonymous discovery. Do not claim YouTube account synchronization, approved native playback, or offline video support until those features are independently implemented and verified.

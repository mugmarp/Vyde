# Vyde

Vyde is a dark-first Expo mobile client for discovering and watching YouTube content through official YouTube-supported APIs and links.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the Express API server
- `pnpm --filter @workspace/vyde run dev` — run the Expo mobile app
- `pnpm --filter @workspace/api-server run typecheck` — typecheck the API
- `pnpm --filter @workspace/vyde run typecheck` — typecheck the mobile app
- `pnpm run typecheck` — full workspace typecheck where configured
- Required mobile env: `EXPO_PUBLIC_DOMAIN` — the Replit domain used to reach the API server
- The YouTube connection is managed by Replit; do not add API keys to source code or chat.

## Stack

- pnpm workspaces, Node.js 24, TypeScript
- Mobile: Expo, React Native, Expo Router, React Query provider, AsyncStorage
- API: Express + TypeScript, built with esbuild
- External data: Replit YouTube connector proxying YouTube Data API v3
- No database is currently required by Vyde.

## Where things live

- `artifacts/vyde/app/` — Expo Router screens and navigation
- `artifacts/vyde/components/` — shared mobile UI components
- `artifacts/vyde/context/` — local auth, likes, saves, playlists, and download state
- `artifacts/vyde/api/youtube.ts` — mobile client for the YouTube API proxy
- `artifacts/vyde/constants/colors.ts` — Vyde visual tokens
- `artifacts/api-server/src/routes/youtube.ts` — server-side YouTube connector routes
- `artifacts/api-server/src/routes/index.ts` — API route registration
- `artifacts/mockup-sandbox/` — original visual design/mockup artifact
- `docs/VYDE_ARCHITECTURE.md` — full product description, architecture, data flows, and limitations

## Architecture decisions

- YouTube requests go through the Express server rather than directly from the mobile client, keeping connector access server-side.
- Vyde uses official YouTube metadata APIs and official YouTube watch links; it does not extract streams or bypass YouTube playback controls.
- Local-only preferences and UI state use AsyncStorage until a real per-user account architecture is implemented.
- Native mobile discovery uses anonymous Innertube; the web preview uses the API proxy because YouTube blocks browser CORS. All provider failures must remain visible to the user.
- The current YouTube connection authorizes the Replit environment, not automatically every end-user of a future published multi-user app.

## Product

- Dark-first Home feed for popular YouTube videos
- Search and Explore discovery
- Video detail/player surface with official YouTube handoff for live results
- Library, saved items, playlists, profile, settings, and download-manager UI
- Local persistence for prototype preferences and library state
- Planned authenticated YouTube features where the official API and scopes permit them

## User preferences

None recorded.

## Gotchas

- YouTube Data API quota errors are expected operational failures; preserve the visible retry/error state rather than silently substituting mock feed data.
- The official YouTube Data API does not expose third-party downloadable media files or stream URLs. The download UI is not a production offline YouTube downloader.
- The current sign-in and some library/comment content are prototype/local state, not proof of per-user YouTube synchronization.
- Restart the API workflow after changing server routes or server dependencies. Expo normally hot reloads source changes.

## Pointers

- Full architecture: `docs/VYDE_ARCHITECTURE.md`
- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details

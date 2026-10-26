# Vyde

Vyde is a dark-first Expo mobile client for live video discovery through a Piped-compatible provider, with native playback attempts on mobile and YouTube watch-page fallback.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the Express API server
- `pnpm --filter @workspace/vyde run dev` — run the Expo mobile app
- `pnpm --filter @workspace/api-server run typecheck` — typecheck the API
- `pnpm --filter @workspace/vyde run typecheck` — typecheck the mobile app
- `pnpm run typecheck` — full workspace typecheck where configured
- Required mobile env: `EXPO_PUBLIC_DOMAIN` — the Replit domain used to reach the API server
- `EXPO_PUBLIC_DOMAIN` routes the mobile client to the Express API.
- `PIPED_API_BASE_URL` is an optional server-only HTTPS endpoint override. The default is a public third-party instance and is not guaranteed for production use.

## Stack

- pnpm workspaces, Node.js 24, TypeScript
- Mobile: Expo, React Native, Expo Router, React Query provider, AsyncStorage
- API: Express + TypeScript, built with esbuild
- External data: configurable Piped-compatible API through the Express server
- No database is currently required by Vyde.

## Where things live

- `artifacts/vyde/app/` — Expo Router screens and navigation
- `artifacts/vyde/components/` — shared mobile UI components
- `artifacts/vyde/context/` — device-local likes, saves, playlists, and watch history
- `artifacts/vyde/api/youtube.ts` — mobile client for the YouTube API proxy
- `artifacts/vyde/constants/colors.ts` — Vyde visual tokens
- `artifacts/api-server/src/routes/youtube.ts` — server-side Piped adapter routes
- `artifacts/api-server/src/routes/index.ts` — API route registration
- `artifacts/mockup-sandbox/` — original visual design/mockup artifact
- `docs/VYDE_ARCHITECTURE.md` — full product description, architecture, data flows, and limitations

## Architecture decisions

- Video discovery and metadata go through the Express server; the app does not call the provider directly.
- Native Android/iOS playback uses only validated HTTPS HLS or progressive MP4 candidates returned by the Piped adapter; the UI never renders or logs candidate URLs.
- Vyde does not decipher signature-cipher formats, generate PoTokens, scrape player JavaScript, or build an offline downloader. If native playback fails, the app opens the official YouTube watch page.
- Local likes, saves, playlists, and watch history are device-only and are not YouTube account data.
- Provider errors remain visible; the app must not replace them with mock videos.
- The default Piped public instance is a third-party dependency without an availability or privacy guarantee. Review and replace it before production if needed.

## Product

- Dark-first Home feed for live videos from the configured provider
- Search and Explore discovery
- Video detail/player surface with native playback attempt and YouTube watch-page fallback
- Library, device-local playlists, profile, and settings; offline YouTube downloads are unavailable
- Local persistence for device-owned likes, saves, playlists, and watch history

## User preferences

None recorded.

## Gotchas

- Piped public instances can rate-limit or become unavailable; preserve visible retry/error states rather than silently substituting mock feed data.
- Do not present local likes, saves, playlists, or history as YouTube account data.
- Keep YouTube downloads disabled and describe account sync as unavailable until those capabilities are separately implemented and reviewed.
- Restart the API workflow after changing server routes or server dependencies. Expo normally hot reloads source changes.

## Pointers

- Full architecture: `docs/VYDE_ARCHITECTURE.md`
- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details

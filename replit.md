# Vyde

Vyde is a premium, dark-first Expo mobile client for YouTube, inspired by NewPipe and LibreTube. It features client-side InnerTube discovery, native in-app video playback, an intuitive gesture layer, and sandboxed offline downloads.

## Run & Operate

- `pnpm --filter @workspace/vyde run dev` — run the Expo mobile app
- `pnpm --filter @workspace/api-server run dev` — run the Express API helper server
- `pnpm --filter @workspace/vyde run typecheck` — typecheck the mobile app
- `pnpm --filter @workspace/api-server run typecheck` — typecheck the API server

## Stack

- Expo (v54), React Native (0.81), Expo Router, `expo-video`, `react-native-gesture-handler`, `expo-file-system`
- TypeScript, pnpm workspaces
- Express API server (for web browser CORS proxying when needed)
- Direct YouTube InnerTube integration (zero Data API quota)

## Where things live

- `artifacts/vyde/app/` — Expo Router screens and navigation
- `artifacts/vyde/components/` — Shared mobile UI components
- `artifacts/vyde/context/` — Device-local likes, saves, playlists, watch history, and download queue
- `artifacts/vyde/services/innertube/` — Client-side InnerTube discovery and stream extraction
- `artifacts/vyde/api/youtube.ts` — Unified provider adapter
- `artifacts/vyde/constants/colors.ts` — Vyde visual tokens
- `artifacts/api-server/src/routes/youtube.ts` — Server-side InnerTube adapter for web proxying
- `artifacts/mockup-sandbox/` — Visual design references
- `docs/VYDE_ARCHITECTURE.md` — Product specifications and architecture

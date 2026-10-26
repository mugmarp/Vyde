# Vyde live content and playback runbook

## Current implementation

Vyde uses an Express adapter to normalize live discovery and video data from a configurable Piped API. The mobile app calls the existing server routes; it does not make provider requests directly.

- Default upstream: `https://api.piped.private.coffee`
- Override: set `PIPED_API_BASE_URL` on the API server to another HTTPS Piped-compatible endpoint.
- The default public instance returned live data during implementation, but it is a third-party service with no availability guarantee. It can change, rate-limit, or stop responding. Do not treat it as a production commitment.
- The server exposes `/api/youtube/feed`, `/api/youtube/search`, `/api/youtube/videos/:id`, and `/api/youtube/comments/:id`.
- Home, Explore, comments, video details, and related videos use upstream results. Provider errors and empty results remain visible; the app does not substitute seeded mock content.
- Local likes, saves, playlists, and watch history are device-only. They are not a YouTube account or synchronization feature.

## Native playback boundary

The server adapter exposes only HTTPS HLS candidates and progressive MP4 candidates that the Piped response marks as containing audio (`videoOnly: false`). The mobile client validates the video ID, response shape, candidate URL scheme, and supported candidate type before passing a candidate to `expo-video`. If one candidate errors, it tries the next; if all fail, the screen offers the official YouTube watch link.

Vyde does not parse YouTube's raw player response, decipher `signatureCipher`/`cipher`, retrieve player JavaScript, generate PoTokens, combine separate audio/video tracks, or implement an extraction fallback. Playback candidates are used only by the native player: the UI does not render or log media URLs, and local history stores metadata only. Browser preview opens YouTube.

Native playback has **not** been confirmed on physical Android and iOS devices. Until those tests pass:

- Background playback, now-playing controls, and media caching remain off.
- Offline video downloads remain unavailable. The Library and Settings screens say so explicitly.
- Do not call this implementation a YouTube-approved playback or offline-download integration. It is a third-party public-provider adapter and needs a separate policy and provider review before release.

## Research checked

The comparison request was checked against these primary project sources:

- [Invidious source](https://github.com/iv-org/invidious) and [Invidious API documentation](https://docs.invidious.io/api/)
- [Materialious source](https://github.com/Materialious/Materialious)
- [FreeTube source](https://github.com/FreeTubeApp/FreeTube) and [FreeTube Local API documentation](https://docs.freetubeapp.io/usage/local-api)
- [LibreTube website](https://libretube.dev/) and [LibreTube source](https://github.com/Libre-tube/LibreTube)

These projects demonstrate alternative frontend/provider architectures, not a guarantee that any particular public instance, extraction technique, or playback path is stable or permitted for Vyde. The Piped default endpoint was separately smoke-tested for live trending, search, stream details, and comments. That checks current availability only; it is not a policy approval or a device playback test.

No standalone document titled or identifying itself as a formal Software Requirements Specification (SRS) was found in the workspace. The project sources above were checked; a formal SRS cannot be claimed as verified.

## Smoke checks

With the API workflow running, use the development domain:

```bash
curl -fsS "https://${REPLIT_DEV_DOMAIN}/api/youtube/feed?region=UG" \
  | jq '{provider, itemCount: (.items | length), first: (.items[0] | {id,title,channel})}'
curl -fsS "https://${REPLIT_DEV_DOMAIN}/api/youtube/search?q=music" \
  | jq '{provider, itemCount: (.items | length), first: (.items[0] | {id,title,channel})}'
curl -fsS "https://${REPLIT_DEV_DOMAIN}/api/youtube/videos/VIDEO_ID" \
  | jq '{provider,title,playbackCandidates: [.nativePlaybackCandidates[]? | {contentType,qualityLabel}], relatedCount: (.relatedVideos | length)}'
curl -fsS "https://${REPLIT_DEV_DOMAIN}/api/youtube/comments/VIDEO_ID" \
  | jq '{provider,commentCount,returnedComments: (.items | length)}'
```

Do not print, log, or paste the `uri` fields from playback candidates. Use a real video ID for the detail and comments checks.

Run typechecks after changes:

```bash
pnpm --filter @workspace/api-server run typecheck
pnpm --filter @workspace/vyde run typecheck
```

For release qualification, test on physical Android and iOS devices:

1. Open a live result and confirm first frame, audio, play/pause, and seek.
2. Confirm an unsupported or expired candidate advances to another candidate, then falls back to YouTube if needed.
3. Confirm the browser preview opens YouTube rather than playing raw media.
4. Confirm URLs do not appear in UI text, logs, persistent history, or download controls.
5. Confirm the app has no background playback, now-playing notification, or offline media behavior.

## Provider and policy follow-up

Before production use, choose a provider the app operator is authorized to use, review its privacy and terms, and establish availability/failover expectations. Public instances can observe forwarded search terms and video IDs. Do not route user credentials through the anonymous provider. Keep any future YouTube account OAuth flow separate and user-scoped.

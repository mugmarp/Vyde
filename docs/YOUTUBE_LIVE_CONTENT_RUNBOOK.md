# Vyde Live YouTube Content Runbook

This is the execution guide for restoring live YouTube data and completing the migration from prototype content to production-safe behavior.

## Native playback boundary

Vyde has a narrow native playback provider for Android and iOS behind the anonymous Innertube adapter:

- It runs only on native builds; the browser preview continues to use the API proxy and the official YouTube watch handoff.
- It accepts an HTTPS HLS manifest or a directly playable progressive MP4 format that YouTube has already returned.
- Progressive selection requires an MP4 video format with an audio codec and prefers the best broadly supported format up to 1080p.
- `signatureCipher` and `cipher` formats are rejected. Vyde does not decipher signatures, generate PoTokens, scrape player JavaScript, or combine separate adaptive audio/video streams.
- The selected source exists only in the native player process. It is not shown in UI, logged, persisted, sent to account routes, or treated as a download.
- If the player response is `UNPLAYABLE`, has no accepted format, or the native player reports an error, the UI falls back to the official YouTube watch URL.
- Background playback, now-playing controls, caching, and offline media are disabled until a separate policy and device-validation decision.

## Important distinction

There are three different failure modes:

| Failure | What fixes it |
| --- | --- |
| OAuth token expired/revoked | Reconnect the YouTube integration in Replit |
| Connection is authorized but not attached to this environment | Bind/add the existing connection to this environment |
| YouTube project quota is exhausted | Wait for the quota reset, request more quota, or use a different YouTube project/connection |

Reconnecting the same Google account usually refreshes authorization. It does **not** normally increase the daily quota because quota belongs to the Google Cloud project serving the YouTube API requests.

## Part A — Recover access yourself

### 1. Confirm the exact error

With the API workflow running, call:

```bash
curl -sS -i http://localhost:8080/api/youtube/feed
curl -sS -i "http://localhost:8080/api/youtube/search?q=music"
```

Interpret the result:

- `200` with `{ "items": [...] }` means the connection and quota are working.
- `502` with a YouTube quota message means the code is reaching YouTube, but the provider quota is exhausted.
- `401`, `403`, `not connected`, `authentication required`, or token-expired text means inspect/reconnect the integration.
- A connection or network error means check that the API workflow is running before changing code.

Do not change application code to hide a quota error.

### 2. Check Google/YouTube quota

In the Google Cloud project associated with the YouTube API connection:

1. Open **APIs & Services**.
2. Open **YouTube Data API v3**.
3. Open **Quotas** or **Quota usage**.
4. Confirm whether the daily quota is exhausted and note the reset time.
5. Check whether the project has quota restrictions, API restrictions, or an API-disabled state.

If the quota is exhausted:

- Wait for the provider’s next quota reset; or
- Submit a YouTube Data API quota-extension request; or
- Use a separate Google Cloud project that is approved for YouTube Data API v3 and has available quota.

Do not paste an API key, OAuth token, refresh token, or client secret into chat or source files.

### 3. Reconnect in Replit only when appropriate

Use the Replit Project Editor’s integration/connection controls when:

- Replit reports that the YouTube connection is disconnected;
- the provider reports an expired or revoked credential;
- the account needs to grant a missing permission.

After reconnecting, make sure the resulting connection is attached to the current environment. The API server uses the existing server-side YouTube connector; do not install another connector or create a duplicate workflow.

If the connection is healthy but the response is still a quota error, stop reconnecting and resolve quota at the Google/YouTube project level.

### 4. Re-run the smoke tests

After the quota or connection change:

```bash
curl -sS -i http://localhost:8080/api/youtube/feed
curl -sS -i "http://localhost:8080/api/youtube/search?q=music"
curl -sS -i http://localhost:8080/api/youtube/videos/VIDEO_ID
```

Use a real YouTube video ID for the last command. A successful response should contain normalized fields:

```json
{
  "id": "...",
  "title": "...",
  "channel": "...",
  "thumbnail": "...",
  "views": "...",
  "watchUrl": "https://www.youtube.com/watch?v=..."
}
```

## Part B — Ask another AI agent to continue the implementation

Give the next agent this prompt:

> Continue the Vyde live YouTube migration in the existing workspace. Read `docs/VYDE_ARCHITECTURE.md` and `docs/YOUTUBE_LIVE_CONTENT_RUNBOOK.md` first. Do not ask for or print credentials. Do not install a duplicate YouTube connector or create a duplicate workflow.
>
> First run the API smoke tests against `/api/youtube/feed`, `/api/youtube/search?q=music`, and `/api/youtube/videos/VIDEO_ID`. If the API returns a YouTube quota error, stop implementation changes and report the exact provider error. If it returns `401`, `403`, or an authentication error, inspect the connection state and report the required Replit reconnection step. Only continue coding after at least one live endpoint returns `200`.
>
> Then complete the migration in this order:
>
> 1. Keep Home on `fetchLiveFeed()` and preserve loading, empty, retry, and error states.
> 2. Keep Explore on `searchYouTube()` with debounced search and visible quota/error states.
 > 3. Keep live video details on `fetchYouTubeVideo()`. On native builds, the bounded playback adapter may use an already-directly-playable Innertube format; otherwise use the official YouTube watch URL. Do not add signature extraction, scraping, or fake playback for live IDs.
> 4. Add normalized server routes for comments, playlists, liked videos, subscriptions, and channel details only where the YouTube API and granted scopes support them.
> 5. Replace prototype-only profile, playlist, comments, continuation, and download behavior with either real API data or clearly labeled empty/unavailable states. Do not silently present seeded mock data as the user’s YouTube account.
> 6. Replace simulated sign-in with a properly designed per-user Google/YouTube OAuth flow before claiming account synchronization. The environment-level Replit connector is not automatically a multi-user auth system.
> 7. Keep the download manager disabled or clearly labeled as unavailable for YouTube media. The official YouTube Data API does not provide third-party downloadable media files or stream URLs.
> 8. Use the existing artifact and workflows: `artifacts/vyde: expo` and `artifacts/api-server: API Server`.
> 9. Run both typechecks, restart the API workflow after backend changes, refresh logs, and verify the mobile preview.
>
> Report changed files, endpoint smoke-test results, remaining provider limitations, and any prototype data that still needs removal.

## Part C — Implementation checklist

### Live discovery

- [ ] Home calls `/api/youtube/feed`.
- [ ] Feed cards use live IDs, titles, channels, and thumbnails.
- [ ] Explore calls `/api/youtube/search`.
- [ ] Search requests are delayed/cancelled so every keystroke does not create a request.
- [ ] Quota errors are visible and retryable.

### Live video details

- [ ] `/api/youtube/videos/:id` validates the ID.
- [ ] Player loads live metadata.
- [ ] Native player accepts only validated HLS or progressive MP4-with-audio sources.
- [ ] Ciphered formats are rejected without attempting signature deciphering.
- [ ] Native playback errors and unavailable formats fall back to the official YouTube watch URL.
- [ ] The browser preview continues to use the official YouTube watch URL.
- [ ] No media URL is stored, displayed, logged, or claimed as a download.

### Account features

- [ ] OAuth ownership is defined per end user.
- [ ] Tokens are kept server-side and never bundled in Expo.
- [ ] User data routes check scopes and return explicit authorization errors.
- [ ] Likes/playlists/subscriptions are not simulated after the live migration.

### Offline/download behavior

- [ ] No claim of permanent offline YouTube media is shown.
- [ ] Download UI is either removed, disabled, or limited to officially permitted/app-owned content.
- [ ] Local metadata caching is distinguished from media downloading.
- [ ] Native playback does not enable background playback, now-playing controls, or media caching.

### Verification

```bash
pnpm --filter @workspace/api-server run typecheck
pnpm --filter @workspace/vyde run typecheck
```

Then restart the exact configured API workflow:

```text
artifacts/api-server: API Server
```

Finally confirm:

- Home has real YouTube cards when quota is available.
- Search returns real YouTube results.
- Selecting a live result either plays through the bounded native provider on a device or opens the official YouTube watch destination.
- Quota/auth/network failures produce useful UI states.
- No seeded prototype item is presented as a live user account item.
- An Android and an iOS device test confirms first-frame render, play/pause, seek, and fallback behavior.

## Part D — What not to do

- Do not keep reconnecting a healthy connection to solve quota exhaustion.
- Do not paste credentials into the repository or chat.
- Do not add a second YouTube connector because the first one is out of quota.
- Do not use unofficial stream extraction, signature deciphering, or scraping to implement downloads or to broaden the native playback provider.
- Do not claim that local AsyncStorage sign-in is Google/YouTube authentication.
- Do not replace a provider failure with fake content in production paths.
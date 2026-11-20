# Vyde web version — feasibility and implementation plan

Date: 2026-11-20 (Africa/Kampala)

Branch: `feature/web`, created from Android baseline `c69f7df`. Status: planning only; no deployed website or new browser media engine is claimed.

## 1. Purpose and relationship to Android

Develop Vyde as a responsive browser application with its existing visual identity and shared product models. Preserve Android as the active implementation priority after this planning branch is prepared. This document reserves and scopes web work; it does not replace the [Android master plan](IMPLEMENTATION_MASTER_PLAN.md).

All build/export/package work belongs in GitHub Actions. Local work can edit code and run targeted tests, but local Java/Gradle installation is not a prerequisite for the project's progress. A successful CI artifact still needs runtime acceptance on its target browser/device.

Keep `main` as the Android/shared integration branch. Use `feature/web` for web planning and implementation, regularly incorporating compatible shared fixes from `main`. Prefer platform adapters and small mergeable changes over permanently diverging copies of the application. The branch itself does not create a separately deployed product.

## 2. Current starting point

### Available

- Expo Router/React Native Web application with an existing dark interface, feed/search, player and library routes.
- A successful web export was verified during the preceding implementation batch; CI has a web-export/artifact job.
- Native SQLite opening is isolated through `services/db/sqlite.web.ts`; browser library state currently uses the AsyncStorage fallback.
- Express JSON endpoints exist in `artifacts/api-server/src/routes/youtube.ts` for discovery, player data, comments and InnerTube calls.
- Native media/data correctness fixes and 25 deterministic tests exist on the branch baseline.

### Not established

- Successful browser playback of the current production source corpus.
- A responsive desktop/tablet layout, complete keyboard support and stable deep-link deployment.
- Browser-native durable downloads, media conversion, offline media storage, or a complete Google web-account flow.
- A hosted API/media service, production hostname, domain, authentication configuration, runtime budget or deployment target.

Current `artifacts/vyde/scripts/build.js` and `server/serve.js` build/serve an Expo Go deployment and landing experience. They are not equivalent to exporting and serving the interactive browser application. Select an explicit web export/hosting path rather than reusing that script merely because it is named `build`.

## 3. Feasibility assessment

| Capability | Feasibility | Required work/proof |
| --- | --- | --- |
| Responsive UI, local collections, search/navigation | High | Responsive layouts, accessible controls, reliable web repository |
| Static frontend hosting | High | CI export, HTTPS, route fallback/base-path and cache configuration |
| Direct YouTube discovery/extraction entirely in ordinary browser JavaScript | Conditional and unproven | CORS, request/header constraints, challenges and source expiry; prove on real origins |
| Helper-backed discovery/resolution | Feasible architecture; reliability unproven | Evaluate maintained extraction, caching, cancellation and runtime infrastructure |
| Progressive/HLS/DASH playback | Feasible with compatible sources/headers/codecs | Browser player adapter and actual playback tests; media-element loading and script-fetched segments have different constraints |
| SABR playback | Substantial specialized work | Browser-compatible transport/decoder integration; Android Media3 code cannot run directly in a page |
| Live and captions | Feasible for compatible transports | Dedicated live/caption behavior and cross-browser testing |
| Local library persistence | High | IndexedDB-backed repository, migration, backup and quota handling |
| Offline media and export | Conditional | Obtain readable media bytes, store/process them safely and verify independent playback |
| Long background transfers after tab/browser closure | Browser-dependent | Test supported background APIs and recovery; installation as a PWA is not an Android service |
| Google subscription/playlist reads and writes | Feasible subject to configuration | Web-specific OAuth origin/redirect/session design and supported scopes |

These are engineering assessments, not measured completion percentages. Web export proves bundling; it does not prove networking, playback, download or account functionality.

## 4. Recommended delivery architecture

### Default recommendation to evaluate

Use a static Expo web frontend plus a separately deployed, narrowly scoped helper when required for extraction and browser-compatible media access. Preserve the anonymous on-device Android path; web infrastructure must not become a mandatory dependency of Android playback.

The browser communicates with normalized discovery/media APIs and owns its UI/local library. The helper, if selected, owns browser-incompatible upstream operations and returns structured plans. Media delivery can remain direct where it demonstrably works; use a media relay only where needed and explicitly budget its bandwidth.

The existing JSON proxy is an integration starting point, not proof of a maintained extractor or functioning media relay. Do not maintain separate ad hoc parsers in mobile and server as the long-term design.

### Deployment options

| Option | Advantages | Limits/tradeoffs |
| --- | --- | --- |
| Static app plus operator-hosted helper | Easiest browser experience; central compatibility repairs | Runtime hosting, operational privacy, rate limits and possible media egress cost |
| Static app plus user-configured/self-hosted helper | User control; same frontend can work with selected infrastructure | Setup burden, helper availability, version negotiation and trust |
| Pure static browser app | Minimal hosting/operations | Cannot assume browser restrictions or upstream media challenges can be solved; requires a successful feasibility prototype |

Recommend proving a configurable helper architecture first. Choosing a hosted service or spending money remains a separate decision after the prototype supplies bandwidth/runtime measurements. Do not promise a fully static, server-independent YouTube web client without evidence.

GitHub Pages may host exported frontend assets if routing/base-path needs are satisfied; it cannot run the Express extraction service. GitHub Actions builds and tests artifacts; it is not a production extraction server, media relay or persistent download worker.

## 5. Platform boundaries

| Shared | Browser-specific |
| --- | --- |
| Domain/video/library models, typed errors, media-plan schema | HTML media/MSE player and capability detection |
| Validation and synchronization rules | IndexedDB/storage repository and export destinations |
| Theme tokens and reusable UI where suitable | Desktop layout, resizing, pointer/keyboard/accessibility |
| Download state-machine concepts | Browser transfer ownership, quota and tab-close recovery |
| Account entity mappings | Web OAuth origins, redirects and credential/session design |

Use `.web.ts/.web.tsx` and native counterparts behind interfaces. Avoid spreading `Platform.OS` checks through every screen. Keep Expo's current SDK 54 behavior as the implementation baseline; current online Expo documentation can describe later SDK defaults and must not be applied blindly.

## 6. Browser-specific requirements

### Networking and media

Browser script access depends on upstream CORS behavior. `no-cors` does not turn an opaque response into readable JSON/media bytes. A service worker does not bypass cross-origin restrictions. Playing some URLs through an HTML media element can differ from fetching segments, reading media, or exporting it; test each operation separately.

Treat source headers, cookies/credential context, signed URL expiry and client-IP relationships as part of the media plan. A source resolved by a server is not automatically usable from a different user's browser/IP. Verify direct delivery before selecting a full relay, and preserve headers/ranges where relaying is necessary.

A relay should accept controlled content/format identities rather than arbitrary fetch URLs. Restrict upstream destinations/redirects, support validated ranges and cancellation, and bound requests. This is a requirement for operating a media-fetch service, not a reason to remove downloads.

### Playback

Evaluate existing `expo-video` web behavior first. Compare a maintained browser HLS/DASH/MSE adapter only against demonstrated gaps. Keep live, captions, codec compatibility, quality switching, audio-track pairing, PiP, autoplay/user-gesture behavior and keyboard controls in acceptance tests. Choose libraries after checking current maintenance/license/browser support.

### Library, offline storage and export

Use a transactional browser repository for substantial library/job data; evaluate IndexedDB, with OPFS only where useful/supported for large assets. Cache Storage can serve selected cached resources; it is not a substitute for a relational library or explicit job journal. Preserve import/export backups and handle browser eviction/private modes/storage denial.

Export via supported browser file/download APIs with fallbacks. Evaluate worker/WASM processing only with realistic memory, CPU, required response headers and codec tests. Cross-origin isolation required by some processing configurations also affects third-party integrations. Do not select a conversion package before measuring representative file sizes.

Display separate transfer/processing/finalization progress. A closed tab can interrupt work; document actual supported continuation and restore/retry checkpoints. Offline caching of the application shell does not prove offline media playback.

### Account and deployment configuration

Use web-specific OAuth client configuration and authorized origins/redirects. Do not reuse the Android redirect configuration or ship client secrets in frontend environment variables. Preserve the first account scope of subscription/playlist reads and writes, and isolate anonymous media from account failures.

For production, replace the hard-coded localhost helper fallback with explicit same-origin/configured service resolution. Separate development, preview and production environments. Use HTTPS, correct frontend deep-link routing, cache invalidation and version-compatible service-worker updates.

## 7. Systematic implementation phases

| Phase | Work and deliverable | Exit gate |
| --- | --- | --- |
| W00 — CI/deployment contract | Add branch/PR web workflow, pinned frozen installs, tests, web export and preview artifact; document hostname/API topology | Clean CI artifact; build and runtime responsibilities distinguished |
| W01 — Feasibility prototype | Test real-origin discovery, source resolution, direct/relayed media, one offline/export round trip and representative browser codecs | Measured browser/network matrix and architecture decision; no claims based on bundling alone |
| W02 — Responsive web shell | Desktop/tablet/mobile layouts, resize-safe player, navigation/deep links, keyboard/focus/large text | Core user journeys usable across target viewport/input modes |
| W03 — Browser repositories | Transactional local data, migrations, jobs, backup/restore and quota/eviction handling | Data survives refresh/restart and failures do not erase the library |
| W04 — Media adapter | Progressive/HLS/DASH and evaluated SABR path, synchronized audio, live, captions, quality, recovery and media controls | Actual video/audio/live/captions work on the declared browser matrix |
| W05 — Download/offline/export | Explicit job states, partial assets, source refresh, processing, validation, offline player and standard export | Reopen offline, interrupted transfer/processing recovery, usable exported files |
| W06 — Account bridge | Web consent/session handling; supported subscription/playlist reads/writes and shared reconciliation rules | Real account round trips, conflicts/revocation and interrupted writes tested |
| W07 — Website/PWA release | Manifest/icons, scoped caching/update policy, preview-to-production promotion, runtime helper deployment and operational checks | Hosted app passes matrix; PWA/offline claims match actual behavior |

W01 is a gate before a larger web rewrite or hosting commitment. Android implementation continues first after this planning work; these phases remain reserved until web work resumes.

## 8. GitHub Actions and deployment plan

- Initially keep this branch documentation-only. The existing workflow runs on `main`, PRs targeting `main`, version tags and manual dispatch; merely pushing `feature/web` does not currently trigger its push filter.
- When implementation begins, create a dedicated web workflow triggered by `feature/web` pushes/PRs. Export the browser app and run browser smoke/integration tests against the actual produced assets.
- Serve exported assets in CI for route/API-boundary tests. Use deterministic fixtures for core correctness; keep live upstream diagnostics distinct.
- Upload versioned artifacts identified by commit. Deploy previews through a deliberately configured provider/environment; artifact upload alone is not website publication.
- Add production promotion only after choosing the host/domain/helper topology. Keep environment secrets in GitHub/provider secret storage, not public build variables.
- Avoid running Android Gradle builds for web-only changes. Shared contract changes still run shared tests and Android checks as appropriate.

## 9. Acceptance matrix

Start with desktop Chromium and Firefox plus Android Chrome on the S21; evaluate Safari explicitly before promising that support. Record browser versions and viewport sizes, then test:

- Search/channel/playlist navigation and direct route reloads.
- Actual first frame, audible playback, seeking, quality changes, live and captions.
- Direct versus helper/relay requests, expiry, credential/header behavior and range handling.
- Private offline media, export validity, refresh/restart and browser storage loss/denial.
- Keyboard/screen-reader controls, resizing and mobile layouts.
- Offline shell updates versus actual media availability.
- Supported account reads/writes, consent cancellation, expired credentials and remote conflicts.

Set performance/storage budgets from a measured prototype. Do not infer download throughput from connection count or claim Android-equivalent background guarantees.

## 10. Decisions to resolve when web work resumes

1. Is the first public web target a companion library/discovery site or the full playback/download application? Working recommendation: full responsive app, delivered incrementally.
2. Will users supply a helper endpoint, will an operator host it, or should both be supported? Recommendation: configurable helper, with hosting choice after measurement.
3. Which browsers and offline/background capabilities are required for initial release? Proposed starting matrix is above.
4. Which domain/host, runtime region, privacy/logging controls and bandwidth limits are acceptable?
5. Should Google web auth use a browser token flow or a service-backed session? Evaluate provider-supported flows and deployment implications before choosing.

These are future web implementation decisions. No additional answer is needed to preserve this branch and continue Android now.

## 11. References

- [Android execution plan](IMPLEMENTATION_MASTER_PLAN.md) and [progress ledger](IMPLEMENTATION_PROGRESS.md).
- [YouTube adapter](../artifacts/vyde/api/youtube.ts), [server endpoints](../artifacts/api-server/src/routes/youtube.ts), [web SQLite boundary](../artifacts/vyde/services/db/sqlite.web.ts).
- [Existing Expo Go build script](../artifacts/vyde/scripts/build.js) and [server](../artifacts/vyde/server/serve.js).
- [Expo website export/deployment](https://docs.expo.dev/guides/publishing-websites/) — check SDK-specific applicability.
- [MDN CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS).
- [MDN Media Source Extensions](https://developer.mozilla.org/en-US/docs/Web/API/Media_Source_Extensions_API).
- [MDN browser storage quotas/eviction](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria).
- [MDN offline/background operation](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Offline_and_background_operation).

The recommendations distinguish source inspection from unperformed browser/runtime tests. No web hosting, proprietary/native reuse, framework rewrite or extra operational spending is authorized by creating this plan alone.

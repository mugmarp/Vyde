# Discovery requests and latency diagnostics

Updated: 2026-11-21 (Africa/Kampala).

This describes the current source, not acceptance of an installed APK. Android requests go directly to `https://www.youtube.com/youtubei/v1` using POST JSON. The device last verified at startup had source `6d58ba8`; install a newer CI artifact before measuring these changes.

| Screen | Request sequence | Meaning |
| --- | --- | --- |
| Home / All | `/browse`, `FEwhat_to_watch`, WEB context; legacy `FEtrending` attempt if needed | Home recommendations, with a bounded fallback |
| Music / Gaming / other Home chips | `/search`, category label as query, ANDROID context | Keyword search; dedicated category feeds are not implemented |
| Explore default discovery | Same flow as All | Discovery, not a guaranteed popularity ranking |
| Explore entered query/category | `/search` after 450 ms debounce | Search for the entered/category text |
| Player | `/player` client attempts; optional related `/next` | Separate playback-resolution flow |
| Comments | WEB `/next`, initial continuation and later page tokens | Separate from playback and discovery |
| Library and profile lists | Local repository/context | No discovery feed request |

The home route and lockup model were checked against [YouTube.js home-feed construction](https://github.com/LuanRT/YouTube.js/blob/main/src/Innertube.ts) and [its lockup data model](https://github.com/LuanRT/YouTube.js/blob/main/src/parser/classes/LockupView.ts). These sources establish reference request/response structure, not current successful extraction on this phone/network. No source library was integrated.

## What changed

- Home uses a WEB context consistent with its desktop browse parser. Rich-grid video cards, traditional section/grid/shelf cards and video lockups are parsed. Selected tabs and duplicate IDs are handled. Unknown layouts, unreadable required titles and unreadable-only card lists raise errors; recognized empty containers remain valid empty results. Unknown optional lockup metadata is not guessed.
- A failed home request followed by an empty fallback remains an error. An unconfigured API proxy is skipped. A configured proxy is optional and retains the original direct failure if it also fails.
- A discovery operation has a default **20-second total deadline**, including fallback and optional proxy work. Individual direct requests default to **15 seconds**, including response-body parsing. A caller may override the budget. Timeouts are retriable failures, not a claim that a video or feature is unavailable.
- Visitor warmup runs separately with a **4-second limit**. It is shared per client name/version/content region, has a **30-second retry cooldown**, and does not block the primary request. Visitor tokens returned by primary requests are learned directly; late warmup responses cannot overwrite a newer token.
- Home/Explore cleanup aborts obsolete discovery requests, including in-progress response processing. The shared bounded visitor warmup may continue for its short lifetime. Late cancelled results cannot enter the discovery cache.
- Nonempty successful discovery results are cached in memory for **60 seconds**, keyed by query/region or feed/region, with at most **24 entries**. Failures and empty responses are not cached. API callers can set `forceRefresh`. No in-flight discovery-result sharing is added; independent callers can still issue separate requests before a result is cached.
- The API passes an explicit feed region into request context. Current screens still request US; a region-preference UI is not introduced here. Keyword chips retain their existing search behavior.

## Diagnosing perceived slowness

New console records include:

- `[InnerTube] request`: endpoint, client, elapsed milliseconds, HTTP status and outcome.
- `[Discovery] request`: feed/search operation, elapsed milliseconds and success/cache/failure outcome.

They exclude queries, video IDs, visitor data, signed media URLs, cookies and response bodies. Compare these records with the exact selected category and device test timestamp. An HTTP 400 is a request rejection, not evidence of slow bandwidth. A parsing error is a schema failure. An explicitly recognized empty result is a distinct state. An elapsed time or timeout alone does not determine whether the delay comes from connectivity or the provider.

The earlier device had browse HTTP 400 and empty UI output while category searches sometimes returned videos. Those observations motivated these corrections; they do not establish that the replacement home route succeeds in production. Measure cold loads, repeated category switches/cache hits, retry after a failure, cancellation during a switch and a deliberately slow/offline connection on the new CI APK.

The 20-second budget applies to discovery, not the complete multi-client player/cipher/related-metadata sequence. Full player cancellation/budgeting, current session/challenge integration, broader search/schema coverage and native media acceptance remain open.

## Later audit qualification

The critical re-audit at source `063bbdb` reproduced a late synchronous-work case: the cache write occurs before the lifetime helper performs its final elapsed-deadline check. The caller receives RequestTimeoutError, but the result can already be cached. Explicit asynchronous cancellation tests pass; the broader late-result guarantee needs the C12 fix in [the critical audit](CRITICAL_FUNCTIONALITY_REAUDIT_2026-11-21.md). Move cache side effects after successful lifetime validation rather than treating all late-result handling as complete.

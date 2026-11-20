# ADR-001 — Android media engine evaluation

Date: 2026-11-20. Status: evaluation in progress; no replacement engine/license transition accepted.

## Context and constraints

Vyde retains its Expo UI and targets the Samsung S21 on Android 15/One UI 7 first. Required capabilities include HD with sound, offline storage/export, background/PiP, live and captions. Android core operation must not depend on a Vyde-hosted server. Builds belong in GitHub Actions; runtime acceptance belongs on the S21.

The current JavaScript extractor has seven original correctness regressions covered by tests after batch 1, but is not a complete maintained challenge/transport implementation. Do not make long-term engine selection from source review or an extraction-only benchmark.

LibreTube is the primary architecture reference. Its extractor fork and transport integration are separate dependencies; importing a parser does not automatically supply Media3 SABR playback, durable downloads, or conversion/export.

## Candidates assessed from primary source

| Candidate | Relevant evidence | Integration/maintenance tradeoff | Remaining proof |
| --- | --- | --- | --- |
| Existing Vyde TypeScript engine | Already integrated and regression-tested; narrow handwritten decipher/client paths | Lowest immediate migration cost; Vyde owns parser/challenge churn and missing transports | Current live coverage, startup latency, challenges and source recovery |
| YouTube.js / `youtubei.js` | Inspected repository package manifest declares MIT, React Native/browser exports, version 18.3.0 | Permissive JS candidate with portable models; not a drop-in complete RN engine | Published package/revision, evaluator implementation, Hermes globals/cache, challenges and actual playback |
| TeamNewPipe extractor | Independent Java extraction library; README declares GPL-3.0-or-later and Android desugaring requirements | Native Android adapter required; maintained extraction expertise; source reuse needs compatible distribution/license decision | Fit with selected transport/token implementation, pinned revision, footprint and S21 results |
| LibreTube extractor fork | Inspected dependency pins `com.github.libre-tube:NewPipeExtractor` at `894ae97` and app uses Media3 1.9.2 | Strong reference for current local media architecture; additional app-side integration and fork maintenance | Compare against upstream, actual token/SABR behavior, update ownership and compatible source reuse |

Versions above are observed repository declarations, not assertions that those revisions are published/stable in every package registry. Check distribution availability and pin an immutable tested dependency before adding it to the production app.

## Important YouTube.js findings

The React Native entry installs a platform shim, but its default JavaScript evaluator explicitly throws when deciphering is requested. An evaluator must be supplied. Its cache adapter references `globalThis.mmkvStorage`; its runtime also expects browser-like request/stream/crypto-related globals. These dependencies must be checked against Vyde's actual Hermes runtime rather than inferred from an export name.

Its player code accepts proof-token input; this does not establish a complete proof-token acquisition strategy for Vyde. Source metadata about SABR likewise does not mean the library supplies an Android player for that protocol.

Consequently, adding the npm package alone is not an adequate prototype. Resolve the evaluator/cache/runtime integration and perform the same challenge/playback tests as the native candidates. No package or additional storage engine has been installed based on this review.

## Native route considerations

Keep extraction behind a narrow Expo module if native wins. Return normalized metadata/media plans, support cancellation, redact token material, and avoid passing raw provider graphs through the UI bridge. Preserve deterministic adapter fixtures.

Compare upstream and LibreTube's fork directly. Record the selected source revision, transitive dependencies, token-provider integration, desugaring/minimum SDK behavior, shrinker rules, update process, and APK size/startup impact. Do not copy app-side workarounds automatically or treat native extraction as proof that playback/export is complete.

No license change is made by this ADR. If a GPL dependency is proposed for the distributed application, resolve the compatible distribution/source obligations explicitly before integration; a Kotlin bridge is not a way to disregard them.

## Shared boundary implemented for comparison

`artifacts/vyde/domain/media.ts` defines a provider-independent `PlaybackSource` consumed by the existing InnerTube types and public API. Resolution preserves format ID, MIME, codecs/container, source expiry, audio properties and optional request headers instead of stripping them at the API boundary. Playback and download consumers can receive source-specific headers.

Unknown MIME/container/expiry remains unknown. Expiry uses the earlier known response/URL deadline. This boundary does not yet refresh expired URLs, pair tracks, process media or implement another transport. It supplies necessary information for evaluating those operations honestly.

## Prototype and measurement protocol

1. Pin the exact candidate revision and document its license/transitive runtime requirements.
2. Build an Android diagnostic prototype in GitHub Actions without changing the default production engine before evaluation.
3. Use the same versioned video corpus for all candidates: ordinary VOD, separate-track HD, long-form, audio, live and captioned content, plus genuinely unavailable cases kept in a separate category.
4. Record resolution success/time, transport/format, first frame and audible playback, seek/quality changes, live/caption behavior, source expiry/refresh and failure stage. Do not log signed URLs, cookies or tokens.
5. Download representative sources, inspect actual tracks/container/duration, and test airplane-mode playback/export after restart. Measure processing/temp-storage cost separately from transfer time.
6. Exercise repeated resolution, network changes, cancellation and expired challenges. Compare cache behavior and recovery, not only first successful startup.
7. Record APK size, memory/startup and dependency upgrade effort. Repeat on the same S21/OS and document content/network changes affecting comparisons.

CI compilation is necessary evidence, but a Node fixture or green bundle is not a Hermes/device playback result. Device comparison remains pending the first compiled APK and physical testing.

## Recommendation at this stage

Keep the current engine operational with bounded correctness fixes while preparing two realistic prototype routes: a maintained JS candidate with an explicit evaluator/runtime adapter, and a maintained NewPipe-derived native adapter. Prefer a maintained extraction component over expanding Vyde's regex engine into an independent full YouTube implementation unless measurements justify that maintenance cost.

The native route is particularly relevant to Android-first advanced transport work, while the JS route may simplify future cross-platform reuse. Neither has passed Vyde's device gate. Do not assign fabricated numeric scores or select solely on licensing convenience, language, popularity, or LibreTube's adoption.

## Decisions still required

- Which immutable extractor revision meets the measured source/challenge requirements?
- Which evaluator/token provider and native media transport integration are needed?
- Can configured `expo-video` satisfy the complete playback matrix, or is a narrow Media3 adapter required?
- Which processing component produces validated private assets and exports reproducibly?
- What distribution/license decision follows from the chosen complete dependency graph?

Continue transactional library/job foundations and adapter tests while these questions are evaluated; they do not require prematurely selecting an extractor.

## Primary sources inspected

- [YouTube.js package manifest](https://github.com/LuanRT/YouTube.js/blob/main/package.json).
- [React Native platform entry](https://github.com/LuanRT/YouTube.js/blob/main/src/platform/react-native.ts).
- [Default evaluator](https://github.com/LuanRT/YouTube.js/blob/main/src/platform/jsruntime/default.ts).
- [Player implementation](https://github.com/LuanRT/YouTube.js/blob/main/src/core/Player.ts).
- [NewPipe extractor README/license declaration](https://github.com/TeamNewPipe/NewPipeExtractor/blob/dev/README.md).
- [NewPipe extractor build](https://github.com/TeamNewPipe/NewPipeExtractor/blob/dev/extractor/build.gradle.kts).
- [LibreTube dependencies](https://github.com/libre-tube/LibreTube/blob/master/gradle/libs.versions.toml).
- [LibreTube media repository](https://github.com/libre-tube/LibreTube/blob/master/app/src/main/java/com/github/libretube/api/NewPipeMediaServiceRepository.kt).

References follow repository branches and can change. Record immutable revisions and package integrity in the prototype results before production reuse.

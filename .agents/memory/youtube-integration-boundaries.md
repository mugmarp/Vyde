---
name: YouTube integration boundaries
description: Durable constraints for Vyde's official YouTube integration and production claims.
---

Vyde currently uses a configurable Piped-compatible server adapter for anonymous discovery, details, comments, and native playback candidates. The default endpoint is a third-party public instance, not an availability commitment or policy approval. It can observe forwarded search terms and video IDs.

**Why:** The user wants real client-style YouTube browsing and video access rather than seeded demo content. A public provider demonstrates that path but has independent privacy, reliability, and policy risks.

**How to apply:** Keep the provider replaceable, surface failures without fake data, review operator authorization, terms, privacy, and uptime before release, and never send user credentials to the anonymous provider.

Native playback accepts only HTTPS HLS candidates or progressive MP4 candidates that the provider marks as containing audio. Vyde does not decipher signatures/ciphers, fetch player JavaScript, generate PoTokens, or combine separate audio and video tracks; it falls back to the official YouTube watch page when needed.

**Why:** Those extraction paths and playback candidates are not yet confirmed as reliable, device-compatible, or authorized for this app.

**How to apply:** Keep candidate URIs out of UI, logs, and persistent state. Keep background playback, now-playing controls, caching, and downloads disabled until physical-device validation and a separate policy decision are complete.

Likes, saves, playlists, and history are device-local; YouTube account sync is not implemented.

**Why:** Local Vyde state and YouTube account data have different ownership and authentication boundaries.

**How to apply:** Do not describe local collections as YouTube-synced, and keep any future OAuth account connection separate from anonymous discovery.
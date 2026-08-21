---
name: YouTube integration boundaries
description: Durable constraints for Vyde's official YouTube integration and production claims.
---

Vyde must use official YouTube-supported APIs and playback paths. YouTube Data API responses provide metadata and selected account operations, but do not provide third-party stream URLs or downloadable video files.

**Why:** The connected API can return quota/auth failures, and presenting extracted or permanently downloadable YouTube media as implemented would be misleading and potentially violate platform rules.

**How to apply:** Keep quota/auth failures visible, use official watch/playback handoffs, and do not call the download manager a production YouTube downloader unless an officially supported offline capability is added.
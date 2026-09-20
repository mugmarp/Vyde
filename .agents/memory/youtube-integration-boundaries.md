---
name: YouTube integration boundaries
description: Durable constraints for Vyde's official YouTube integration and production claims.
---

Vyde must use official YouTube-supported APIs and playback paths. YouTube Data API responses provide metadata and selected account operations, but do not provide third-party stream URLs or downloadable video files.

**Why:** The connected API can return quota/auth failures, and presenting extracted or permanently downloadable YouTube media as implemented would be misleading and potentially violate platform rules.

**How to apply:** Keep quota/auth failures visible, use official watch/playback handoffs, and do not call the download manager a production YouTube downloader unless an officially supported offline capability is added.

Vyde's agreed hybrid boundary is: anonymous Innertube for native discovery and metadata, local-first on-device state for Vyde-owned history/playlists/saves, and a separate official OAuth/Data API bridge for supported YouTube account operations.

**Why:** Anonymous discovery and user-account synchronization have different authentication, quota, and stability properties; coupling them makes provider failures and policy boundaries harder to control.

**How to apply:** Keep provider adapters separate. Do not pass OAuth tokens into anonymous Innertube requests, and do not present local Vyde state as synchronized YouTube account data.
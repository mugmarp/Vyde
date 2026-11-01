# Vyde — Critical Analysis & Handover Notes

**Purpose:** Extra critical analysis, risks, architecture decisions, and handover guidance for turning Vyde into a real working YouTube client (NewPipe / LibreTube style).

**Related:** Use together with the Antigravity kickoff prompt that discards the previous defensive “no-extraction” boundaries.

**Distribution intent:** Sideload / F-Droid / personal / open-source. No Play Store or App Store requirement.

---

## 1. Hard Technical Realities You Must Confront Early

| Issue | Why it matters | Practical implication |
|-------|----------------|----------------------|
| **PoToken / botguard** | YouTube has been aggressively rolling this out. Many ANDROID/IOS player responses now require a valid PoToken or the streams 403. | Pure “old NewPipe style” JS deciphering alone is no longer enough on many videos. You need a strategy (web client fallback, ANDROID with proper visitor data, or a maintained library that already solves it). |
| **Signature + n-parameter** | Still required for most progressive formats. | Must be kept up to date. Hard-coding player JS extractors will break every few weeks. |
| **Client version churn** | InnerTube client versions and keys change. | Isolate the client context + player extraction into its own module so it can be updated without touching UI. |
| **Adaptive vs progressive** | Progressive MP4-with-audio is simplest but often lower quality / rate-limited. DASH needs muxing or a player that can handle separate video+audio. | Decide early: progressive-only first (faster to ship) or full DASH (better quality, more work). |
| **Expo limitations** | `expo-video` / `expo-av` are convenient but weaker than raw ExoPlayer/AVPlayer for advanced controls, background, and format support. | You may eventually need a custom native module or `react-native-video` with more control. |
| **Background download & playback** | iOS is strict; Android is more permissive. | Plan platform-specific behavior and test on real devices early. |

---

## 2. Architecture Decisions That Should Be Locked Soon

1. **Extractor strategy**  
   - Build your own InnerTube layer?  
   - Or embed/adapt an existing one (e.g. logic inspired by NewPipeExtractor, yt-dlp patterns, or a JS Innertube library)?  
   Re-inventing the full extractor from scratch is high maintenance.

2. **Server dependency**  
   The current Express + Piped proxy should be treated as temporary. Long-term goal should be pure client-side for anonymous use. Keep a thin optional backend only if you later want rate-limit protection, instance switching, or authenticated proxying.

3. **Instance / fallback model**  
   Even client-side apps benefit from multiple InnerTube client contexts and graceful degradation (ANDROID → IOS → WEB → “Open in YouTube”).

4. **Local data model**  
   Design the local library (history, likes, playlists, subscriptions, downloads) properly now. Use a real local DB (SQLite via expo-sqlite or similar) instead of growing AsyncStorage chaos.

---

## 3. What Already Exists That Is Worth Keeping

- Dark theme, typography, and overall visual language.
- Expo Router structure and most screen layouts.
- Mockup sandbox components (especially Download Manager concepts).
- Gesture-handler dependency (already present).
- The original hybrid vision documents in `attached_assets/`.

Everything else that was written to justify the broken state should be treated as disposable.

---

## 4. Testing & Validation Strategy (Critical)

- Measure **playback success rate** on a fixed set of 30–50 real videos (mix of popular, music, long-form, age-restricted, livestreams, premieres).
- Track how often you fall back to “Open in YouTube”.
- Test on real Android + iOS devices, not just simulators (PoToken and media playback behavior differ).
- Have a simple “extractor health” screen or log that shows which client context and which format was chosen.

---

## 5. Recommended Phased Success Metrics

| Milestone | Definition of done |
|-----------|--------------------|
| **M1** | ≥ 70% of normal videos play in-app without opening YouTube |
| **M2** | Basic gestures + quality/speed controls work |
| **M3** | Download of progressive video + audio-only works and files are playable offline |
| **M4** | Local library (history / likes / playlists) survives app restarts |
| **M5** | Clean README + architecture docs that match reality |

---

## 6. Handover Checklist for Antigravity (or Any New Agent)

Add these explicit instructions:

- Do **not** re-introduce language that frames extraction or offline as “against policy.”
- Prefer working code over perfect documentation in the early phases.
- When YouTube breaks something, fix the extractor layer; do not disable the feature and call it a boundary.
- Keep the UI premium and cinematic — that is one of the few things already good.
- Make the project runnable with a normal `pnpm install && npx expo start` (or documented equivalent) without Replit-specific env vars.
- Leave clear TODOs in code for PoToken / advanced DASH / background playback rather than silent failures.

---

## 7. Strategic Direction

**Target:** True alternative client (extractor + offline) in the style of NewPipe / LibreTube.

- Full in-app stream playback
- Offline downloads
- Local-first library
- Optional Google account sync later
- Distribution via sideload / F-Droid / open-source (no Play Store requirement)

Do not compromise core features to chase official store compliance.

---

## Bottom Line for Handover

The biggest remaining risks are not UI or Expo structure — they are:

1. Keeping the InnerTube extractor alive against YouTube’s anti-bot measures (PoToken, cipher, client churn).
2. Not letting the project slide back into “we can’t do that” rationalizations when the next technical wall appears.

Everything else is execution.

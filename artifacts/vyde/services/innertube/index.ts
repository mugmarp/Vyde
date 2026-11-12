/**
 * InnerTube Service Module — barrel export
 *
 * Provides client-side YouTube data extraction without requiring the
 * official YouTube Data API v3. All requests go directly to YouTube's
 * internal InnerTube API (the same backend used by the official YouTube app).
 *
 * Sub-modules:
 *   constants        — Client configs (ANDROID, IOS, TV_EMBEDDED, WEB), header builders
 *   types            — Shared TypeScript interfaces for all InnerTube data structures
 *   cipher           — Signature deciphering engine (base.js parsing, sig ops, n-param solving)
 *   innertubeClient  — HTTP client with visitorData injection and multi-client cascade
 *   playerExtractor  — /player endpoint: stream resolution, metadata, related videos
 *   browseExtractor  — /browse endpoint: trending feed, category tabs
 *   searchExtractor  — /search endpoint: keyword video search
 *   commentsExtractor— /next endpoint: comments thread
 *
 * Usage:
 *   import { extractPlayer, extractSearch, extractBrowse } from '@/services/innertube';
 */

export * from './constants';
export * from './types';
export * from './cipher';
export * from './innertubeClient';
export * from './playerExtractor';
export * from './browseExtractor';
export * from './searchExtractor';
export * from './commentsExtractor';

import { Router, type IRouter } from "express";

const router: IRouter = Router();

type PipedItem = {
  type?: string;
  url?: string;
  title?: string;
  thumbnail?: string;
  uploaderName?: string;
  uploaderUrl?: string;
  uploaderAvatar?: string;
  uploadedDate?: string;
  views?: number;
  duration?: number;
  shortDescription?: string;
};

type PipedVideoStream = {
  url?: string;
  mimeType?: string;
  quality?: string;
  format?: string;
  videoOnly?: boolean;
  width?: number;
  height?: number;
};

type PipedVideo = {
  title?: string;
  description?: string;
  uploadDate?: string;
  uploader?: string;
  uploaderUrl?: string;
  uploaderAvatar?: string;
  thumbnailUrl?: string;
  hls?: string | null;
  duration?: number;
  views?: number;
  likes?: number;
  videoStreams?: PipedVideoStream[];
  relatedStreams?: PipedItem[];
  livestream?: boolean;
};

function pipedBaseUrl() {
  const value = process.env.PIPED_API_BASE_URL ?? "https://api.piped.private.coffee";
  const url = new URL(value);
  if (url.protocol !== "https:") {
    throw new Error("PIPED_API_BASE_URL must use HTTPS.");
  }
  return url.toString().replace(/\/$/, "");
}

async function piped(path: string): Promise<unknown> {
  const response = await fetch(`${pipedBaseUrl()}${path}`, {
    headers: { accept: "application/json", "user-agent": "Vyde/0.1" },
    signal: AbortSignal.timeout(15_000),
  });
  const text = await response.text();
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    throw new Error(`Piped returned an invalid response (${response.status}).`);
  }
  if (!response.ok) {
    throw new Error(`Piped request failed (${response.status}).`);
  }
  return body;
}

function videoIdFromUrl(value: unknown): string {
  if (typeof value !== "string") return "";
  const match = value.match(/[?&]v=([\w-]{6,20})/);
  return match?.[1] ?? "";
}

function youtubeThumbnail(id: string) {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}

function plainText(value: unknown) {
  if (typeof value !== "string") return "";
  return value
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/p>/gi, " ")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function mapVideo(item: PipedItem) {
  const id = videoIdFromUrl(item.url);
  if (!id || item.type !== "stream") return null;
  return {
    id,
    title: item.title ?? "",
    description: plainText(item.shortDescription),
    channel: item.uploaderName ?? "",
    channelId: item.uploaderUrl ?? "",
    publishedAt: item.uploadedDate ?? "",
    thumbnail: youtubeThumbnail(id),
    watchUrl: `https://www.youtube.com/watch?v=${id}`,
    views: typeof item.views === "number" ? String(item.views) : "0",
    duration: typeof item.duration === "number" && item.duration >= 0 ? formatDuration(item.duration) : null,
  };
}

function formatDuration(seconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const remainder = safeSeconds % 60;
  return hours > 0
    ? `${hours}:${minutes.toString().padStart(2, "0")}:${remainder.toString().padStart(2, "0")}`
    : `${minutes}:${remainder.toString().padStart(2, "0")}`;
}

function safePlaybackUri(value: unknown) {
  if (typeof value !== "string") return null;
  try {
    const uri = new URL(value);
    return uri.protocol === "https:" ? uri.toString() : null;
  } catch {
    return null;
  }
}

function selectPlayback(video: PipedVideo) {
  const streams = Array.isArray(video.videoStreams) ? video.videoStreams : [];
  const playable = streams
    .filter((stream) => stream.videoOnly === false)
    .map((stream) => {
      const uri = safePlaybackUri(stream.url);
      const mimeType = stream.mimeType?.toLowerCase() ?? "";
      if (!uri) return null;
      if (mimeType.includes("mpegurl") || stream.format?.toLowerCase() === "hls") {
        return { uri, contentType: "hls" as const, qualityLabel: stream.quality ?? "Auto" };
      }
      if (mimeType.startsWith("video/mp4")) {
        return { uri, contentType: "progressive" as const, qualityLabel: stream.quality ?? "Auto" };
      }
      return null;
    })
    .filter((stream): stream is NonNullable<typeof stream> => stream !== null);

  const hlsManifest = safePlaybackUri(video.hls);
  if (hlsManifest && !playable.some((stream) => stream.uri === hlsManifest)) {
    playable.unshift({ uri: hlsManifest, contentType: "hls", qualityLabel: "Auto" });
  }

  // Prefer adaptive HLS where available; otherwise use a progressive stream
  // that already contains audio. Keep alternatives for player-level fallback.
  return playable.sort((a, b) => {
    if (a.contentType !== b.contentType) return a.contentType === "hls" ? -1 : 1;
    return 0;
  });
}

function providerError(error: unknown) {
  return error instanceof Error ? error.message : "The video provider is unavailable.";
}

router.get("/youtube/feed", async (req, res) => {
  try {
    const region = typeof req.query.region === "string" && /^[A-Z]{2}$/.test(req.query.region)
      ? req.query.region
      : "UG";
    const data = await piped(`/trending?region=${encodeURIComponent(region)}`);
    const items = Array.isArray(data) ? data as PipedItem[] : [];
    res.json({ items: items.map(mapVideo).filter(Boolean), provider: "piped" });
  } catch (error) {
    res.status(502).json({ error: "youtube_unavailable", message: providerError(error) });
  }
});

router.get("/youtube/search", async (req, res) => {
  const query = typeof req.query.q === "string" ? req.query.q.trim() : "";
  if (query.length < 2 || query.length > 160) {
    res.status(400).json({ error: "invalid_query", message: "Search must be between 2 and 160 characters." });
    return;
  }
  try {
    const data = await piped(`/search?q=${encodeURIComponent(query)}&filter=videos`);
    const result = data as { items?: unknown };
    const items = Array.isArray(result.items) ? result.items as PipedItem[] : [];
    res.json({ items: items.map(mapVideo).filter(Boolean), provider: "piped" });
  } catch (error) {
    res.status(502).json({ error: "youtube_unavailable", message: providerError(error) });
  }
});

router.get("/youtube/videos/:id", async (req, res) => {
  const id = req.params.id;
  if (!/^[\w-]{6,20}$/.test(id)) {
    res.status(400).json({ error: "invalid_video_id", message: "Invalid YouTube video ID." });
    return;
  }
  try {
    const video = await piped(`/streams/${encodeURIComponent(id)}`) as PipedVideo;
    if (!video.title) {
      res.status(404).json({ error: "not_found", message: "Video not found." });
      return;
    }
    const related = Array.isArray(video.relatedStreams) ? video.relatedStreams : [];
    res.json({
      id,
      title: video.title,
      description: plainText(video.description),
      channel: video.uploader ?? "",
      channelId: video.uploaderUrl ?? "",
      publishedAt: video.uploadDate ?? "",
      thumbnail: youtubeThumbnail(id),
      views: typeof video.views === "number" ? String(video.views) : "0",
      likes: typeof video.likes === "number" ? String(video.likes) : "0",
      duration: typeof video.duration === "number" && video.duration >= 0 ? formatDuration(video.duration) : null,
      watchUrl: `https://www.youtube.com/watch?v=${id}`,
      nativePlaybackCandidates: selectPlayback(video),
      relatedVideos: related.map(mapVideo).filter(Boolean).slice(0, 12),
      livestream: video.livestream === true,
      provider: "piped",
    });
  } catch (error) {
    res.status(502).json({ error: "youtube_unavailable", message: providerError(error) });
  }
});

router.get("/youtube/comments/:id", async (req, res) => {
  const id = req.params.id;
  if (!/^[\w-]{6,20}$/.test(id)) {
    res.status(400).json({ error: "invalid_video_id", message: "Invalid YouTube video ID." });
    return;
  }
  try {
    const result = await piped(`/comments/${encodeURIComponent(id)}`) as {
      comments?: Array<Record<string, unknown>>;
      commentCount?: number;
    };
    const comments = Array.isArray(result.comments) ? result.comments : [];
    res.json({
      commentCount: typeof result.commentCount === "number" ? result.commentCount : null,
      items: comments.map((comment) => ({
        id: typeof comment.commentId === "string" ? comment.commentId : "",
        author: typeof comment.author === "string" ? comment.author : "",
        authorUrl: typeof comment.authorUrl === "string" ? comment.authorUrl : "",
        text: typeof comment.commentText === "string" ? comment.commentText : "",
        published: typeof comment.commentedTime === "string" ? comment.commentedTime : "",
        likes: typeof comment.likeCount === "number" ? comment.likeCount : 0,
        thumbnail: typeof comment.thumbnail === "string" ? comment.thumbnail : "",
      })).filter((comment) => comment.id && comment.text),
      provider: "piped",
    });
  } catch (error) {
    res.status(502).json({ error: "comments_unavailable", message: providerError(error) });
  }
});

export default router;

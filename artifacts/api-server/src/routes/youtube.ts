import { Router, type IRouter } from "express";
import { ReplitConnectors } from "@replit/connectors-sdk";

const router: IRouter = Router();
const connectors = new ReplitConnectors();

type YouTubeItem = {
  id: { videoId?: string; channelId?: string; playlistId?: string };
  snippet: {
    title: string;
    description: string;
    channelTitle: string;
    channelId: string;
    publishedAt: string;
    thumbnails?: {
      medium?: { url: string };
      high?: { url: string };
    };
  };
};

function mapSearchItem(item: YouTubeItem) {
  const videoId = item.id.videoId;
  if (!videoId) return null;
  return {
    id: videoId,
    title: item.snippet.title,
    description: item.snippet.description,
    channel: item.snippet.channelTitle,
    channelId: item.snippet.channelId,
    publishedAt: item.snippet.publishedAt,
    thumbnail:
      item.snippet.thumbnails?.high?.url ??
      item.snippet.thumbnails?.medium?.url ??
      null,
    watchUrl: `https://www.youtube.com/watch?v=${videoId}`,
  };
}

async function youtube(path: string) {
  const response = await connectors.proxy("youtube", `/youtube/v3${path}`);
  const body = await response.json() as unknown;
  if (!response.ok) {
    const error = body as { error?: { message?: string } };
    throw new Error(error.error?.message ?? "YouTube request failed");
  }
  return body as Record<string, unknown>;
}

router.get("/youtube/feed", async (_req, res) => {
  try {
    const data = await youtube(
      "/videos?part=snippet,statistics,contentDetails&chart=mostPopular&regionCode=US&maxResults=12",
    );
    const items = Array.isArray(data.items) ? data.items : [];
    res.json({
      items: items.map((item) => {
        const video = item as Record<string, unknown>;
        const snippet = video.snippet as YouTubeItem["snippet"];
        const id = typeof video.id === "string" ? video.id : "";
        return {
          id,
          title: snippet.title,
          description: snippet.description,
          channel: snippet.channelTitle,
          channelId: snippet.channelId,
          publishedAt: snippet.publishedAt,
          thumbnail: snippet.thumbnails?.high?.url ?? snippet.thumbnails?.medium?.url ?? null,
          watchUrl: `https://www.youtube.com/watch?v=${id}`,
        };
      }).filter((item) => item.id.length > 0),
    });
  } catch (error) {
    res.status(502).json({
      error: "youtube_unavailable",
      message: error instanceof Error ? error.message : "YouTube is unavailable",
    });
  }
});

router.get("/youtube/search", async (req, res) => {
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  if (q.length < 2) {
    res.status(400).json({ error: "invalid_query", message: "Search must be at least 2 characters." });
    return;
  }

  try {
    const params = new URLSearchParams({
      part: "snippet",
      type: "video",
      order: "relevance",
      maxResults: "20",
      q,
    });
    const data = await youtube(`/search?${params.toString()}`);
    const items = Array.isArray(data.items) ? data.items : [];
    res.json({ items: items.map((item) => mapSearchItem(item as YouTubeItem)).filter(Boolean) });
  } catch (error) {
    res.status(502).json({
      error: "youtube_unavailable",
      message: error instanceof Error ? error.message : "YouTube is unavailable",
    });
  }
});

router.get("/youtube/videos/:id", async (req, res) => {
  const id = req.params.id;
  if (!/^[\w-]{6,20}$/.test(id)) {
    res.status(400).json({ error: "invalid_video_id", message: "Invalid YouTube video ID." });
    return;
  }

  try {
    const data = await youtube(
      `/videos?part=snippet,statistics,contentDetails&id=${encodeURIComponent(id)}`,
    );
    const item = Array.isArray(data.items) ? data.items[0] as Record<string, unknown> | undefined : undefined;
    if (!item) {
      res.status(404).json({ error: "not_found", message: "Video not found." });
      return;
    }
    const snippet = item.snippet as {
      title?: string;
      description?: string;
      channelTitle?: string;
      channelId?: string;
      publishedAt?: string;
      thumbnails?: { high?: { url?: string }; medium?: { url?: string } };
    };
    const statistics = item.statistics as {
      viewCount?: string;
      likeCount?: string;
    } | undefined;
    res.json({
      id,
      title: snippet.title ?? "",
      description: snippet.description ?? "",
      channel: snippet.channelTitle ?? "",
      channelId: snippet.channelId ?? "",
      publishedAt: snippet.publishedAt ?? "",
      thumbnail: snippet.thumbnails?.high?.url ?? snippet.thumbnails?.medium?.url ?? null,
      views: statistics?.viewCount ?? "0",
      likes: statistics?.likeCount ?? "0",
      duration: (item.contentDetails as { duration?: string } | undefined)?.duration ?? null,
      watchUrl: `https://www.youtube.com/watch?v=${id}`,
    });
  } catch (error) {
    res.status(502).json({
      error: "youtube_unavailable",
      message: error instanceof Error ? error.message : "YouTube is unavailable",
    });
  }
});

export default router;
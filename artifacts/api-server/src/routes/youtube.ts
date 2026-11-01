import { Router, type IRouter } from "express";

const router: IRouter = Router();

const INNERTUBE_BASE_URL = "https://www.youtube.com/youtubei/v1";

const CLIENTS = {
  ANDROID: {
    clientName: "ANDROID",
    clientVersion: "19.29.37",
    androidSdkVersion: 34,
    userAgent: "com.google.android.youtube/19.29.37 (Linux; U; Android 14; US) gzip",
    code: "3",
  },
  IOS: {
    clientName: "IOS",
    clientVersion: "19.29.1",
    deviceModel: "iPhone16,2",
    userAgent: "com.google.ios.youtube/19.29.1 (iPhone16,2; U; CPU iOS 17_5_1 like Mac OS X; en_US)",
    code: "5",
  },
  WEB: {
    clientName: "WEB",
    clientVersion: "2.20241025.01.00",
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
    code: "1",
  },
};

function youtubeThumbnail(id: string) {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}

function formatDuration(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  return h > 0
    ? `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
    : `${m}:${s.toString().padStart(2, "0")}`;
}

async function callInnerTube(endpoint: string, body: Record<string, unknown>, client = CLIENTS.ANDROID) {
  const payload = {
    ...body,
    context: {
      client: {
        hl: "en",
        gl: "US",
        clientName: client.clientName,
        clientVersion: client.clientVersion,
        ...(client.androidSdkVersion ? { androidSdkVersion: client.androidSdkVersion } : {}),
        ...(client.deviceModel ? { deviceModel: client.deviceModel } : {}),
      },
      user: { lockedSafetyMode: false },
      request: { useSsl: true },
    },
  };

  const response = await fetch(`${INNERTUBE_BASE_URL}/${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": client.userAgent,
      "X-YouTube-Client-Name": client.code,
      "X-YouTube-Client-Version": client.clientVersion,
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    throw new Error(`InnerTube request to ${endpoint} failed (${response.status})`);
  }

  return response.json();
}

/**
 * Endpoint for web client to proxy arbitrary InnerTube calls and bypass CORS
 */
router.post("/innertube/:endpoint", async (req, res) => {
  const endpoint = req.params.endpoint;
  const clientName = req.body?.clientName === "IOS" ? CLIENTS.IOS : req.body?.clientName === "WEB" ? CLIENTS.WEB : CLIENTS.ANDROID;
  try {
    const data = await callInnerTube(endpoint, req.body?.body || {}, clientName);
    res.json(data);
  } catch (err: any) {
    res.status(502).json({ error: "innertube_failed", message: err.message || "Failed" });
  }
});

/**
 * Trending / Feed route
 */
router.get("/youtube/feed", async (_req, res) => {
  try {
    const data: any = await callInnerTube("browse", { browseId: "FEtrending" });
    const items: any[] = [];

    const tabs = data?.contents?.twoColumnBrowseResultsRenderer?.tabs ||
                 data?.contents?.singleColumnBrowseResultsRenderer?.tabs || [];

    for (const tab of tabs) {
      const sections = tab?.tabRenderer?.content?.sectionListRenderer?.contents || [];
      for (const section of sections) {
        const entries = section?.itemSectionRenderer?.contents || [];
        for (const entry of entries) {
          const list = entry?.shelfRenderer?.content?.expandedShelfContentsRenderer?.items ||
                       entry?.shelfRenderer?.content?.gridRenderer?.items ||
                       [entry];
          for (const item of list) {
            const video = item?.videoRenderer || item?.gridVideoRenderer;
            if (!video?.videoId) continue;
            const id = video.videoId;
            items.push({
              id,
              title: video.title?.runs?.[0]?.text || video.title?.simpleText || "",
              description: "",
              channel: video.shortBylineText?.runs?.[0]?.text || "",
              channelId: video.shortBylineText?.runs?.[0]?.navigationEndpoint?.browseEndpoint?.browseId || "",
              publishedAt: video.publishedTimeText?.simpleText || "",
              thumbnail: youtubeThumbnail(id),
              watchUrl: `https://www.youtube.com/watch?v=${id}`,
              views: video.viewCountText?.simpleText || video.shortViewCountText?.simpleText || "0",
              duration: video.lengthText?.simpleText || null,
            });
          }
        }
      }
    }

    res.json({ items, provider: "innertube" });
  } catch (error: any) {
    res.status(502).json({ error: "feed_unavailable", message: error.message || "Could not load feed" });
  }
});

/**
 * Search route
 */
router.get("/youtube/search", async (req, res) => {
  const query = typeof req.query.q === "string" ? req.query.q.trim() : "";
  if (query.length < 2) {
    res.status(400).json({ error: "invalid_query", message: "Search must be at least 2 characters." });
    return;
  }

  try {
    const data: any = await callInnerTube("search", { query });
    const items: any[] = [];

    const sections =
      data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents ||
      data?.contents?.sectionListRenderer?.contents || [];

    for (const section of sections) {
      const entries = section?.itemSectionRenderer?.contents || [];
      for (const item of entries) {
        const video = item?.videoRenderer || item?.compactVideoRenderer;
        if (!video?.videoId) continue;
        const id = video.videoId;
        items.push({
          id,
          title: video.title?.runs?.[0]?.text || video.title?.simpleText || "",
          description: "",
          channel: video.ownerText?.runs?.[0]?.text || video.shortBylineText?.runs?.[0]?.text || "",
          channelId: "",
          publishedAt: video.publishedTimeText?.simpleText || "",
          thumbnail: youtubeThumbnail(id),
          watchUrl: `https://www.youtube.com/watch?v=${id}`,
          views: video.viewCountText?.simpleText || "0",
          duration: video.lengthText?.simpleText || null,
        });
      }
    }

    res.json({ items, provider: "innertube" });
  } catch (error: any) {
    res.status(502).json({ error: "search_unavailable", message: error.message || "Search failed" });
  }
});

/**
 * Video details and stream extraction
 */
router.get("/youtube/videos/:id", async (req, res) => {
  const id = req.params.id;
  if (!/^[\w-]{6,20}$/.test(id)) {
    res.status(400).json({ error: "invalid_video_id", message: "Invalid YouTube video ID." });
    return;
  }

  try {
    // Try Android then iOS client
    let player: any = null;
    try {
      player = await callInnerTube("player", { videoId: id }, CLIENTS.ANDROID);
    } catch {
      player = await callInnerTube("player", { videoId: id }, CLIENTS.IOS);
    }

    const details = player?.videoDetails || {};
    const streamingData = player?.streamingData || {};
    const lengthSec = parseInt(details.lengthSeconds || "0", 10);

    const candidates: any[] = [];
    if (streamingData.hlsManifestUrl) {
      candidates.push({
        uri: streamingData.hlsManifestUrl,
        contentType: "hls",
        qualityLabel: "Auto (HLS)",
      });
    }

    const formats = Array.isArray(streamingData.formats) ? streamingData.formats : [];
    for (const fmt of formats) {
      if (fmt.url && fmt.url.startsWith("https://")) {
        candidates.push({
          uri: fmt.url,
          contentType: "progressive",
          qualityLabel: fmt.qualityLabel || (fmt.height ? `${fmt.height}p` : "MP4"),
          bitrate: fmt.bitrate,
          width: fmt.width,
          height: fmt.height,
        });
      }
    }

    res.json({
      id,
      title: details.title || "Video",
      description: details.shortDescription || "",
      channel: details.author || "",
      channelId: details.channelId || "",
      publishedAt: "",
      thumbnail: youtubeThumbnail(id),
      views: details.viewCount || "0",
      likes: "0",
      duration: lengthSec > 0 ? formatDuration(lengthSec) : null,
      watchUrl: `https://www.youtube.com/watch?v=${id}`,
      nativePlaybackCandidates: candidates,
      relatedVideos: [],
      livestream: details.isLiveContent === true,
      provider: "innertube",
    });
  } catch (error: any) {
    res.status(502).json({ error: "youtube_unavailable", message: error.message || "Video unavailable" });
  }
});

/**
 * Comments route
 */
router.get("/youtube/comments/:id", async (req, res) => {
  const id = req.params.id;
  try {
    const data: any = await callInnerTube("next", { videoId: id });
    const items: any[] = [];
    let commentCount: number | null = null;

    const results = data?.contents?.twoColumnWatchNextResults?.results?.results?.contents || [];
    for (const section of results) {
      const itemSection = section?.itemSectionRenderer;
      if (itemSection?.sectionIdentifier === "comment-item-section") {
        const comments = itemSection?.contents || [];
        for (const entry of comments) {
          const thread = entry?.commentThreadRenderer?.comment?.commentRenderer;
          if (!thread?.commentId) continue;
          items.push({
            id: thread.commentId,
            author: thread.authorText?.simpleText || "",
            authorUrl: "",
            text: thread.contentText?.runs?.map((r: any) => r.text).join("") || thread.contentText?.simpleText || "",
            published: thread.publishedTimeText?.runs?.[0]?.text || "",
            likes: thread.likeCount || 0,
            thumbnail: thread.authorThumbnail?.thumbnails?.[0]?.url || "",
          });
        }
      }
    }

    res.json({ commentCount, items, provider: "innertube" });
  } catch (error: any) {
    res.status(502).json({ error: "comments_unavailable", message: error.message || "Comments unavailable" });
  }
});

export default router;

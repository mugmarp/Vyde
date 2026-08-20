export interface LiveVideo {
  id: string;
  title: string;
  description: string;
  channel: string;
  channelId: string;
  publishedAt: string;
  thumbnail: string;
  watchUrl: string;
}

interface ResponseShape {
  items: LiveVideo[];
  error?: string;
  message?: string;
}

function apiBase() {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  if (!domain) throw new Error("EXPO_PUBLIC_DOMAIN is not configured.");
  return `https://${domain}/api/youtube`;
}

async function request(path: string): Promise<ResponseShape> {
  const response = await fetch(`${apiBase()}${path}`);
  const body = await response.json() as ResponseShape;
  if (!response.ok) {
    throw new Error(body.message ?? "Could not reach YouTube.");
  }
  return body;
}

export function fetchLiveFeed() {
  return request("/feed");
}

export function searchYouTube(query: string) {
  return request(`/search?q=${encodeURIComponent(query)}`);
}

export async function fetchYouTubeVideo(id: string) {
  const response = await fetch(`${apiBase()}/videos/${encodeURIComponent(id)}`);
  const body = await response.json() as LiveVideo & {
    views: string;
    likes: string;
    duration: string | null;
  };
  if (!response.ok) throw new Error((body as { message?: string }).message ?? "Could not load video.");
  return body;
}
/**
 * Search Extractor
 * Searches videos directly via InnerTube /search.
 */

import { CLIENT_CONFIGS } from './constants';
import { defaultInnerTube } from './innertubeClient';
import { NormalizedVideoItem } from './types';

function youtubeThumbnail(id: string): string {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}

export async function extractSearch(query: string): Promise<NormalizedVideoItem[]> {
  const normalized = query.trim();
  if (normalized.length < 2) return [];

  const response = await defaultInnerTube.post<any>(
    'search',
    { query: normalized },
    CLIENT_CONFIGS.ANDROID,
  );

  const items: NormalizedVideoItem[] = [];

  const sections =
    response?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents ||
    response?.contents?.sectionListRenderer?.contents ||
    [];

  for (const section of sections) {
    const itemContents = section?.itemSectionRenderer?.contents || [];
    for (const item of itemContents) {
      const video = item?.videoRenderer || item?.compactVideoRenderer;
      if (!video || !video.videoId) continue;

      const id = video.videoId;
      const title = video.title?.runs?.[0]?.text || video.title?.simpleText || '';
      const channel =
        video.ownerText?.runs?.[0]?.text ||
        video.shortBylineText?.runs?.[0]?.text ||
        video.longBylineText?.runs?.[0]?.text ||
        '';
      const channelId = video.ownerText?.runs?.[0]?.navigationEndpoint?.browseEndpoint?.browseId || '';
      const views = video.viewCountText?.simpleText || video.shortViewCountText?.simpleText || '';
      const publishedAt = video.publishedTimeText?.simpleText || '';
      const duration = video.lengthText?.simpleText || null;

      items.push({
        id,
        title,
        description: '',
        channel,
        channelId,
        publishedAt,
        thumbnail: youtubeThumbnail(id),
        watchUrl: `https://www.youtube.com/watch?v=${id}`,
        views,
        duration,
      });
    }
  }

  return items;
}

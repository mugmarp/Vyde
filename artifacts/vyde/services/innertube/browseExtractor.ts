/**
 * Browse / Feed Extractor
 * Fetches trending and category feeds via InnerTube /browse.
 */

import { CLIENT_CONFIGS } from './constants';
import { defaultInnerTube } from './innertubeClient';
import { NormalizedVideoItem } from './types';

function youtubeThumbnail(id: string): string {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}

export async function extractBrowse(browseId = 'FEtrending', params?: string): Promise<NormalizedVideoItem[]> {
  const payload: Record<string, unknown> = { browseId };
  if (params) {
    payload.params = params;
  }

  const response = await defaultInnerTube.post<any>('browse', payload, CLIENT_CONFIGS.ANDROID);

  const items: NormalizedVideoItem[] = [];

  // Parse sections in InnerTube browse response
  const tabs = response?.contents?.twoColumnBrowseResultsRenderer?.tabs ||
               response?.contents?.singleColumnBrowseResultsRenderer?.tabs || [];

  for (const tab of tabs) {
    const tabContent = tab?.tabRenderer?.content;
    const sectionList = tabContent?.sectionListRenderer?.contents || [];

    for (const section of sectionList) {
      const itemSection = section?.itemSectionRenderer?.contents || [];
      for (const entry of itemSection) {
        // Shelf renderer / grid renderer
        const shelfContents = entry?.shelfRenderer?.content?.expandedShelfContentsRenderer?.items ||
                              entry?.shelfRenderer?.content?.gridRenderer?.items ||
                              [entry];

        for (const item of shelfContents) {
          const video = item?.videoRenderer || item?.gridVideoRenderer || item?.compactVideoRenderer;
          if (!video || !video.videoId) continue;

          const id = video.videoId;
          const title = video.title?.runs?.[0]?.text || video.title?.simpleText || '';
          const channel = video.shortBylineText?.runs?.[0]?.text ||
                          video.ownerText?.runs?.[0]?.text ||
                          video.longBylineText?.runs?.[0]?.text || '';
          const channelId = video.shortBylineText?.runs?.[0]?.navigationEndpoint?.browseEndpoint?.browseId || '';
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
    }
  }

  return items;
}

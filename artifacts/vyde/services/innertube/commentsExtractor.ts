/**
 * Comments Extractor
 * Extracts comments via InnerTube /next.
 */

import { CLIENT_CONFIGS } from './constants';
import { defaultInnerTube } from './innertubeClient';
import { NormalizedComment, NormalizedCommentsResponse } from './types';

export async function extractComments(videoId: string): Promise<NormalizedCommentsResponse> {
  try {
    const response = await defaultInnerTube.post<any>(
      'next',
      { videoId },
      CLIENT_CONFIGS.ANDROID,
    );

    const items: NormalizedComment[] = [];
    let commentCount: number | null = null;

    // Look for comments section in next response
    const results =
      response?.contents?.twoColumnWatchNextResults?.results?.results?.contents ||
      response?.contents?.singleColumnWatchNextResults?.results?.results?.contents ||
      [];

    for (const section of results) {
      const itemSection = section?.itemSectionRenderer;
      if (itemSection?.sectionIdentifier === 'comment-item-section') {
        const header = itemSection?.header?.commentsHeaderRenderer;
        if (header?.commentsCount?.runs?.[0]?.text) {
          const parsed = parseInt(header.commentsCount.runs[0].text.replace(/,/g, ''), 10);
          if (!isNaN(parsed)) commentCount = parsed;
        }

        const comments = itemSection?.contents || [];
        for (const entry of comments) {
          const thread = entry?.commentThreadRenderer?.comment?.commentRenderer;
          if (!thread || !thread.commentId) continue;

          const text = thread.contentText?.runs?.map((r: any) => r.text).join('') || thread.contentText?.simpleText || '';
          const author = thread.authorText?.simpleText || '';
          const published = thread.publishedTimeText?.runs?.[0]?.text || '';
          const likes = thread.likeCount || 0;
          const thumbnail = thread.authorThumbnail?.thumbnails?.[0]?.url || '';

          items.push({
            id: thread.commentId,
            author,
            authorUrl: '',
            text,
            published,
            likes: typeof likes === 'number' ? likes : 0,
            thumbnail,
          });
        }
      }
    }

    return {
      commentCount,
      items,
    };
  } catch (err) {
    return {
      commentCount: null,
      items: [],
    };
  }
}

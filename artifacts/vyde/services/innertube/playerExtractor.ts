/**
 * Player Extractor
 * Extracts streaming candidates, video metadata, and related videos via InnerTube.
 */

import { CLIENT_CONFIGS } from './constants';
import { defaultInnerTube } from './innertubeClient';
import { extractPlaybackCandidates, formatDuration, cleanText } from './cipher';
import {
  NormalizedVideoDetails,
  NormalizedVideoItem,
  InnerTubePlayerResponse,
} from './types';

function youtubeThumbnail(id: string): string {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}

export async function extractPlayer(videoId: string): Promise<NormalizedVideoDetails> {
  if (!/^[\w-]{6,20}$/.test(videoId)) {
    throw new Error('Invalid YouTube video ID format.');
  }

  // Multi-client resolution cascade
  const { data: response } = await defaultInnerTube.postWithCascade<InnerTubePlayerResponse>(
    'player',
    () => ({
      videoId,
      playbackContext: {
        contentPlaybackContext: {
          html5Preference: 'HTML5_PREF_WANTS',
        },
      },
    }),
    [
      CLIENT_CONFIGS.ANDROID,
      CLIENT_CONFIGS.IOS,
      CLIENT_CONFIGS.TV_EMBEDDED,
      CLIENT_CONFIGS.WEB,
    ],
  );

  const status = response.playabilityStatus?.status;
  if (status && status !== 'OK') {
    const reason = response.playabilityStatus?.reason || 'Video is unavailable';
    console.warn(`[PlayerExtractor] Playability status for ${videoId}: ${status} - ${reason}`);
  }

  const details = response.videoDetails || {};
  const microformat = response.microformat?.playerMicroformatRenderer;
  const streamingData = response.streamingData;

  const lengthSec = parseInt(details.lengthSeconds || microformat?.lengthSeconds || '0', 10);
  const title = details.title || microformat?.title?.simpleText || 'YouTube Video';
  const channel = details.author || microformat?.ownerChannelName || '';
  const channelId = details.channelId || microformat?.ownerProfileUrl || '';
  const description = cleanText(details.shortDescription || microformat?.description?.simpleText || '');
  const views = details.viewCount || microformat?.viewCount || '0';
  const publishedAt = microformat?.publishDate || microformat?.uploadDate || '';
  const livestream = details.isLiveContent === true;

  // Extract playback candidates (HLS manifests, progressive MP4s, adaptive audio)
  const candidates = extractPlaybackCandidates(streamingData);

  // Extract related videos via /next (non-blocking or best effort)
  let relatedVideos: NormalizedVideoItem[] = [];
  try {
    relatedVideos = await extractRelatedVideos(videoId);
  } catch (e) {
    console.warn(`[PlayerExtractor] Could not fetch related videos for ${videoId}:`, e);
  }

  return {
    id: videoId,
    title,
    description,
    channel,
    channelId,
    publishedAt,
    thumbnail: youtubeThumbnail(videoId),
    views,
    likes: '0',
    duration: lengthSec > 0 ? formatDuration(lengthSec) : null,
    durationSeconds: lengthSec,
    watchUrl: `https://www.youtube.com/watch?v=${videoId}`,
    nativePlaybackCandidates: candidates,
    relatedVideos,
    livestream,
    provider: 'innertube',
  };
}

/**
 * Extracts related videos via /youtubei/v1/next
 */
export async function extractRelatedVideos(videoId: string): Promise<NormalizedVideoItem[]> {
  try {
    const response = await defaultInnerTube.post<any>('next', {
      videoId,
    });

    const items: NormalizedVideoItem[] = [];
    const results =
      response?.contents?.twoColumnWatchNextResults?.secondaryResults?.secondaryResults?.results ||
      response?.contents?.singleColumnWatchNextResults?.pivot?.pivot?.contents ||
      [];

    for (const entry of results) {
      const compactVideo = entry.compactVideoRenderer || entry.videoRenderer;
      if (!compactVideo || !compactVideo.videoId) continue;

      const id = compactVideo.videoId;
      const title = compactVideo.title?.simpleText || compactVideo.title?.runs?.[0]?.text || '';
      const channel = compactVideo.shortBylineText?.runs?.[0]?.text || compactVideo.longBylineText?.runs?.[0]?.text || '';
      const views = compactVideo.viewCountText?.simpleText || compactVideo.shortViewCountText?.simpleText || '';
      const duration = compactVideo.lengthText?.simpleText || null;

      items.push({
        id,
        title,
        description: '',
        channel,
        channelId: compactVideo.shortBylineText?.runs?.[0]?.navigationEndpoint?.browseEndpoint?.browseId || '',
        publishedAt: compactVideo.publishedTimeText?.simpleText || '',
        thumbnail: youtubeThumbnail(id),
        watchUrl: `https://www.youtube.com/watch?v=${id}`,
        views,
        duration,
      });

      if (items.length >= 15) break;
    }

    return items;
  } catch (err) {
    return [];
  }
}

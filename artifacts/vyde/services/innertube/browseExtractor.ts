/** Browse cards are parsed independently from transport and empty-feed state. */
import { CLIENT_CONFIGS } from './constants';
import { defaultInnerTube } from './innertubeClient';
import type { RequestOptions } from './request';
import { NormalizedVideoItem } from './types';

const text = (value: any): string => {
  const result = value?.simpleText ?? value?.content
    ?? value?.runs?.map((run: any) => run.text ?? '').join('') ?? '';
  return typeof result === 'string' ? result : '';
};

export function parseBrowseResponse(response: any): NormalizedVideoItem[] {
  const root = response?.contents;
  const tabs = root?.twoColumnBrowseResultsRenderer?.tabs ?? root?.singleColumnBrowseResultsRenderer?.tabs;
  const pending: any[] = [];
  if (Array.isArray(tabs)) {
    const selected = tabs.filter(tab => tab.tabRenderer?.selected === true);
    const chosen = selected.length ? selected : tabs.filter(tab => tab.tabRenderer?.content).slice(0, 1);
    pending.push(...chosen.map(tab => tab.tabRenderer.content));
  } else if (root) pending.push(root);

  let recognized = false;
  let unreadableCards = false;
  let cursor = 0;
  const videos = new Map<string, NormalizedVideoItem>();
  while (cursor < pending.length) {
    if (cursor >= 50000) throw new Error('Browse response exceeds the parsing budget.');
    const entry = pending[cursor++];
    if (!entry || typeof entry !== 'object') continue;
    if (entry.richItemRenderer) {
      const content = entry.richItemRenderer.content;
      if (!content?.videoRenderer && !content?.gridVideoRenderer && !content?.lockupViewModel
          && !content?.reelItemRenderer && !content?.shortsLockupViewModel) unreadableCards = true;
      pending.push(content);
    }
    for (const key of ['richSectionRenderer', 'shelfRenderer']) {
      if (entry[key]?.content) pending.push(entry[key].content);
    }
    for (const [key, children] of [
      ['richGridRenderer', 'contents'], ['sectionListRenderer', 'contents'],
      ['itemSectionRenderer', 'contents'], ['gridRenderer', 'items'],
      ['expandedShelfContentsRenderer', 'items'], ['horizontalListRenderer', 'items'],
    ]) {
      if (Array.isArray(entry[key]?.[children])) {
        recognized = true;
        pending.push(...entry[key][children]);
      }
    }
    const video = entry.videoRenderer ?? entry.gridVideoRenderer ?? entry.compactVideoRenderer;
    const lockup = entry.lockupViewModel;
    if (!video && !(lockup?.contentType === 'LOCKUP_CONTENT_TYPE_VIDEO')) continue;
    recognized = true;
    const id = video?.videoId ?? lockup?.contentId;
    const title = text(video?.title ?? lockup?.metadata?.lockupMetadataViewModel?.title);
    if (typeof id !== 'string' || !id || !title) throw new Error('Browse video format could not be read.');
    const byline = video?.shortBylineText ?? video?.ownerText ?? video?.longBylineText;
    const channelId = byline?.runs?.find((run: any) => run.navigationEndpoint?.browseEndpoint?.browseId)
      ?.navigationEndpoint.browseEndpoint.browseId ?? '';
    videos.set(id, {
      id, title, description: '', channel: text(byline), channelId,
      publishedAt: text(video?.publishedTimeText),
      thumbnail: video?.thumbnail?.thumbnails?.[0]?.url
        ?? lockup?.contentImage?.thumbnailViewModel?.image?.sources?.[0]?.url
        ?? `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      watchUrl: `https://www.youtube.com/watch?v=${id}`,
      views: text(video?.viewCountText ?? video?.shortViewCountText),
      duration: text(video?.lengthText) || null,
    });
  }
  if (!recognized || (!videos.size && unreadableCards)) throw new Error('The browse response format could not be read.');
  return [...videos.values()];
}

export async function extractBrowse(browseId = 'FEwhat_to_watch', params?: string, options: RequestOptions = {}): Promise<NormalizedVideoItem[]> {
  const payload: Record<string, unknown> = { browseId };
  if (params) payload.params = params;
  const response = await defaultInnerTube.post<any>('browse', payload, CLIENT_CONFIGS.WEB, options);
  return parseBrowseResponse(response);
}

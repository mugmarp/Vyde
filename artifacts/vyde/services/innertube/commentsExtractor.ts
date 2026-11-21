/** Direct comments requests, including initial and subsequent continuations. */
import { CLIENT_CONFIGS } from './constants';
import { defaultInnerTube } from './innertubeClient';
import { NormalizedComment, NormalizedCommentsResponse } from './types';

const text = (value: any): string => typeof value === 'string' ? value
  : value?.simpleText ?? value?.content ?? value?.runs?.map((run: any) => run.text ?? '').join('') ?? '';

function count(value: any): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const raw = text(value).trim().replace(/,/g, '');
  const match = raw.match(/^(\d+(?:\.\d+)?)\s*([KMB])?(?:\s|$)/i);
  if (!match) return null;
  const scale = ({ K: 1000, M: 1000000, B: 1000000000 } as Record<string, number>)[match[2]?.toUpperCase()] ?? 1;
  return Math.round(Number(match[1]) * scale);
}

function* objects(root: unknown): Generator<any> {
  const pending = [root];
  let visited = 0;
  while (pending.length) {
    const value = pending.pop();
    if (!value || typeof value !== 'object') continue;
    if (++visited > 100000) throw new Error('Comments response exceeds the parsing budget.');
    yield value;
    pending.push(...Object.values(value));
  }
}

function token(item: any): string | null {
  const renderer = item?.continuationItemRenderer;
  const value = renderer?.continuationEndpoint?.continuationCommand?.token
    ?? renderer?.button?.buttonRenderer?.command?.continuationCommand?.token;
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function parsePage(response: any): NormalizedCommentsResponse {
  const entries: any[] = [];
  let recognized = false;
  for (const node of objects(response?.contents)) {
    const section = node.itemSectionRenderer;
    if (section && (section.targetId === 'comments-section' || section.sectionIdentifier === 'comment-item-section')) {
      recognized = true;
      if (section.header?.commentsHeaderRenderer) entries.push({ commentsHeaderRenderer: section.header.commentsHeaderRenderer });
      entries.push(...(section.contents ?? []));
    }
  }
  for (const command of [...(response?.onResponseReceivedEndpoints ?? []), ...(response?.onResponseReceivedActions ?? [])]) {
    const action = command.reloadContinuationItemsCommand ?? command.appendContinuationItemsAction;
    if (Array.isArray(action?.continuationItems)) {
      if (action.targetId === 'comments-section' || action.targetId === 'comment-item-section') recognized = true;
      entries.push(...action.continuationItems);
    }
  }

  const entities = new Map<string, any>();
  for (const mutation of response?.frameworkUpdates?.entityBatchUpdate?.mutations ?? []) {
    if (mutation.entityKey) entities.set(mutation.entityKey, mutation.payload);
  }
  const items = new Map<string, NormalizedComment>();
  let commentCount: number | null = null;
  let nextPage: string | null = null;
  let disabled = false;
  for (const entry of entries) {
    const header = entry.commentsHeaderRenderer;
    if (header) {
      recognized = true;
      commentCount = count(header.countText ?? header.commentsCount);
    }
    if (entry.messageRenderer) {
      // Explicit English provider message (requests use hl=en), never absence
      // of a token or an unknown schema, establishes the disabled state.
      const message = text(entry.messageRenderer.text);
      if (/comments (?:are |have been )?(?:turned off|disabled)/i.test(message)) {
        recognized = true;
        disabled = true;
      }
    }
    const next = token(entry);
    if (next) { nextPage = next; recognized = true; }
    const thread = entry.commentThreadRenderer;
    const renderer = thread?.comment?.commentRenderer ?? entry.commentRenderer;
    const viewModel = thread?.commentViewModel?.commentViewModel ?? thread?.commentViewModel ?? entry.commentViewModel;
    if (renderer) {
      recognized = true;
      if (!renderer.commentId) throw new Error('A comment is missing its identity.');
      const authorUrl = renderer.authorEndpoint?.browseEndpoint?.browseId;
      items.set(renderer.commentId, {
        id: renderer.commentId, author: text(renderer.authorText), text: text(renderer.contentText),
        authorUrl: authorUrl ? `https://www.youtube.com/channel/${authorUrl}` : '',
        published: text(renderer.publishedTimeText), likes: count(renderer.likeCount ?? renderer.voteCount) ?? 0,
        thumbnail: renderer.authorThumbnail?.thumbnails?.[0]?.url ?? '',
      });
    } else if (viewModel) {
      recognized = true;
      const entity = entities.get(viewModel.commentKey)?.commentEntityPayload;
      const properties = entity?.properties;
      const id = properties?.commentId ?? viewModel.commentId;
      if (!entity || !id || !properties?.content) throw new Error('Comment entity data is incomplete.');
      const author = entity.author ?? {};
      const channel = author.channelId ?? author.channelCommand?.innertubeCommand?.browseEndpoint?.browseId;
      items.set(id, {
        id, author: text(author.displayName), text: text(properties.content),
        authorUrl: channel ? `https://www.youtube.com/channel/${channel}` : '',
        published: text(properties.publishedTime), likes: count(entity.toolbar?.likeCountNotliked) ?? 0,
        thumbnail: author.avatarThumbnailUrl ?? author.avatar?.image?.sources?.[0]?.url ?? '',
      });
    }
  }
  if (!recognized) throw new Error('The comments response format could not be read.');
  if (disabled && items.size > 0) throw new Error('The comments response has conflicting availability states.');
  return { commentCount, items: [...items.values()], nextPage: disabled ? null : nextPage, disabled };
}

export async function extractComments(videoId: string, continuation?: string): Promise<NormalizedCommentsResponse> {
  const response = await defaultInnerTube.post<any>('next', continuation ? { continuation } : { videoId }, CLIENT_CONFIGS.WEB);
  const page = parsePage(response);
  if (!continuation && page.items.length === 0 && page.nextPage && !page.disabled) {
    const continued = await defaultInnerTube.post<any>('next', { continuation: page.nextPage }, CLIENT_CONFIGS.WEB);
    const initial = parsePage(continued);
    return { ...initial, commentCount: initial.commentCount ?? page.commentCount };
  }
  return page;
}

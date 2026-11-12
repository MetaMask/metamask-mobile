import type { Query } from '@tanstack/query-core';
import type {
  CollectiblesCommentTarget,
  CollectiblesFeedItem,
} from '../clients/CollectiblesSocialApiClient';

/** The feed defines the comment identity independently of its UI list key. */
export const getCollectiblesCommentTarget = (
  item: CollectiblesFeedItem,
): CollectiblesCommentTarget => ({
  targetType: item.type,
  targetId:
    item.type === 'collectibles_pack'
      ? item.data.pack.packId
      : item.type === 'collectibles_multi_pack'
        ? item.data.yoloId
        : item.itemId,
});

const record = (value: unknown): Record<string, unknown> | undefined =>
  value !== null && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : undefined;

const hasTarget = (
  item: unknown,
  target: CollectiblesCommentTarget,
): boolean => {
  const entry = record(item);
  const data = record(entry?.data);
  return (
    entry?.type === target.targetType &&
    (target.targetType === 'collectibles_pack'
      ? record(data?.pack)?.packId
      : target.targetType === 'collectibles_multi_pack'
        ? data?.yoloId
        : entry?.itemId) === target.targetId
  );
};

/** Invalidate only already-cached projections containing the changed engagement. */
export function isSocialEngagementQuery(
  scope: string,
  target: CollectiblesCommentTarget,
  includeComments: boolean,
  query: Query,
): boolean {
  if (query.queryKey[1] !== scope) return false;
  const request = record(query.queryKey[2]);
  switch (query.queryKey[0]) {
    case 'CollectiblesSocialApiDataService:getComments':
      return (
        includeComments &&
        request?.targetType === target.targetType &&
        request?.targetId === target.targetId
      );
    case 'CollectiblesSocialApiDataService:getFeed': {
      // Wait for pending projections before deciding whether they contain the
      // target; a first response has no items to inspect yet.
      if (query.state.fetchStatus === 'fetching') return true;
      const pages = record(query.state.data)?.pages;
      return (
        Array.isArray(pages) &&
        pages.some((page: unknown) => {
          const items = record(page)?.items;
          return (
            Array.isArray(items) &&
            items.some((item: unknown) => hasTarget(item, target))
          );
        })
      );
    }
    case 'CollectiblesSocialApiDataService:getPackSocialContext':
      if (query.state.fetchStatus === 'fetching') return true;
      return Object.values(record(query.state.data) ?? {}).some((context) =>
        hasTarget(record(context)?.lastFriendEpic, target),
      );
    default:
      return false;
  }
}

/** A post affects its author's feed and shared feeds, not collection/ranking/profile reads. */
export function isSocialPublicationQuery(
  scope: string,
  item: CollectiblesFeedItem,
  query: Query,
): boolean {
  if (query.queryKey[1] !== scope) return false;
  const request = record(query.queryKey[2]);
  return (
    query.queryKey[0] === 'CollectiblesSocialApiDataService:getFeed' &&
    (!request?.profileId || request.profileId === item.actor.profileId)
  );
}

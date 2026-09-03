import type { TrendingAsset } from '@metamask/assets-controllers';

export interface WatchlistEditDraft {
  order: string[];
}

export const normalizeAssetId = (assetId: string): string =>
  assetId.toLowerCase();

export const getTokenAssetIdOrder = (tokens: TrendingAsset[]): string[] =>
  tokens.map((token) => normalizeAssetId(String(token.assetId)));

export const createDraftFromTokens = (
  queryTokens: TrendingAsset[],
): WatchlistEditDraft => ({
  order: getTokenAssetIdOrder(queryTokens),
});

const buildQueryTokenMap = (
  queryTokens: TrendingAsset[],
): Map<string, TrendingAsset> =>
  new Map(
    queryTokens.map((token) => [
      normalizeAssetId(String(token.assetId)),
      token,
    ]),
  );

export const deriveDisplayTokens = (
  queryTokens: TrendingAsset[],
  draft: WatchlistEditDraft | null,
): TrendingAsset[] => {
  if (draft === null) {
    return queryTokens;
  }

  const tokenById = buildQueryTokenMap(queryTokens);

  return draft.order
    .map((assetId) => tokenById.get(normalizeAssetId(assetId)))
    .filter((token): token is TrendingAsset => token !== undefined);
};

export const reorderDraftOrder = (
  order: string[],
  from: number,
  to: number,
): string[] => {
  const next = [...order];
  const [removed] = next.splice(from, 1);
  next.splice(to, 0, removed);
  return next;
};

export const removeFromDraftOrder = (
  order: string[],
  assetId: string,
): string[] => {
  const normalizedAssetId = normalizeAssetId(assetId);
  return order.filter((id) => normalizeAssetId(id) !== normalizedAssetId);
};

export const getStorageOrderFromDraft = (
  draft: WatchlistEditDraft,
  queryAssetIdSet: ReadonlySet<string>,
): string[] => {
  const orderedIds =
    queryAssetIdSet.size === 0
      ? draft.order
      : draft.order.filter((assetId) =>
          queryAssetIdSet.has(normalizeAssetId(assetId)),
        );

  return orderedIds.slice().reverse();
};

export const ordersMatch = (orderA: string[], orderB: string[]): boolean => {
  if (orderA.length !== orderB.length) {
    return false;
  }

  return orderA.every(
    (assetId, index) =>
      normalizeAssetId(assetId) === normalizeAssetId(orderB[index]),
  );
};

export const hasOrderChanged = (
  draftOrder: string[],
  queryTokens: TrendingAsset[],
  queryAssetIdSet: ReadonlySet<string>,
): boolean => {
  const queryOrder = queryTokens.map((token) =>
    normalizeAssetId(String(token.assetId)),
  );

  const comparableDraftOrder = draftOrder.filter((assetId) =>
    queryAssetIdSet.has(normalizeAssetId(assetId)),
  );

  if (comparableDraftOrder.length !== queryOrder.length) {
    return true;
  }

  return comparableDraftOrder.some(
    (assetId, index) => assetId !== queryOrder[index],
  );
};

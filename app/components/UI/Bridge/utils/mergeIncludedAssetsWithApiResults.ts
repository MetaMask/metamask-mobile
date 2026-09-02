import type { IncludeAsset, PopularToken } from '../types';

/**
 * Appends locally included assets to API results while deduping by asset id.
 *
 * This keeps API ordering intact and guarantees locally curated assets remain
 * visible even when the API only returns a filtered native duplicate.
 */
export const mergeIncludedAssetsWithApiResults = (
  apiResults: readonly (PopularToken | IncludeAsset)[] | null | undefined,
  includeAssets: readonly IncludeAsset[],
): (PopularToken | IncludeAsset)[] => {
  const mergedResults: (PopularToken | IncludeAsset)[] = [];
  const seenAssetIds = new Set<string>();

  for (const token of [...(apiResults ?? []), ...includeAssets]) {
    const normalizedAssetId = token.assetId.toLowerCase();
    if (seenAssetIds.has(normalizedAssetId)) {
      continue;
    }

    seenAssetIds.add(normalizedAssetId);
    mergedResults.push(token);
  }

  return mergedResults;
};

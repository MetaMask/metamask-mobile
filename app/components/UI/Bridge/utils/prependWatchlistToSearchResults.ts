import type { CaipAssetType } from '@metamask/utils';

import type { BridgeToken } from '../types';
import { normalizeEvmAssetId } from './tokenUtils';

const getBridgeTokenAssetKey = (token: BridgeToken): string => {
  const assetId = (token as BridgeToken & { assetId?: CaipAssetType }).assetId;
  if (assetId) {
    return normalizeEvmAssetId(assetId);
  }

  return `${String(token.chainId)}:${token.address.toLowerCase()}`;
};

/**
 * Prepends watchlist row matches ahead of default swap search results, deduping
 * by asset id so watchlist ordering wins when the same token appears in both.
 */
export const prependWatchlistToSearchResults = (
  watchlistMatches: readonly BridgeToken[],
  searchResults: readonly BridgeToken[],
): BridgeToken[] => {
  const seenAssetKeys = new Set<string>();
  const mergedResults: BridgeToken[] = [];

  for (const token of watchlistMatches) {
    const assetKey = getBridgeTokenAssetKey(token);
    if (seenAssetKeys.has(assetKey)) {
      continue;
    }

    seenAssetKeys.add(assetKey);
    mergedResults.push(token);
  }

  for (const token of searchResults) {
    const assetKey = getBridgeTokenAssetKey(token);
    if (seenAssetKeys.has(assetKey)) {
      continue;
    }

    seenAssetKeys.add(assetKey);
    mergedResults.push(token);
  }

  return mergedResults;
};

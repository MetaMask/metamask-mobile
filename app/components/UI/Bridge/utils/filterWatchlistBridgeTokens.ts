import type { CaipChainId } from '@metamask/utils';

import { getCaipChainIdFromAssetId } from '../../Trending/components/TrendingTokenRowItem/utils';
import type { BridgeToken } from '../types';
import { tokenMatchesQuery } from './tokenUtils';

export interface FilterWatchlistBridgeTokensOptions {
  selectedChainId?: CaipChainId;
  searchQuery?: string;
}

/**
 * Applies local search and fiat-balance sorting to watchlist tokens shown in
 * the Swap/Bridge token picker.
 */
export const filterWatchlistBridgeTokens = (
  tokens: readonly (BridgeToken & { assetId: string })[],
  { selectedChainId, searchQuery }: FilterWatchlistBridgeTokensOptions,
): BridgeToken[] => {
  let filtered = [...tokens];

  if (selectedChainId) {
    filtered = filtered.filter(
      (token) =>
        getCaipChainIdFromAssetId(String(token.assetId)) === selectedChainId,
    );
  }

  const trimmedQuery = searchQuery?.trim();
  if (trimmedQuery) {
    filtered = filtered.filter((token) =>
      tokenMatchesQuery(token, trimmedQuery),
    );
  }

  return filtered.sort(
    (left, right) => (right.tokenFiatAmount ?? 0) - (left.tokenFiatAmount ?? 0),
  );
};

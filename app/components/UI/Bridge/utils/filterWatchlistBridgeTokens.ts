import type { CaipChainId } from '@metamask/utils';

import { getCaipChainIdFromAssetId } from '../../Trending/components/TrendingTokenRowItem/utils';
import type { BridgeToken } from '../types';
import { tokenMatchesQuery } from './tokenUtils';

export interface FilterWatchlistBridgeTokensOptions {
  selectedChainId?: CaipChainId;
  isSourcePicker: boolean;
  searchQuery?: string;
}

const hasPositiveBalance = (token: BridgeToken): boolean => {
  const balance = token.balance?.trim();
  if (!balance) {
    return false;
  }

  if (balance.startsWith('0x')) {
    try {
      return BigInt(balance) > 0n;
    } catch {
      return false;
    }
  }

  return Number.parseFloat(balance) > 0;
};

/**
 * Applies network, source zero-balance, local search, and fiat-balance sorting
 * to watchlist tokens shown in the Swap/Bridge token picker.
 */
export const filterWatchlistBridgeTokens = (
  tokens: readonly (BridgeToken & { assetId: string })[],
  {
    selectedChainId,
    isSourcePicker,
    searchQuery,
  }: FilterWatchlistBridgeTokensOptions,
): BridgeToken[] => {
  let filtered = [...tokens];

  if (selectedChainId) {
    filtered = filtered.filter(
      (token) =>
        getCaipChainIdFromAssetId(String(token.assetId)) === selectedChainId,
    );
  }

  if (isSourcePicker) {
    filtered = filtered.filter(hasPositiveBalance);
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

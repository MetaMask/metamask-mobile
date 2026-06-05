import { useMemo, useCallback } from 'react';
import type { CaipChainId } from '@metamask/utils';
import { useSelector } from 'react-redux';
import { useBalancesByAssetId } from './useBalancesByAssetId';
import { useFetchPopularTokens } from './useFetchPopularTokens';
import { tokenMatchesQuery, tokenToIncludeAsset } from '../utils/tokenUtils';
import { selectAllowedChainRanking } from '../../../../core/redux/slices/bridge';
import type { IncludeAsset } from '../types';
import { getMinimalIncludedAssets } from '../utils/cacheUtils';

/**
 * Custom hook to fetch popular tokens from the Bridge API with caching
 * @param chainIds - A list of chain IDs to fetch tokens for
 * @returns Object containing the filtered assets to include in the API request,
 * a function to fetch popular tokens, and the balances indexed by assetId for
 * O(1) lookup when merging with API results
 */
export const useInitialBridgeTokens = (
  chainIds?: CaipChainId[],
  searchString?: string,
) => {
  const enabledChainRanking = useSelector(selectAllowedChainRanking);

  const chainIdsToFetch = useMemo(() => {
    if (chainIds) {
      return chainIds;
    }

    if (!enabledChainRanking || enabledChainRanking.length === 0) {
      return [];
    }

    // If "All" is selected, use all chains from filtered chainRanking
    return enabledChainRanking.map(
      (chain: { chainId: CaipChainId }) => chain.chainId,
    );
  }, [enabledChainRanking, chainIds]);

  // Get balances indexed by assetId for O(1) lookup when merging with API results
  const { tokensWithBalance, balancesByAssetId } = useBalancesByAssetId({
    chainIds: chainIdsToFetch,
  });

  const filteredTokensWithBalance = useMemo(
    () =>
      tokensWithBalance.filter(
        (token) => token.balance && parseFloat(token.balance) > 0,
      ),
    [tokensWithBalance],
  );

  // Create includeAssets array from tokens with balance to be sent to API
  // Stringified to avoid triggering the useEffect when only balances change
  const includeAssetsObject = useMemo(
    () =>
      filteredTokensWithBalance
        .map(tokenToIncludeAsset)
        .filter((asset): asset is IncludeAsset => asset !== null),

    [filteredTokensWithBalance],
  );

  // Stable string key for the includeAssets array — re-derive the callback
  // only when the underlying assetIds change, not when balances flicker.
  const includeAssetsId = useMemo(
    () => getMinimalIncludedAssets(includeAssetsObject),
    [includeAssetsObject],
  );

  const fetchTokens = useFetchPopularTokens();

  const fetchPopularTokens = useCallback(
    (signal?: AbortSignal) =>
      fetchTokens({
        chainIds: chainIdsToFetch,
        includeAssets: includeAssetsObject,
        signal,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [includeAssetsId, chainIdsToFetch, fetchTokens],
  );

  const searchQuery = searchString?.trim();
  const searchIncludeAssets = useMemo(
    () =>
      searchQuery
        ? tokensWithBalance
            .map((token) =>
              tokenMatchesQuery(token, searchQuery)
                ? tokenToIncludeAsset(token)
                : null,
            )
            .filter((asset): asset is IncludeAsset => asset !== null)
        : [],
    [tokensWithBalance, searchQuery],
  );

  return {
    includeAssets: includeAssetsObject,
    fetchPopularTokens,
    balancesByAssetId,
    searchIncludeAssets,
  };
};

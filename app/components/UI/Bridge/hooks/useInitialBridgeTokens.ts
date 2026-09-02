import { useMemo, useCallback } from 'react';
import type { CaipChainId } from '@metamask/utils';
import { useSelector } from 'react-redux';
import { useBalancesByAssetId } from './useBalancesByAssetId';
import { useFetchPopularTokens } from './useFetchPopularTokens';
import {
  getDefaultDestToken,
  tokenMatchesQuery,
  tokenToIncludeAsset,
} from '../utils/tokenUtils';
import { selectAllowedChainRanking } from '../../../../core/redux/slices/bridge';
import type { BridgeToken, IncludeAsset } from '../types';
import { getMinimalIncludedAssets } from '../utils/cacheUtils';
import { ARC_CAIP_CHAIN_ID } from '../../../../enablement/assets/arc';
import { BRIDGE_CHAINID_TO_DEFAULT_SOURCE_TOKEN } from '../constants/default-swap-dest-tokens';

/**
 * Removes null entries and deduplicates include-assets by normalized asset id.
 *
 * Arc can contribute curated assets from multiple sources, so this keeps the
 * include-assets payload stable while preserving the last occurrence for a
 * given asset id.
 *
 * @param includeAssets - Candidate assets, optionally including null entries.
 * @returns Deduplicated include-assets keyed by lowercased asset id.
 */
const dedupeIncludeAssets = (
  includeAssets: (IncludeAsset | null)[],
): IncludeAsset[] => {
  const uniqueAssets = new Map<string, IncludeAsset>();

  for (const asset of includeAssets) {
    if (!asset) {
      continue;
    }

    uniqueAssets.set(asset.assetId.toLowerCase(), asset);
  }

  return [...uniqueAssets.values()];
};

/**
 * Narrows optional bridge-token entries to defined tokens.
 *
 * @param token - Candidate bridge token.
 * @returns True when the token is defined.
 */
const isDefinedBridgeToken = (
  token: BridgeToken | undefined,
): token is BridgeToken => token !== undefined;

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

  const arcDefaultTokens = useMemo(() => {
    if (!chainIdsToFetch.includes(ARC_CAIP_CHAIN_ID)) {
      return [];
    }

    return [
      BRIDGE_CHAINID_TO_DEFAULT_SOURCE_TOKEN[ARC_CAIP_CHAIN_ID],
      getDefaultDestToken(ARC_CAIP_CHAIN_ID),
    ].filter(isDefinedBridgeToken);
  }, [chainIdsToFetch]);

  // Create includeAssets array from tokens with balance to be sent to API
  // Stringified to avoid triggering the useEffect when only balances change
  const includeAssetsObject = useMemo(
    () =>
      dedupeIncludeAssets([
        ...filteredTokensWithBalance.map(tokenToIncludeAsset),
        ...arcDefaultTokens.map(tokenToIncludeAsset),
      ]),

    [arcDefaultTokens, filteredTokensWithBalance],
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
        ? dedupeIncludeAssets([
            ...tokensWithBalance.map((token) =>
              tokenMatchesQuery(token, searchQuery)
                ? tokenToIncludeAsset(token)
                : null,
            ),
            ...arcDefaultTokens.map((token) =>
              tokenMatchesQuery(token, searchQuery)
                ? tokenToIncludeAsset(token)
                : null,
            ),
          ])
        : [],
    [arcDefaultTokens, tokensWithBalance, searchQuery],
  );

  return {
    includeAssets: includeAssetsObject,
    fetchPopularTokens,
    balancesByAssetId,
    searchIncludeAssets,
  };
};

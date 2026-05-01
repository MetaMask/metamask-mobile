import { useState, useEffect, useMemo, useCallback } from 'react';
import type { CaipChainId } from '@metamask/utils';
import { BRIDGE_API_BASE_URL } from '../../../../constants/bridge';
import Engine from '../../../../core/Engine';
import { useBalancesByAssetId } from './useBalancesByAssetId';
import { tokenMatchesQuery, tokenToIncludeAsset } from '../utils/tokenUtils';
import { getBaseSemVerVersion } from '../../../../util/version';
import { BridgeClientId, getClientHeaders } from '@metamask/bridge-controller';
import { useDispatch, useSelector } from 'react-redux';
import {
  cleanupExpiredEntries,
  selectAllowedChainRanking,
  selectPopularTokensCache,
  setPopularTokensCache,
} from '../../../../core/redux/slices/bridge';
import { selectBasicFunctionalityEnabled } from '../../../../selectors/settings';
import type { IncludeAsset, PopularToken } from '../types';
import {
  getCacheKey,
  getMinimalIncludedAssets,
  isCacheValid,
} from '../utils/cacheUtils';

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
  const dispatch = useDispatch();

  const [bearerToken, setBearerToken] = useState<string | null>(null);

  const enabledChainRanking = useSelector(selectAllowedChainRanking);
  const isBasicFunctionalityEnabled = useSelector(
    selectBasicFunctionalityEnabled,
  );
  const popularTokensCache = useSelector(selectPopularTokensCache);

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

  const includeAssetsId = useMemo(
    () => getMinimalIncludedAssets(includeAssetsObject),
    [includeAssetsObject],
  );

  useEffect(() => {
    if (isBasicFunctionalityEnabled) {
      Engine.context.AuthenticationController.getBearerToken()
        .then((token) => {
          setBearerToken(token);
        })
        .catch((error) => {
          console.warn(
            'Failed to get bearer token for /getTokens/popular',
            error,
          );
        });
    }
  }, [isBasicFunctionalityEnabled]);

  const cachedEntry = useMemo(() => {
    const cacheKey = getCacheKey(chainIdsToFetch, includeAssetsObject);
    return popularTokensCache[cacheKey];
  }, [popularTokensCache, chainIdsToFetch, includeAssetsObject]);

  const fetchPopularTokens = useCallback(
    async (signal?: AbortSignal) => {
      // Cleanup expired entries before checking cache
      dispatch(cleanupExpiredEntries());

      // Check if we have a valid cached response
      if (cachedEntry && isCacheValid(cachedEntry)) {
        return cachedEntry.data;
      }

      try {
        const response = await fetch(
          `${BRIDGE_API_BASE_URL}/getTokens/popular`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...getClientHeaders({
                clientId: BridgeClientId.MOBILE,
                clientVersion: getBaseSemVerVersion(),
                jwt: bearerToken ?? '',
              }),
            },
            body: JSON.stringify({
              chainIds: chainIdsToFetch,
              includeAssets: includeAssetsObject,
            }),
            signal,
          },
        );

        if (response.ok === false) {
          console.error(
            `Failed to fetch popular tokens with status ${response.status}`,
          );
          return undefined;
        }

        const popularAssetsResponse: PopularToken[] = await response.json();
        const isValidTopLevelPayload = Array.isArray(popularAssetsResponse);

        if (isValidTopLevelPayload && popularAssetsResponse.length > 0) {
          // Cache only valid top-level API payloads so malformed responses do
          // not suppress retries for the full cache TTL.
          dispatch(
            setPopularTokensCache({
              includeAssets: includeAssetsObject,
              chainIds: chainIdsToFetch,
              popularTokens: popularAssetsResponse,
            }),
          );
          return popularAssetsResponse;
        }

        return undefined;
      } catch (error) {
        // Ignore abort errors - request was intentionally cancelled
        if (error instanceof Error && error.name === 'AbortError') {
          return;
        }
        console.error('Error fetching popular tokens:', error);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [includeAssetsId, chainIdsToFetch, bearerToken, cachedEntry],
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

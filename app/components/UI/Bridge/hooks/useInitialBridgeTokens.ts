import { useState, useEffect, useMemo, useCallback } from 'react';
import { CaipChainId, CaipAssetType } from '@metamask/utils';
import { BRIDGE_API_BASE_URL } from '../../../../constants/bridge';
import { TokenRwaData } from '@metamask/assets-controllers';
import Engine from '../../../../core/Engine';
import { useBalancesByAssetId } from './useBalancesByAssetId';
import { tokenToIncludeAsset } from '../utils/tokenUtils';
import { getBaseSemVerVersion } from '../../../../util/version';
import { BridgeClientId, getClientHeaders } from '@metamask/bridge-controller';
import { useSelector } from 'react-redux';
import { selectAllowedChainRanking } from '../../../../core/redux/slices/bridge';
import { selectBasicFunctionalityEnabled } from '../../../../selectors/settings';

export interface PopularToken {
  assetId: CaipAssetType;
  decimals: number;
  iconUrl: string;
  name: string;
  symbol: string;
  noFee?: {
    isSource: boolean;
    isDestination: boolean;
  };
}

export interface IncludeAsset {
  assetId: CaipAssetType;
  name: string;
  symbol: string;
  decimals: number;
  rwaData?: TokenRwaData;
}

interface CacheEntry {
  data: PopularToken[];
  timestamp: number;
}

// Cache for popular tokens with 15-minute TTL
export const popularTokensCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes in milliseconds

// Cleanup throttling - runs at most once every 5 minutes
let lastCleanupTime = 0;
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Removes expired entries from the cache (throttled to once every 5 minutes).
 * With a 15-minute TTL, this ensures stale entries are cleaned up 3 times per
 * cache lifetime while minimizing unnecessary iterations.
 */
const cleanupExpiredEntries = (): void => {
  const now = Date.now();

  // Skip if cleaned up within the last 5 minutes
  if (now - lastCleanupTime < CLEANUP_INTERVAL_MS) {
    return;
  }

  lastCleanupTime = now;

  for (const [key, entry] of popularTokensCache.entries()) {
    if (now - entry.timestamp >= CACHE_TTL_MS) {
      popularTokensCache.delete(key);
    }
  }
};

/**
 * Generates a cache key from request parameters
 */
const getCacheKey = (
  chainIds: CaipChainId[],
  includeAssets: string,
): string => {
  // Alphabetical sort is correct for string chain IDs (e.g., 'eip155:1')
  // Explicit compare function is required for SonarQube analysis
  const sortedChainIds = [...chainIds].sort((a, b) => (a > b ? 1 : -1));
  return `${sortedChainIds.join(',')}_${includeAssets}`;
};

/**
 * Checks if a cache entry is still valid
 */
const isCacheValid = (entry: CacheEntry): boolean => {
  const now = Date.now();
  return now - entry.timestamp < CACHE_TTL_MS;
};

/**
 * Custom hook to fetch popular tokens from the Bridge API with caching
 * @param params - Configuration object containing chainIds and includeAssets
 * @returns Object containing popularTokens array and isLoading state
 */
export const useInitialBridgeTokens = (chainIds?: CaipChainId[]) => {
  const [bearerToken, setBearerToken] = useState<string | null>(null);

  const enabledChainRanking = useSelector(selectAllowedChainRanking);
  const isBasicFunctionalityEnabled = useSelector(
    selectBasicFunctionalityEnabled,
  );

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
  const includeAssets = useMemo(() => {
    const balanceAssets = filteredTokensWithBalance
      .map(tokenToIncludeAsset)
      .filter((asset): asset is IncludeAsset => asset !== null);

    return JSON.stringify(balanceAssets);
  }, [filteredTokensWithBalance]);

  useEffect(() => {
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
  }, []);

  const parsedIncludeAssets = useMemo(() => {
    try {
      return JSON.parse(includeAssets);
    } catch (error) {
      console.error('Error parsing include assets:', error);
      return [];
    }
  }, [includeAssets]);

  const fetchPopularTokens = useCallback(async () => {
    const abortController = new AbortController();
    // Cleanup expired entries before checking cache
    cleanupExpiredEntries();

    const cacheKey = getCacheKey(chainIdsToFetch, includeAssets);
    const cachedEntry = popularTokensCache.get(cacheKey);

    // Check if we have a valid cached response
    if (cachedEntry && isCacheValid(cachedEntry)) {
      return cachedEntry.data;
    }

    try {
      const response = await fetch(`${BRIDGE_API_BASE_URL}/getTokens/popular`, {
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
          includeAssets: parsedIncludeAssets,
        }),
        signal: abortController.signal,
      });

      if (response.ok === false) {
        throw new Error(
          `Failed to fetch popular tokens with status ${response.status}`,
        );
      }

      const popularAssetsResponse: PopularToken[] = await response.json();
      const isValidTopLevelPayload = Array.isArray(popularAssetsResponse);

      if (isValidTopLevelPayload) {
        // Cache only valid top-level API payloads so malformed responses do
        // not suppress retries for the full cache TTL.
        popularTokensCache.set(cacheKey, {
          data: popularAssetsResponse,
          timestamp: Date.now(),
        });
        return popularAssetsResponse;
      }

      return parsedIncludeAssets;
    } catch (error) {
      // Ignore abort errors - request was intentionally cancelled
      if (error instanceof Error && error.name === 'AbortError') {
        return parsedIncludeAssets;
      }
      console.error('Error fetching popular tokens:', error);
      return parsedIncludeAssets;
    }
  }, [parsedIncludeAssets, includeAssets, chainIdsToFetch, bearerToken]);

  // Prefetch popular tokens
  useEffect(() => {
    if (isBasicFunctionalityEnabled) {
      fetchPopularTokens();
    }
  }, [fetchPopularTokens, isBasicFunctionalityEnabled]);

  return {
    includeAssets,
    includeAssetsJson: parsedIncludeAssets,
    fetchPopularTokens,
    balancesByAssetId,
    tokensWithBalance,
  };
};

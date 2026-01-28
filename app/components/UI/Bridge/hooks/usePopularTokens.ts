import { useState, useEffect } from 'react';
import { CaipChainId, CaipAssetType } from '@metamask/utils';
import { BRIDGE_API_BASE_URL } from '../../../../constants/bridge';
import { TokenRwaData } from '@metamask/assets-controllers';

export interface PopularToken {
  assetId: CaipAssetType;
  chainId: CaipChainId;
  decimals: number;
  image: string;
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

interface UsePopularTokensParams {
  chainIds: CaipChainId[];
  includeAssets: string; // Stringified array to prevent unnecessary re-renders
}

interface UsePopularTokensResult {
  popularTokens: PopularToken[];
  isLoading: boolean;
}

interface CacheEntry {
  data: PopularToken[];
  timestamp: number;
}

// Cache for popular tokens with 15-minute TTL
const popularTokensCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes in milliseconds

// Cleanup throttling - runs at most once every 5 minutes
let lastCleanupTime = 0;
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Clears the popular tokens cache. Exposed for testing purposes.
 * @internal
 */
export const clearPopularTokensCache = (): void => {
  popularTokensCache.clear();
  lastCleanupTime = 0;
};

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
export const usePopularTokens = ({
  chainIds,
  includeAssets,
}: UsePopularTokensParams): UsePopularTokensResult => {
  const [popularTokens, setPopularTokens] = useState<PopularToken[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const abortController = new AbortController();
    let isCancelled = false;

    const fetchPopularTokens = async () => {
      // Cleanup expired entries before checking cache
      cleanupExpiredEntries();

      const cacheKey = getCacheKey(chainIds, includeAssets);
      const cachedEntry = popularTokensCache.get(cacheKey);

      // Check if we have a valid cached response
      if (cachedEntry && isCacheValid(cachedEntry)) {
        setPopularTokens(cachedEntry.data);
        setIsLoading(false);
        return;
      }

      if (!isCancelled) {
        setIsLoading(true);
      }

      try {
        const parsedIncludeAssets: IncludeAsset[] = JSON.parse(includeAssets);

        const response = await fetch(
          `${BRIDGE_API_BASE_URL}/getTokens/popular`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              chainIds,
              includeAssets: parsedIncludeAssets,
            }),
            signal: abortController.signal,
          },
        );
        const popularAssets: PopularToken[] = await response.json();

        // Store in cache with current timestamp
        popularTokensCache.set(cacheKey, {
          data: popularAssets,
          timestamp: Date.now(),
        });

        if (!isCancelled) {
          setPopularTokens(popularAssets);
        }
      } catch (error) {
        // Ignore abort errors - request was intentionally cancelled
        if (error instanceof Error && error.name === 'AbortError') {
          return;
        }
        console.error('Error fetching popular tokens:', error);
        if (!isCancelled) {
          setPopularTokens([]);
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchPopularTokens();

    // Cleanup function: abort fetch and mark as cancelled when deps change
    return () => {
      isCancelled = true;
      abortController.abort();
    };
  }, [chainIds, includeAssets]);

  return { popularTokens, isLoading };
};

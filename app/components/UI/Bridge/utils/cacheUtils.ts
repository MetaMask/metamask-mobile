import type { CaipChainId } from '@metamask/utils';
import type { IncludeAsset, PopularToken } from '../types';

export const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes in milliseconds
export const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

export interface CacheEntry {
  data: PopularToken[];
  timestamp: number;
}

/**
 * Cache for popular tokens with 15-minute TTL.
 */
export const popularTokensCache = new Map<string, CacheEntry>();
/**
 * Timestamp of the last cleanup of the popular tokens cache.
 */
let lastCleanupTime = 0;

/**
 * Checks if a cache entry is still valid
 */
export const isCacheValid = (entry: CacheEntry): boolean => {
  const now = Date.now();
  return now - entry.timestamp < CACHE_TTL_MS;
};

/**
 * Generates a string of asset IDs from an array of include assets
 * Only assetIds are used to prevent unnecessary re-renders or fetches when the
 * balance or fiat value changes.
 */
export const getMinimalIncludedAssets = (
  includeAssets: IncludeAsset[],
): string =>
  includeAssets.map(({ assetId }) => assetId.toLowerCase()).join(',');

/**
 * Generates a cache key from request parameters
 */
export const getCacheKey = (
  chainIds: CaipChainId[],
  includeAssets: IncludeAsset[],
): string => {
  // Alphabetical sort is correct for string chain IDs (e.g., 'eip155:1')
  // Explicit compare function is required for SonarQube analysis
  const sortedChainIds = [...chainIds].sort((a, b) => (a > b ? 1 : -1));
  return `${sortedChainIds.join(',')}_${getMinimalIncludedAssets(includeAssets)}`;
};

/**
 * Removes expired entries from the cache (throttled to once every 5 minutes).
 * With a 15-minute TTL, this ensures stale entries are cleaned up 3 times per
 * cache lifetime while minimizing unnecessary iterations.
 */
export const cleanupExpiredEntries = (): void => {
  const now = Date.now();

  // Skip if cleaned up within the last 5 minutes
  if (now - lastCleanupTime < CLEANUP_INTERVAL_MS) {
    return;
  }

  lastCleanupTime = now;

  for (const [key, entry] of popularTokensCache) {
    if (now - entry.timestamp >= CACHE_TTL_MS) {
      popularTokensCache.delete(key);
    }
  }
};
/**
 * Adds a new entry or updates an existing entry in the popular tokens cache.
 */
export const setPopularTokensCache = (payload: {
  includeAssets: IncludeAsset[];
  chainIds: CaipChainId[];
  popularTokens: PopularToken[];
}) => {
  popularTokensCache.set(getCacheKey(payload.chainIds, payload.includeAssets), {
    data: payload.popularTokens,
    timestamp: Date.now(),
  });
};

import type { CaipChainId } from '@metamask/utils';
import type { IncludeAsset, PopularToken } from '../types';

export const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes in milliseconds
export const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

export interface CacheEntry {
  data: PopularToken[];
  timestamp: number;
}

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

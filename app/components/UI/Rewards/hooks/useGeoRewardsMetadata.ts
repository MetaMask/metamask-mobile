/**
 * Custom hook to fetch geo rewards metadata including location and support status
 */

import { useCallback, useEffect, useState } from 'react';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';
import type { GeoRewardsMetadata } from '../../../../core/Engine/controllers/rewards-controller/types';

// 24 hours in milliseconds
const DEFAULT_CACHE_DURATION = 24 * 60 * 60 * 1000;

export interface UseGeoRewardsMetadataResult {
  /**
   * Geo rewards metadata containing location and support status
   */
  geoRewardsMetadata: GeoRewardsMetadata | null;

  /**
   * Loading state for initial data fetch
   */
  isLoading: boolean;

  /**
   * Error state with error object
   */
  error: Error | null;
}

export interface UseGeoRewardsMetadataOptions {
  /**
   * Cache duration in milliseconds
   * @default 86400000 (24 hours)
   */
  cacheDuration?: number;
}

export const useGeoRewardsMetadata = (
  options: UseGeoRewardsMetadataOptions = {},
): UseGeoRewardsMetadataResult => {
  const { cacheDuration = DEFAULT_CACHE_DURATION } = options;

  const [geoRewardsMetadata, setGeoRewardsMetadata] =
    useState<GeoRewardsMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);

  // Check if current data is still valid (within cache duration)
  const isCacheValid = useCallback(() => {
    if (!geoRewardsMetadata) return false;
    return Date.now() - lastFetchTime < cacheDuration;
  }, [geoRewardsMetadata, lastFetchTime, cacheDuration]);

  const fetchGeoRewardsMetadata = useCallback(
    async (isRefresh = false): Promise<void> => {
      // Skip fetch if cache is still valid and not a manual refresh
      if (!isRefresh && isCacheValid()) {
        DevLogger.log('Rewards: Using cached geo rewards metadata', {
          metadata: geoRewardsMetadata,
          cacheAge: lastFetchTime ? Date.now() - lastFetchTime : 0,
        });
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        DevLogger.log('Rewards: Fetching geo rewards metadata...');

        const metadata = await Engine.controllerMessenger.call(
          'RewardsController:getGeoRewardsMetadata',
        );

        setGeoRewardsMetadata(metadata);
        setLastFetchTime(Date.now());

        DevLogger.log('Rewards: Successfully fetched geo rewards metadata', {
          metadata,
          timestamp: new Date().toISOString(),
        });
        Logger.log('Rewards: Successfully fetched geo rewards metadata', {
          metadata,
          timestamp: new Date().toISOString(),
        });
      } catch (err) {
        const errorObj =
          err instanceof Error ? err : new Error('Unknown error occurred');
        setError(errorObj);
        DevLogger.log('Rewards: Failed to fetch geo rewards metadata', err);

        // Keep existing data on error to prevent UI flash
        setGeoRewardsMetadata((currentMetadata) => currentMetadata);
      } finally {
        setIsLoading(false);
      }
    },
    [geoRewardsMetadata, lastFetchTime, isCacheValid],
  );

  // Initial data fetch
  useEffect(() => {
    fetchGeoRewardsMetadata();
  }, [fetchGeoRewardsMetadata]);

  return {
    geoRewardsMetadata,
    isLoading,
    error,
  };
};

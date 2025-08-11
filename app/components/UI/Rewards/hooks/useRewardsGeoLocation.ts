/**
 * Custom hook to fetch geolocation of the user with 24-hour caching
 */

import { useCallback, useEffect, useState } from 'react';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';

export const DEFAULT_BLOCKED_REGIONS = ['UK'];

// 24 hours in milliseconds
const DEFAULT_CACHE_DURATION = 24 * 60 * 60 * 1000;

export interface UseRewardsGeoLocationResult {
  /**
   * Current geolocation string (e.g., 'US', 'CA-ON', 'FR')
   */
  geoLocation: string | null;
  /**
   * Loading state for initial data fetch
   */
  isLoading: boolean;
  /**
   * Error state with error object
   */
  error: Error | null;
  /**
   * Refresh function to manually refetch geolocation
   */
  refresh: () => Promise<void>;
  /**
   * Indicates if data is being refreshed
   */
  isRefreshing: boolean;
  /**
   * Timestamp of last successful fetch
   */
  lastFetchTime: number | null;
}

export interface UseRewardsGeoLocationOptions {
  /**
   * Cache duration in milliseconds
   * @default 86400000 (24 hours)
   */
  cacheDuration?: number;
  /**
   * Skip initial data fetch on mount
   * @default false
   */
  skipInitialFetch?: boolean;
}

export const useRewardsGeoLocation = (
  options: UseRewardsGeoLocationOptions = {},
): UseRewardsGeoLocationResult => {
  const { cacheDuration = DEFAULT_CACHE_DURATION, skipInitialFetch = false } =
    options;

  const [geoLocation, setGeoLocation] = useState<string>('UNKNOWN');
  const [isLoading, setIsLoading] = useState(!skipInitialFetch);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState<number | null>(null);

  // Check if current data is still valid (within cache duration)
  const isCacheValid = useCallback(() => {
    if (!lastFetchTime || !geoLocation) return false;
    return Date.now() - lastFetchTime < cacheDuration;
  }, [lastFetchTime, geoLocation, cacheDuration]);

  const fetchGeoLocation = useCallback(
    async (isRefresh = false): Promise<void> => {
      // Skip fetch if cache is still valid and not a manual refresh
      if (!isRefresh && isCacheValid()) {
        DevLogger.log('Rewards: Using cached geolocation data', {
          location: geoLocation,
          cacheAge: lastFetchTime ? Date.now() - lastFetchTime : 0,
        });
        setIsLoading(false);
        return;
      }

      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      try {
        DevLogger.log('Rewards: Fetching geolocation data...');

        const location = await Engine.controllerMessenger.call(
          'RewardsDataService:fetchGeoLocation',
        );

        setGeoLocation(location);
        setLastFetchTime(Date.now());

        DevLogger.log('Rewards: Successfully fetched geolocation data', {
          location,
          timestamp: new Date().toISOString(),
        });
        Logger.log('Rewards: Successfully fetched geolocation data', {
          location,
          timestamp: new Date().toISOString(),
        });
      } catch (err) {
        const errorObj =
          err instanceof Error ? err : new Error('Unknown error occurred');
        setError(errorObj);
        DevLogger.log('Rewards: Failed to fetch geolocation data', err);

        // Keep existing data on error to prevent UI flash
        setGeoLocation((currentLocation) => currentLocation);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [geoLocation, lastFetchTime, isCacheValid],
  );

  const refresh = useCallback(
    (): Promise<void> => fetchGeoLocation(true),
    [fetchGeoLocation],
  );

  // Initial data fetch
  useEffect(() => {
    if (!skipInitialFetch) {
      fetchGeoLocation();
    }
  }, [fetchGeoLocation, skipInitialFetch]);

  return {
    geoLocation,
    isLoading,
    error,
    refresh,
    isRefreshing,
    lastFetchTime,
  };
};

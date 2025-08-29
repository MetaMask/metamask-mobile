import { useState, useEffect, useCallback } from 'react';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';
import Engine from '../../../../core/Engine';
import type { SeasonStatusDto } from '../../../../core/Engine/controllers/rewards-controller/types';

export interface UseSeasonStatusResult {
  /**
   * Season status data ready for UI consumption
   */
  seasonStatus: SeasonStatusDto | null;
  /**
   * Loading state for initial data fetch
   */
  isLoading: boolean;
  /**
   * Error state with error message
   */
  error: string | null;
  /**
   * Refresh function to manually refetch data
   */
  refresh: () => Promise<void>;
  /**
   * Indicates if data is being refreshed
   */
  isRefreshing: boolean;
}

export interface UseSeasonStatusOptions {
  /**
   * Enable automatic polling for live updates
   * @default false
   */
  enablePolling?: boolean;
  /**
   * Polling interval in milliseconds
   * @default 300000 (5 minutes)
   */
  pollingInterval?: number;
  /**
   * Skip initial data fetch on mount
   * @default false
   */
  skipInitialFetch?: boolean;
  /**
   * Season ID to fetch status for
   * If not provided, will not fetch data
   */
  seasonId?: string;
  /**
   * Subscription ID for authentication
   * If not provided, will not fetch data
   */
  subscriptionId?: string;
}

/**
 * Custom hook to fetch and manage season status data from the rewards API
 * Uses the RewardsController to get data from the rewards data service
 */
export const useSeasonStatus = (
  options: UseSeasonStatusOptions = {},
): UseSeasonStatusResult => {
  const {
    enablePolling = false,
    pollingInterval = 300000, // 5 minutes default (less frequent than perps)
    skipInitialFetch = false,
    seasonId,
    subscriptionId,
  } = options;

  const [seasonStatus, setSeasonStatus] = useState<SeasonStatusDto | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(
    !skipInitialFetch && !!seasonId && !!subscriptionId,
  );
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSeasonStatus = useCallback(
    async (isRefresh = false): Promise<void> => {
      // Don't fetch if required parameters are missing
      if (!seasonId || !subscriptionId) {
        setSeasonStatus(null);
        setIsLoading(false);
        setIsRefreshing(false);
        if (!seasonId) {
          setError('Season ID is required');
        } else if (!subscriptionId) {
          setError('Subscription ID is required');
        }
        return;
      }

      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      try {
        DevLogger.log('Rewards: Fetching season status data...', {
          seasonId,
          subscriptionId: subscriptionId.substring(0, 8) + '...',
        });

        const statusData = await Engine.controllerMessenger.call(
          'RewardsDataService:getSeasonStatus',
          seasonId,
          subscriptionId,
        );

        setSeasonStatus(statusData);

        DevLogger.log('Rewards: Successfully fetched season status data', {
          seasonName: statusData.season.name,
          balance: statusData.balance.total,
          currentTier: statusData.currentTierId,
        });
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Unknown error occurred';
        setError(errorMessage);
        DevLogger.log('Rewards: Failed to fetch season status data', err);

        // Keep existing data on error to prevent UI flash
        setSeasonStatus((currentStatus) => {
          if (!currentStatus) {
            return null;
          }
          return currentStatus;
        });
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [seasonId, subscriptionId],
  );

  const refresh = useCallback(
    (): Promise<void> => fetchSeasonStatus(true),
    [fetchSeasonStatus],
  );

  // Initial data fetch
  useEffect(() => {
    if (!skipInitialFetch && seasonId && subscriptionId) {
      fetchSeasonStatus();
    }
  }, [fetchSeasonStatus, skipInitialFetch, seasonId, subscriptionId]);

  // Polling effect
  useEffect(() => {
    if (!enablePolling || !seasonId || !subscriptionId) return;

    const intervalId = setInterval(() => {
      fetchSeasonStatus(true);
    }, pollingInterval);

    return () => clearInterval(intervalId);
  }, [
    enablePolling,
    pollingInterval,
    fetchSeasonStatus,
    seasonId,
    subscriptionId,
  ]);

  return {
    seasonStatus,
    isLoading,
    error,
    refresh,
    isRefreshing,
  };
};

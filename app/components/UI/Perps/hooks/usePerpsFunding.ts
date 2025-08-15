import { useState, useEffect, useCallback } from 'react';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';
import Engine from '../../../../core/Engine';
import type { Funding, GetFundingParams } from '../controllers/types';

export interface UsePerpsFundingResult {
  /**
   * Array of funding data from the controller
   */
  funding: Funding[];
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

export interface UsePerpsFundingOptions {
  /**
   * Parameters to pass to getFunding
   */
  params?: GetFundingParams;
  /**
   * Enable automatic polling for live updates
   * @default false
   */
  enablePolling?: boolean;
  /**
   * Polling interval in milliseconds
   * @default 60000 (60 seconds)
   */
  pollingInterval?: number;
  /**
   * Skip initial data fetch on mount
   * @default false
   */
  skipInitialFetch?: boolean;
}

/**
 * Custom hook to fetch and manage Perps funding data from the controller
 * Provides loading states, error handling, and refresh functionality
 */
export const usePerpsFunding = (
  options: UsePerpsFundingOptions = {},
): UsePerpsFundingResult => {
  const {
    params,
    enablePolling = false,
    pollingInterval = 60000, // 60 seconds default
    skipInitialFetch = false,
  } = options;

  const [funding, setFunding] = useState<Funding[]>([]);
  const [isLoading, setIsLoading] = useState(!skipInitialFetch);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFunding = useCallback(
    async (isRefresh = false): Promise<void> => {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      try {
        DevLogger.log('Perps: Fetching funding data from controller...');

        const controller = Engine.context.PerpsController;
        const fundingData = await controller.getFunding(params);

        setFunding(fundingData || []);

        DevLogger.log('Perps: Successfully fetched funding data', {
          fundingCount: fundingData?.length || 0,
        });
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Unknown error occurred';
        setError(errorMessage);
        DevLogger.log('Perps: Failed to fetch funding data', err);

        // Keep existing data on error to prevent UI flash
        if (!isRefresh) {
          setFunding([]);
        }
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [params],
  );

  const refresh = useCallback(
    (): Promise<void> => fetchFunding(true),
    [fetchFunding],
  );

  // Initial data fetch
  useEffect(() => {
    if (!skipInitialFetch) {
      fetchFunding();
    }
  }, [fetchFunding, skipInitialFetch]);

  // Polling effect
  useEffect(() => {
    if (!enablePolling) return;

    const intervalId = setInterval(() => {
      fetchFunding(true);
    }, pollingInterval);

    return () => clearInterval(intervalId);
  }, [enablePolling, pollingInterval, fetchFunding]);

  return {
    funding,
    isLoading,
    error,
    refresh,
    isRefreshing,
  };
};

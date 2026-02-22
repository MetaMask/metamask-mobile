import { useState, useEffect, useCallback } from 'react';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';
import Engine from '../../../../core/Engine';
import type { OrderFill, GetOrderFillsParams } from '../controllers/types';

export interface UsePerpsOrderFillsResult {
  /**
   * Array of order fills from the controller
   */
  orderFills: OrderFill[];
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

export interface UsePerpsOrderFillsOptions {
  /**
   * Parameters to pass to getOrderFills
   */
  params?: GetOrderFillsParams;
  /**
   * Enable automatic polling for live updates
   * @default false
   */
  enablePolling?: boolean;
  /**
   * Polling interval in milliseconds
   * @default 30000 (30 seconds)
   */
  pollingInterval?: number;
  /**
   * Skip initial data fetch on mount
   * @default false
   */
  skipInitialFetch?: boolean;
}

/**
 * Custom hook to fetch and manage Perps order fills from the controller
 * Provides loading states, error handling, and refresh functionality
 */
export const usePerpsOrderFills = (
  options: UsePerpsOrderFillsOptions = {},
): UsePerpsOrderFillsResult => {
  const {
    params,
    enablePolling = false,
    pollingInterval = 30000, // 30 seconds default
    skipInitialFetch = false,
  } = options;

  const [orderFills, setOrderFills] = useState<OrderFill[]>([]);
  const [isLoading, setIsLoading] = useState(!skipInitialFetch);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOrderFills = useCallback(
    async (isRefresh = false): Promise<void> => {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      try {
        DevLogger.log('Perps: Fetching order fills from controller...');

        const controller = Engine.context.PerpsController;
        const fills = await controller.getOrderFills(params);

        setOrderFills(fills || []);

        DevLogger.log('Perps: Successfully fetched order fills', {
          fillCount: fills?.length || 0,
        });
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Unknown error occurred';
        setError(errorMessage);
        DevLogger.log('Perps: Failed to fetch order fills', err);

        // Keep existing data on error to prevent UI flash
        if (!isRefresh) {
          setOrderFills([]);
        }
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [params],
  );

  const refresh = useCallback(
    (): Promise<void> => fetchOrderFills(true),
    [fetchOrderFills],
  );

  // Initial data fetch
  useEffect(() => {
    if (!skipInitialFetch) {
      fetchOrderFills();
    }
  }, [fetchOrderFills, skipInitialFetch]);

  // Polling effect
  useEffect(() => {
    if (!enablePolling) return;

    const intervalId = setInterval(() => {
      fetchOrderFills(true);
    }, pollingInterval);

    return () => clearInterval(intervalId);
  }, [enablePolling, pollingInterval, fetchOrderFills]);

  return {
    orderFills,
    isLoading,
    error,
    refresh,
    isRefreshing,
  };
};

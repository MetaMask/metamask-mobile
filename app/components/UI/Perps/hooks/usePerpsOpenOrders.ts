import { useState, useEffect, useCallback } from 'react';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';
import Engine from '../../../../core/Engine';
import type { Order, GetOrdersParams } from '../controllers/types';

export interface UsePerpsOpenOrdersResult {
  /**
   * Array of currently open orders from the controller
   */
  orders: Order[];
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

export interface UsePerpsOpenOrdersOptions {
  /**
   * Parameters to pass to getOpenOrders
   */
  params?: GetOrdersParams;
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
 * Custom hook to fetch and manage currently open Perps orders from the controller
 * Uses getOpenOrders() which returns real-time open order status (not historical)
 * Provides loading states, error handling, and refresh functionality
 */
export const usePerpsOpenOrders = (
  options: UsePerpsOpenOrdersOptions = {},
): UsePerpsOpenOrdersResult => {
  const {
    params,
    enablePolling = false,
    pollingInterval = 30000, // 30 seconds default
    skipInitialFetch = false,
  } = options;

  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(!skipInitialFetch);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOpenOrders = useCallback(
    async (isRefresh = false): Promise<void> => {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      try {
        DevLogger.log('Perps: Fetching open orders from controller...');

        const controller = Engine.context.PerpsController;
        const ordersData = await controller.getOpenOrders(params);

        setOrders(ordersData || []);

        DevLogger.log('Perps: Successfully fetched open orders', {
          orderCount: ordersData?.length || 0,
        });
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Unknown error occurred';
        setError(errorMessage);
        DevLogger.log('Perps: Failed to fetch open orders', err);

        // Keep existing data on error to prevent UI flash
        if (!isRefresh) {
          setOrders([]);
        }
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [params],
  );

  const refresh = useCallback(
    (): Promise<void> => fetchOpenOrders(true),
    [fetchOpenOrders],
  );

  // Initial data fetch
  useEffect(() => {
    if (!skipInitialFetch) {
      fetchOpenOrders();
    }
  }, [fetchOpenOrders, skipInitialFetch]);

  // Polling effect
  useEffect(() => {
    if (!enablePolling) return;

    const intervalId = setInterval(() => {
      fetchOpenOrders(true);
    }, pollingInterval);

    return () => clearInterval(intervalId);
  }, [enablePolling, pollingInterval, fetchOpenOrders]);

  return {
    orders,
    isLoading,
    error,
    refresh,
    isRefreshing,
  };
};
import { useCallback, useEffect, useState } from 'react';
import type { TwapOrder } from '@metamask/perps-controller';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';
import Engine from '../../../../core/Engine';

export interface UsePerpsTwapOrdersResult {
  /** Current and terminal TWAP schedules, newest first. */
  twapOrders: TwapOrder[];
  /** Loading state for the initial fetch. */
  isLoading: boolean;
  /** Error message from the last failed fetch. */
  error: string | null;
  /** Manually refetch, for pull-to-refresh. */
  refresh: () => Promise<void>;
  /** Whether a refresh is currently in flight. */
  isRefreshing: boolean;
}

export interface UsePerpsTwapOrdersOptions {
  /**
   * Poll for updates. TWAP has no push channel, so the active view opts in
   * while the history views refresh on focus only.
   *
   * @default false
   */
  enablePolling?: boolean;
  /**
   * Poll interval in milliseconds. Each tick is two venue REST calls
   * (`twapHistory` + `userTwapSliceFills`), so this is deliberately slower
   * than the 1s cadence the streamed positions and orders panels use.
   *
   * @default 5000
   */
  pollingInterval?: number;
  /** Skip the fetch on mount. @default false */
  skipInitialFetch?: boolean;
}

/**
 * Read venue-backed TWAP lifecycle records through the controller.
 *
 * `getTwapOrders()` returns current *and* terminal schedules with their slice
 * fills in one call, so the Active, History, and Fill History views all derive
 * from this single source. Providers without native TWAP history return an
 * empty list rather than throwing, so an empty result is a normal state.
 */
export const usePerpsTwapOrders = (
  options: UsePerpsTwapOrdersOptions = {},
): UsePerpsTwapOrdersResult => {
  const {
    enablePolling = false,
    pollingInterval = 5000,
    skipInitialFetch = false,
  } = options;

  const [twapOrders, setTwapOrders] = useState<TwapOrder[]>([]);
  const [isLoading, setIsLoading] = useState(!skipInitialFetch);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTwapOrders = useCallback(
    async (isRefresh = false): Promise<void> => {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      try {
        const orders = await Engine.context.PerpsController.getTwapOrders();

        setTwapOrders(orders || []);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Unknown error occurred';
        setError(errorMessage);
        DevLogger.log('Perps: Failed to fetch TWAP orders', err);

        // Keep the last good list on a failed poll so the card does not flash.
        if (!isRefresh) {
          setTwapOrders([]);
        }
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [],
  );

  const refresh = useCallback(
    (): Promise<void> => fetchTwapOrders(true),
    [fetchTwapOrders],
  );

  useEffect(() => {
    if (!skipInitialFetch) {
      fetchTwapOrders();
    }
  }, [fetchTwapOrders, skipInitialFetch]);

  useEffect(() => {
    if (!enablePolling) {
      return undefined;
    }

    const intervalId = setInterval(() => {
      fetchTwapOrders(true);
    }, pollingInterval);

    return () => clearInterval(intervalId);
  }, [enablePolling, pollingInterval, fetchTwapOrders]);

  return { twapOrders, isLoading, error, refresh, isRefreshing };
};

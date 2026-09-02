import { useCallback, useEffect, useState } from 'react';
import type { TwapOrder } from '@metamask/perps-controller';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';
import Engine from '../../../../core/Engine';

/**
 * `PerpsController.subscribeToTwapOrders` ships in a controller release after
 * the one currently pinned here, so it is described locally as optional. Drop
 * this shim once the dependency is upgraded and call the method directly.
 *
 * @see https://github.com/MetaMask/core/pull/10056
 */
type SubscribeToTwapOrders = (params: {
  callback: (twapOrders: TwapOrder[], isSnapshot?: boolean) => void;
}) => () => void;

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
   * Keep the list current. Prefers the controller's TWAP subscription and
   * falls back to polling when the active provider has no push channel.
   *
   * @default false
   */
  enablePolling?: boolean;
  /**
   * Poll interval in milliseconds, used only on the fallback path. Each tick
   * is two venue REST calls (`twapHistory` + `userTwapSliceFills`), so this is
   * deliberately slower than the 1s cadence the streamed panels use.
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
 *
 * Live updates prefer `subscribeToTwapOrders`. The venue streams schedule
 * state without slice fills, so a pushed schedule keeps the fills the last
 * read supplied rather than blanking Fill History between refreshes.
 * Providers without a push channel return a no-op cleanup, and the polling
 * fallback takes over.
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

    let isStreaming = false;
    // `subscribeToTwapOrders` lands in a later controller release than the one
    // this app pins, so detect it rather than requiring the upgrade to ship
    // first. Until then the poll below is the only path; once the controller
    // upgrade lands this starts streaming with no further change here.
    const subscribeToTwapOrders: SubscribeToTwapOrders | undefined =
      Reflect.get(
        Engine.context.PerpsController,
        'subscribeToTwapOrders',
      )?.bind(Engine.context.PerpsController);
    const unsubscribe = subscribeToTwapOrders?.({
      callback: (streamedOrders) => {
        isStreaming = true;
        // The stream omits slice fills, so carry forward the ones the last
        // read resolved for each schedule.
        setTwapOrders((previousOrders) => {
          const fillsByOrderId = new Map(
            previousOrders.map((order) => [order.orderId, order.fills]),
          );
          return streamedOrders.map((order) =>
            order.fills.length > 0
              ? order
              : { ...order, fills: fillsByOrderId.get(order.orderId) ?? [] },
          );
        });
        setIsLoading(false);
      },
    });

    // A provider without a push channel returns a no-op cleanup and never
    // calls back, so poll until the first streamed update proves otherwise.
    // Read once up front: waiting a full interval would leave the list and the
    // tab count on their mount-time snapshot, so a TWAP placed from another
    // tab stays invisible for seconds after switching here.
    if (!subscribeToTwapOrders) {
      fetchTwapOrders(true);
    }

    const intervalId = setInterval(() => {
      if (!isStreaming) {
        fetchTwapOrders(true);
      }
    }, pollingInterval);

    return () => {
      unsubscribe?.();
      clearInterval(intervalId);
    };
  }, [enablePolling, pollingInterval, fetchTwapOrders]);

  return { twapOrders, isLoading, error, refresh, isRefreshing };
};

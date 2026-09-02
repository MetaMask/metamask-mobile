import { useCallback, useEffect, useRef, useState } from 'react';
import type { TwapOrder } from '@metamask/perps-controller';
import { useSelector } from 'react-redux';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';
import Engine from '../../../../core/Engine';
import { selectPerpsSelectedAccountAddress } from '../selectors/selectedAccountAddress';
import {
  selectPerpsNetwork,
  selectPerpsProvider,
} from '../selectors/perpsController';

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

  const selectedAddress = useSelector(selectPerpsSelectedAccountAddress);
  const provider = useSelector(selectPerpsProvider);
  const network = useSelector(selectPerpsNetwork);
  const identityKey = `${selectedAddress ?? 'none'}|${provider}|${network}`;

  const [twapOrders, setTwapOrders] = useState<TwapOrder[]>([]);
  const [isLoading, setIsLoading] = useState(!skipInitialFetch);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resolvedIdentityKey, setResolvedIdentityKey] = useState(identityKey);
  const lifecycleGenerationRef = useRef(0);
  const requestGenerationRef = useRef(0);

  useEffect(() => {
    const lifecycleGeneration = ++lifecycleGenerationRef.current;
    requestGenerationRef.current += 1;
    setTwapOrders([]);
    setResolvedIdentityKey(identityKey);
    setIsLoading(!skipInitialFetch);
    setIsRefreshing(false);
    setError(null);

    return () => {
      if (lifecycleGenerationRef.current === lifecycleGeneration) {
        lifecycleGenerationRef.current += 1;
      }
      requestGenerationRef.current += 1;
    };
  }, [identityKey, skipInitialFetch]);

  const fetchTwapOrders = useCallback(
    async (isRefresh = false): Promise<void> => {
      const lifecycleGeneration = lifecycleGenerationRef.current;
      const requestGeneration = ++requestGenerationRef.current;
      const isCurrentRequest = () =>
        lifecycleGenerationRef.current === lifecycleGeneration &&
        requestGenerationRef.current === requestGeneration;

      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      try {
        const orders = await Engine.context.PerpsController.getTwapOrders();

        if (!isCurrentRequest()) {
          return;
        }
        setTwapOrders(orders || []);
        setResolvedIdentityKey(identityKey);
      } catch (err) {
        if (!isCurrentRequest()) {
          return;
        }
        const errorMessage =
          err instanceof Error ? err.message : 'Unknown error occurred';
        setError(errorMessage);
        DevLogger.log('Perps: Failed to fetch TWAP orders', err);
      } finally {
        if (isCurrentRequest()) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    },
    [identityKey],
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

    const lifecycleGeneration = lifecycleGenerationRef.current;

    // Refresh immediately when the TWAP tab becomes active. The subscription
    // supplies schedule deltas, while this read supplies slice fills and the
    // aggregated provider view.
    fetchTwapOrders(true);

    const unsubscribe = Engine.context.PerpsController.subscribeToTwapOrders({
      callback: (streamedOrders) => {
        if (lifecycleGenerationRef.current !== lifecycleGeneration) {
          return;
        }
        // A stream commit is newer than reads already in flight.
        requestGenerationRef.current += 1;
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
        setResolvedIdentityKey(identityKey);
        setError(null);
        setIsLoading(false);
        setIsRefreshing(false);
      },
    });

    // The venue's TWAP schedule stream does not contain slice-fill updates.
    // Keep this bounded REST refresh even after streaming starts so Fill
    // History and executed-size details cannot freeze.
    const intervalId = setInterval(() => {
      fetchTwapOrders(true);
    }, pollingInterval);

    return () => {
      unsubscribe();
      clearInterval(intervalId);
    };
  }, [enablePolling, pollingInterval, fetchTwapOrders, identityKey]);

  const isCurrentIdentity = resolvedIdentityKey === identityKey;

  return {
    twapOrders: isCurrentIdentity ? twapOrders : [],
    isLoading: !isCurrentIdentity || isLoading,
    error: isCurrentIdentity ? error : null,
    refresh,
    isRefreshing: isCurrentIdentity && isRefreshing,
  };
};

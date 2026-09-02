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
import {
  PERPS_TWAP_UI_CONFIG,
  PROVIDER_CONFIG,
} from '../constants/perpsConfig';
import {
  getTwapOrderIdentityKey,
  getTwapOrderProviderId,
} from '../utils/twapOrderUtils';

const PARTIAL_TWAP_SNAPSHOT_ERROR =
  'Unable to confirm active TWAP schedules for every provider';

const sortTwapOrdersByStartedAt = (orders: TwapOrder[]): TwapOrder[] =>
  [...orders].sort((left, right) => right.startedAt - left.startedAt);

const reconcileTwapOrderSnapshot = (
  previousOrders: TwapOrder[],
  snapshotOrders: TwapOrder[],
): { orders: TwapOrder[]; unconfirmedProviderIds: Set<string> } => {
  const snapshotProviderIds = new Set(
    snapshotOrders.map(getTwapOrderProviderId),
  );
  const unconfirmedProviderIds = new Set(
    previousOrders
      .filter(
        (order) =>
          order.status === 'active' &&
          !snapshotProviderIds.has(getTwapOrderProviderId(order)),
      )
      .map(getTwapOrderProviderId),
  );
  const ordersByIdentity = new Map(
    snapshotOrders.map((order) => [getTwapOrderIdentityKey(order), order]),
  );

  // A provider read is one all-or-nothing partition in the aggregated
  // controller. If that partition disappears while one of its schedules was
  // active, retain the complete prior partition: its terminal rows and fills
  // are no less authoritative than the active termination surface. The
  // provider-qualified key also guards against duplicate venue-local IDs.
  for (const order of previousOrders) {
    if (unconfirmedProviderIds.has(getTwapOrderProviderId(order))) {
      const identityKey = getTwapOrderIdentityKey(order);
      if (!ordersByIdentity.has(identityKey)) {
        ordersByIdentity.set(identityKey, order);
      }
    }
  }

  return {
    orders: sortTwapOrdersByStartedAt([...ordersByIdentity.values()]),
    unconfirmedProviderIds,
  };
};

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
   * Keep the list current through the controller's TWAP subscription plus
   * bounded REST reconciliation for slice fills omitted by stream updates.
   *
   * @default false
   */
  enableLiveUpdates?: boolean;
  /**
   * REST reconciliation interval in milliseconds. Each tick is two venue
   * calls (`twapHistory` + `userTwapSliceFills`), so this is deliberately
   * slower than the 1s cadence the streamed panels use.
   *
   * @default 5000
   */
  pollingInterval?: number;
  /**
   * Pause periodic/immediate live REST reconciliation without stopping the
   * schedule subscription. Explicit refreshes and the initial discovery read
   * remain available.
   *
   * @default false
   */
  pauseLiveRestReconciliation?: boolean;
  /** Skip the fetch on mount. @default false */
  skipInitialFetch?: boolean;
}

/**
 * Read venue-backed TWAP lifecycle records through the controller.
 *
 * `getTwapOrders()` returns current *and* terminal schedules with their slice
 * fills in one call, so the Active, History, and Fill History views all derive
 * from this single source. The aggregated controller silently omits rejected
 * provider partitions and supplies no marker for a provider that successfully
 * returned an empty list. Mobile therefore cannot distinguish a cold-start
 * partial failure from a legitimate empty account. Once an active partition is
 * known, an omitted partition is retained with a retryable error until REST or
 * the default-provider stream confirms its state. The controller must expose
 * per-provider outcomes to close the remaining cold-start ambiguity.
 *
 * `subscribeToTwapOrders` supplies schedule state without slice fills, so a
 * pushed schedule keeps the fills the last REST read supplied rather than
 * blanking Fill History. Bounded REST reconciliation remains active alongside
 * the subscription so fills and aggregate execution details stay current.
 */
export const usePerpsTwapOrders = (
  options: UsePerpsTwapOrdersOptions = {},
): UsePerpsTwapOrdersResult => {
  const {
    enableLiveUpdates = false,
    pollingInterval = PERPS_TWAP_UI_CONFIG.LiveUpdateIntervalMs,
    pauseLiveRestReconciliation = false,
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
  const currentIdentityKeyRef = useRef(identityKey);
  const twapOrdersRef = useRef<TwapOrder[]>([]);
  const readFailureMessageRef = useRef<string | null>(null);
  const unconfirmedProviderIdsRef = useRef(new Set<string>());
  const inFlightFetchRef = useRef<{
    identityKey: string;
    promise: Promise<void>;
  } | null>(null);
  currentIdentityKeyRef.current = identityKey;

  useEffect(() => {
    const lifecycleGeneration = ++lifecycleGenerationRef.current;
    requestGenerationRef.current += 1;
    inFlightFetchRef.current = null;
    twapOrdersRef.current = [];
    readFailureMessageRef.current = null;
    unconfirmedProviderIdsRef.current = new Set();
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
      if (currentIdentityKeyRef.current !== identityKey) {
        return;
      }

      const inFlightFetch = inFlightFetchRef.current;
      if (inFlightFetch?.identityKey === identityKey) {
        await inFlightFetch.promise;
        return;
      }

      const lifecycleGeneration = lifecycleGenerationRef.current;
      const requestGeneration = ++requestGenerationRef.current;
      const isCurrentRequest = () =>
        currentIdentityKeyRef.current === identityKey &&
        lifecycleGenerationRef.current === lifecycleGeneration &&
        requestGenerationRef.current === requestGeneration;

      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      const requestPromise = (async () => {
        try {
          const orders = await Engine.context.PerpsController.getTwapOrders();

          if (!isCurrentRequest()) {
            return;
          }
          const reconciliation =
            provider === PROVIDER_CONFIG.AggregatedProvider
              ? reconcileTwapOrderSnapshot(twapOrdersRef.current, orders || [])
              : {
                  orders: sortTwapOrdersByStartedAt(orders || []),
                  unconfirmedProviderIds: new Set<string>(),
                };
          twapOrdersRef.current = reconciliation.orders;
          readFailureMessageRef.current = null;
          unconfirmedProviderIdsRef.current =
            reconciliation.unconfirmedProviderIds;
          setTwapOrders(reconciliation.orders);
          setResolvedIdentityKey(identityKey);
          setError(
            reconciliation.unconfirmedProviderIds.size > 0
              ? PARTIAL_TWAP_SNAPSHOT_ERROR
              : null,
          );
        } catch (err) {
          if (!isCurrentRequest()) {
            return;
          }
          const errorMessage =
            err instanceof Error ? err.message : 'Unknown error occurred';
          readFailureMessageRef.current = errorMessage;
          setError(errorMessage);
          DevLogger.log('Perps: Failed to fetch TWAP orders', err);
        } finally {
          if (isCurrentRequest()) {
            setIsLoading(false);
            setIsRefreshing(false);
          }
        }
      })();
      const request = { identityKey, promise: requestPromise };
      inFlightFetchRef.current = request;

      try {
        await requestPromise;
      } finally {
        if (inFlightFetchRef.current === request) {
          inFlightFetchRef.current = null;
        }
      }
    },
    [identityKey, provider],
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
    if (!enableLiveUpdates) {
      return undefined;
    }

    const lifecycleGeneration = lifecycleGenerationRef.current;

    const unsubscribe = Engine.context.PerpsController.subscribeToTwapOrders({
      callback: (streamedOrders) => {
        if (
          currentIdentityKeyRef.current !== identityKey ||
          lifecycleGenerationRef.current !== lifecycleGeneration
        ) {
          return;
        }
        // A stream commit is newer than reads already in flight.
        requestGenerationRef.current += 1;
        // Aggregated REST reads span every provider, while this stream comes
        // from the default provider only. Replace that provider's partition,
        // retain every other provider, and carry REST-only fills by the full
        // provider/order identity so venue-local IDs cannot cross-contaminate.
        const mergeStreamedOrders = (previousOrders: TwapOrder[]) => {
          const fillsByOrderKey = new Map(
            previousOrders.map((order) => [
              getTwapOrderIdentityKey(order),
              order.fills,
            ]),
          );
          const mergedStreamedOrders = streamedOrders.map((order) =>
            order.fills.length > 0
              ? order
              : {
                  ...order,
                  fills:
                    fillsByOrderKey.get(getTwapOrderIdentityKey(order)) ?? [],
                },
          );
          const otherProviderOrders = previousOrders.filter(
            (order) =>
              getTwapOrderProviderId(order) !== PROVIDER_CONFIG.DefaultProvider,
          );

          return sortTwapOrdersByStartedAt([
            ...mergedStreamedOrders,
            ...otherProviderOrders,
          ]);
        };
        const mergedOrders = mergeStreamedOrders(twapOrdersRef.current);
        twapOrdersRef.current = mergedOrders;
        setTwapOrders(mergedOrders);
        unconfirmedProviderIdsRef.current.delete(
          PROVIDER_CONFIG.DefaultProvider,
        );
        setError(
          readFailureMessageRef.current ??
            (unconfirmedProviderIdsRef.current.size > 0
              ? PARTIAL_TWAP_SNAPSHOT_ERROR
              : null),
        );
        setResolvedIdentityKey(identityKey);
        setIsLoading(false);
        setIsRefreshing(false);
      },
    });

    return unsubscribe;
  }, [enableLiveUpdates, identityKey]);

  useEffect(() => {
    if (!enableLiveUpdates || pauseLiveRestReconciliation) {
      return undefined;
    }

    // Refresh immediately when live reconciliation starts or resumes. The
    // subscription supplies schedule deltas, while this read supplies slice
    // fills and the aggregated provider view.
    fetchTwapOrders(true);

    // The venue's TWAP schedule stream does not contain slice-fill updates, so
    // keep this bounded REST refresh while reconciliation is not paused.
    const intervalId = setInterval(() => {
      fetchTwapOrders(true);
    }, pollingInterval);

    return () => {
      clearInterval(intervalId);
    };
  }, [
    enableLiveUpdates,
    fetchTwapOrders,
    pauseLiveRestReconciliation,
    pollingInterval,
  ]);

  const isCurrentIdentity = resolvedIdentityKey === identityKey;

  return {
    twapOrders: isCurrentIdentity ? twapOrders : [],
    isLoading: !isCurrentIdentity || isLoading,
    error: isCurrentIdentity ? error : null,
    refresh,
    isRefreshing: isCurrentIdentity && isRefreshing,
  };
};

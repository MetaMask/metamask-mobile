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
import { handlePerpsCufTwapOrdersDelivered } from '../utils/perpsCufTrace';
import { usePerpsMarketContext } from './usePerpsMarketContext';

const PARTIAL_TWAP_SNAPSHOT_ERROR =
  'Unable to confirm active TWAP schedules for every provider';

const sortTwapOrdersByStartedAt = (orders: TwapOrder[]): TwapOrder[] =>
  [...orders].sort((left, right) => right.startedAt - left.startedAt);

const mergeTwapOrder = (
  retainedOrder: TwapOrder | undefined,
  authoritativeOrder: TwapOrder,
): TwapOrder => {
  const fillsByIdentity = new Map(
    (retainedOrder?.fills ?? []).map((fill) => [fill.fillId, fill]),
  );
  for (const fill of authoritativeOrder.fills) {
    fillsByIdentity.set(fill.fillId, fill);
  }

  // Schedule state is versioned by the venue, not by delivery order. Equal
  // versions deliberately prefer the incoming row so authoritative snapshots
  // can refresh fields that do not participate in the version comparison.
  const scheduleOrder =
    !retainedOrder ||
    authoritativeOrder.lastUpdated >= retainedOrder.lastUpdated
      ? authoritativeOrder
      : retainedOrder;

  return {
    ...scheduleOrder,
    fills: [...fillsByIdentity.values()],
  };
};

const mergeTwapOrderSnapshot = (
  previousOrders: TwapOrder[],
  snapshotOrders: TwapOrder[],
): Map<string, TwapOrder> => {
  const previousByIdentity = new Map(
    previousOrders.map((order) => [getTwapOrderIdentityKey(order), order]),
  );
  const ordersByIdentity = new Map<string, TwapOrder>();

  for (const order of snapshotOrders) {
    const identityKey = getTwapOrderIdentityKey(order);
    ordersByIdentity.set(
      identityKey,
      mergeTwapOrder(
        ordersByIdentity.get(identityKey) ??
          previousByIdentity.get(identityKey),
        order,
      ),
    );
  }

  return ordersByIdentity;
};

const reconcileTwapOrderStream = (
  previousOrders: TwapOrder[],
  streamedOrders: TwapOrder[],
  isSnapshot: boolean,
  activeProviderId: string,
): { orders: TwapOrder[]; authoritativeProviderIds: Set<string> } => {
  const previousByIdentity = new Map(
    previousOrders.map((order) => [getTwapOrderIdentityKey(order), order]),
  );
  const streamedByIdentity = new Map(
    streamedOrders.map((order) => [
      getTwapOrderIdentityKey(order),
      mergeTwapOrder(
        previousByIdentity.get(getTwapOrderIdentityKey(order)),
        order,
      ),
    ]),
  );
  const authoritativeProviderIds = new Set<string>(
    streamedOrders.map(getTwapOrderProviderId),
  );

  // A direct-provider subscription owns the selected provider partition even
  // when its snapshot is empty. Aggregated rows carry their own provider
  // identity; today's empty aggregate stream belongs to the default provider.
  if (isSnapshot && activeProviderId !== PROVIDER_CONFIG.AggregatedProvider) {
    authoritativeProviderIds.add(activeProviderId);
  } else if (isSnapshot && streamedOrders.length === 0) {
    authoritativeProviderIds.add(PROVIDER_CONFIG.DefaultProvider);
  }

  for (const previousOrder of previousOrders) {
    const identityKey = getTwapOrderIdentityKey(previousOrder);
    if (streamedByIdentity.has(identityKey)) {
      continue;
    }

    const providerWasSnapshotted = authoritativeProviderIds.has(
      getTwapOrderProviderId(previousOrder),
    );
    // Stream snapshots cap terminal history, so absence is authoritative only
    // for active schedules in a partition the snapshot actually owns.
    if (
      isSnapshot &&
      providerWasSnapshotted &&
      previousOrder.status === 'active'
    ) {
      continue;
    }
    streamedByIdentity.set(identityKey, previousOrder);
  }

  return {
    orders: sortTwapOrdersByStartedAt([...streamedByIdentity.values()]),
    authoritativeProviderIds,
  };
};

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
        (order) => !snapshotProviderIds.has(getTwapOrderProviderId(order)),
      )
      .map(getTwapOrderProviderId),
  );
  const ordersByIdentity = mergeTwapOrderSnapshot(
    previousOrders,
    snapshotOrders,
  );

  // A provider read is one all-or-nothing partition in the aggregated
  // controller. If that partition disappears while one of its schedules was
  // known, retain the complete prior partition: terminal history and fills are
  // no less authoritative than an active termination surface. A later result
  // containing any row for that provider authoritatively replaces the whole
  // partition. The provider-qualified key also guards against duplicate
  // venue-local IDs.
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
  /**
   * Keep a low-cadence REST discovery read active while rollout is disabled
   * and the TWAP tab is not mounted. This lets externally-created schedules
   * surface without remounting the screen.
   *
   * @default false
   */
  enableDiscovery?: boolean;
  /** @default PERPS_TWAP_UI_CONFIG.DiscoveryIntervalMs */
  discoveryInterval?: number;
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
 * partial failure from a legitimate empty account. Once any partition is
 * known, an omitted partition (including terminal-only history and fills) is
 * retained with a retryable error until REST or the default-provider stream
 * confirms its state. The controller must expose per-provider outcomes to
 * close the remaining cold-start ambiguity.
 *
 * `subscribeToTwapOrders` supplies authoritative current schedule state but
 * caps terminal history and omits slice fills. Stream snapshots therefore
 * reconcile only the provider partitions they identify, retain REST-only
 * terminal rows, and preserve known fills. Bounded REST reconciliation remains
 * active alongside the subscription so unbounded history, fills, and omitted
 * aggregate provider partitions stay current.
 */
export const usePerpsTwapOrders = (
  options: UsePerpsTwapOrdersOptions = {},
): UsePerpsTwapOrdersResult => {
  const {
    enableLiveUpdates = false,
    pollingInterval = PERPS_TWAP_UI_CONFIG.LiveUpdateIntervalMs,
    pauseLiveRestReconciliation = false,
    enableDiscovery = false,
    discoveryInterval = PERPS_TWAP_UI_CONFIG.DiscoveryIntervalMs,
    skipInitialFetch = false,
  } = options;

  const selectedAddress = useSelector(selectPerpsSelectedAccountAddress);
  const provider = useSelector(selectPerpsProvider);
  const network = useSelector(selectPerpsNetwork);
  const {
    key: marketContextKey,
    isReady: isMarketReady,
    isUserReady,
  } = usePerpsMarketContext();
  const isContextReady = isMarketReady && isUserReady;
  const identityKey = `${selectedAddress ?? 'none'}|${provider}|${network}|${marketContextKey}`;

  const [twapOrders, setTwapOrders] = useState<TwapOrder[]>([]);
  const [isLoading, setIsLoading] = useState(!skipInitialFetch);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resolvedIdentityKey, setResolvedIdentityKey] = useState(identityKey);
  const skipInitialFetchRef = useRef(skipInitialFetch);
  const lifecycleGenerationRef = useRef(0);
  const requestGenerationRef = useRef(0);
  const currentIdentityKeyRef = useRef(identityKey);
  const twapOrdersRef = useRef<TwapOrder[]>([]);
  const readFailureMessageRef = useRef<string | null>(null);
  const unconfirmedProviderIdsRef = useRef(new Set<string>());
  const streamRevisionRef = useRef(0);
  const streamedOrderRevisionRef = useRef(new Map<string, number>());
  const streamedProviderSnapshotRevisionRef = useRef(new Map<string, number>());
  const inFlightFetchRef = useRef<{
    identityKey: string;
    promise: Promise<void>;
  } | null>(null);
  currentIdentityKeyRef.current = identityKey;
  skipInitialFetchRef.current = skipInitialFetch;

  useEffect(() => {
    const lifecycleGeneration = ++lifecycleGenerationRef.current;
    requestGenerationRef.current += 1;
    inFlightFetchRef.current = null;
    twapOrdersRef.current = [];
    readFailureMessageRef.current = null;
    unconfirmedProviderIdsRef.current = new Set();
    streamRevisionRef.current = 0;
    streamedOrderRevisionRef.current = new Map();
    streamedProviderSnapshotRevisionRef.current = new Map();
    setTwapOrders([]);
    setResolvedIdentityKey(identityKey);
    setIsLoading(!skipInitialFetchRef.current);
    setIsRefreshing(false);
    setError(null);

    return () => {
      if (lifecycleGenerationRef.current === lifecycleGeneration) {
        lifecycleGenerationRef.current += 1;
      }
      requestGenerationRef.current += 1;
    };
  }, [identityKey]);

  const fetchTwapOrders = useCallback(
    async (isRefresh = false): Promise<void> => {
      if (!isContextReady || currentIdentityKeyRef.current !== identityKey) {
        return;
      }

      const inFlightFetch = inFlightFetchRef.current;
      if (inFlightFetch?.identityKey === identityKey) {
        await inFlightFetch.promise;
        return;
      }

      const lifecycleGeneration = lifecycleGenerationRef.current;
      const requestGeneration = ++requestGenerationRef.current;
      const streamRevisionAtRequestStart = streamRevisionRef.current;
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
                  orders: sortTwapOrdersByStartedAt([
                    ...mergeTwapOrderSnapshot(
                      twapOrdersRef.current,
                      orders || [],
                    ).values(),
                  ]),
                  unconfirmedProviderIds: new Set<string>(),
                };
          const currentOrdersByIdentity = new Map(
            twapOrdersRef.current.map((order) => [
              getTwapOrderIdentityKey(order),
              order,
            ]),
          );
          const mergedOrdersByIdentity = new Map(
            reconciliation.orders.map((order) => [
              getTwapOrderIdentityKey(order),
              order,
            ]),
          );

          // REST contributes unbounded history, fills, and recovered provider
          // partitions. Retain every current row delivered by the authoritative
          // schedule stream, even when that row arrived before this read began,
          // while merging in complementary REST fills. A newer provider snapshot
          // may remove only stale active rows; REST-only terminal history is
          // never removed by the capped stream.
          for (const identity of streamedOrderRevisionRef.current.keys()) {
            const streamedOrder = currentOrdersByIdentity.get(identity);
            if (streamedOrder) {
              mergedOrdersByIdentity.set(
                identity,
                mergeTwapOrder(
                  mergedOrdersByIdentity.get(identity),
                  streamedOrder,
                ),
              );
            }
          }
          for (const [
            providerId,
            streamRevision,
          ] of streamedProviderSnapshotRevisionRef.current) {
            if (streamRevision <= streamRevisionAtRequestStart) {
              continue;
            }
            reconciliation.unconfirmedProviderIds.delete(providerId);
            for (const [identity, order] of mergedOrdersByIdentity) {
              if (
                order.status === 'active' &&
                getTwapOrderProviderId(order) === providerId &&
                !currentOrdersByIdentity.has(identity)
              ) {
                mergedOrdersByIdentity.delete(identity);
              }
            }
          }
          const mergedOrders = sortTwapOrdersByStartedAt([
            ...mergedOrdersByIdentity.values(),
          ]);
          twapOrdersRef.current = mergedOrders;
          handlePerpsCufTwapOrdersDelivered(mergedOrders);
          readFailureMessageRef.current = null;
          unconfirmedProviderIdsRef.current =
            reconciliation.unconfirmedProviderIds;
          setTwapOrders(mergedOrders);
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
        // Expose an enabled retry/refresh control only after this request no
        // longer owns the single-flight slot. A user can therefore retry on
        // the first rendered enabled frame without racing a settled promise.
        if (isCurrentRequest()) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    },
    [identityKey, isContextReady, provider],
  );

  const refresh = useCallback(
    (): Promise<void> => fetchTwapOrders(true),
    [fetchTwapOrders],
  );

  useEffect(() => {
    if (isContextReady && !skipInitialFetch) {
      fetchTwapOrders();
    }
  }, [fetchTwapOrders, isContextReady, skipInitialFetch]);

  useEffect(() => {
    if (!enableLiveUpdates || !isContextReady) {
      return undefined;
    }

    const lifecycleGeneration = lifecycleGenerationRef.current;

    const unsubscribe = Engine.context.PerpsController.subscribeToTwapOrders({
      callback: (streamedOrders, isSnapshot = false) => {
        if (
          currentIdentityKeyRef.current !== identityKey ||
          lifecycleGenerationRef.current !== lifecycleGeneration
        ) {
          return;
        }
        const streamRevision = ++streamRevisionRef.current;
        const reconciliation = reconcileTwapOrderStream(
          twapOrdersRef.current,
          streamedOrders,
          isSnapshot,
          provider ?? PROVIDER_CONFIG.DefaultProvider,
        );
        for (const order of streamedOrders) {
          streamedOrderRevisionRef.current.set(
            getTwapOrderIdentityKey(order),
            streamRevision,
          );
        }
        if (isSnapshot) {
          for (const providerId of reconciliation.authoritativeProviderIds) {
            streamedProviderSnapshotRevisionRef.current.set(
              providerId,
              streamRevision,
            );
          }
        }
        const mergedOrders = reconciliation.orders;
        twapOrdersRef.current = mergedOrders;
        handlePerpsCufTwapOrdersDelivered(mergedOrders);
        setTwapOrders(mergedOrders);
        for (const providerId of reconciliation.authoritativeProviderIds) {
          unconfirmedProviderIdsRef.current.delete(providerId);
        }
        setError(
          readFailureMessageRef.current ??
            (unconfirmedProviderIdsRef.current.size > 0
              ? PARTIAL_TWAP_SNAPSHOT_ERROR
              : null),
        );
        setResolvedIdentityKey(identityKey);
        setIsLoading(false);
      },
    });

    return unsubscribe;
  }, [enableLiveUpdates, identityKey, isContextReady, provider]);

  useEffect(() => {
    if (!enableLiveUpdates || !isContextReady || pauseLiveRestReconciliation) {
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
    isContextReady,
    pauseLiveRestReconciliation,
    pollingInterval,
  ]);

  useEffect(() => {
    if (!enableDiscovery || enableLiveUpdates || !isContextReady) {
      return undefined;
    }

    const intervalId = setInterval(() => {
      fetchTwapOrders(true);
    }, discoveryInterval);

    return () => {
      clearInterval(intervalId);
    };
  }, [
    discoveryInterval,
    enableDiscovery,
    enableLiveUpdates,
    fetchTwapOrders,
    isContextReady,
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

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useSyncExternalStore,
} from 'react';
import {
  CHASE_ORDER_STATUS,
  ChaseOrderSuspensionError,
  InitializationState,
  PERPS_CONSTANTS,
  type ChaseOrder,
  type Order,
  type PerpsActiveProviderMode,
} from '@metamask/perps-controller';
import { AppState } from 'react-native';
import { useSelector } from 'react-redux';
import isEqual from 'lodash/isEqual';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';
import { ensureError } from '../../../../util/errorUtils';
import { selectSelectedInternalAccountAddress } from '../../../../selectors/accountsController';
import {
  CHASE_HISTORY_STATUSES,
  CHASE_ORDER_UI_CONFIG,
  CHASE_RETAINED_STATUSES,
} from '../constants/perpsConfig';
import { PerpsCacheInvalidator } from '../services/PerpsCacheInvalidator';
import { PerpsConnectionManager } from '../services/PerpsConnectionManager';
import { reportSuspendedChaseOrders } from '../services/ChaseOrderSuspensionEvents';
import {
  subscribeToChaseOrderStoreReconciliation,
  type ChaseOrderRouteIdentity,
} from '../services/ChaseOrderStoreReconciliationEvents';
import {
  selectPerpsInitializationState,
  selectPerpsNetwork,
  selectPerpsProvider,
} from '../selectors/perpsController';

interface ChaseOrdersSnapshot {
  orders: ChaseOrder[];
  discoveryResolvedRoute: string;
}

export type ChaseOrderRequestErrorCode = 'context_not_ready' | 'stale_request';

export class ChaseOrderRequestError extends Error {
  readonly code: ChaseOrderRequestErrorCode;

  constructor(code: ChaseOrderRequestErrorCode) {
    super(
      code === 'context_not_ready'
        ? 'Chase order context is not ready'
        : 'Chase order request became stale',
    );
    this.name = 'ChaseOrderRequestError';
    this.code = code;
  }
}

export const isExpectedChaseOrderRequestError = (
  error: unknown,
): error is ChaseOrderRequestError => error instanceof ChaseOrderRequestError;

let cachedOrders: ChaseOrder[] = [];
let cachedRoute = '';
let selectedRoute = '';
let selectedProvider: PerpsActiveProviderMode | undefined;
let initialRefreshRoute = '';
let isControllerInitialized = false;
let requestGeneration = 0;
let refreshPromise:
  | { route: string; generation: number; promise: Promise<ChaseOrder[]> }
  | undefined;
let mutationQueue: Promise<void> = Promise.resolve();
let mutationQueueEpoch = 0;
let storeLifecycleGeneration = 0;
const cancellationReconciliationCounts = new Map<string, number>();
const deferredCancellationRefreshEpochs = new Map<string, number>();
let refreshTimer: ReturnType<typeof setInterval> | undefined;
let invalidationUnsubscribe: (() => void) | undefined;
let storeReconciliationUnsubscribe: (() => void) | undefined;
let discoveryInvalidationUnsubscribe: (() => void) | undefined;
let discoveryAppStateSubscription:
  | ReturnType<typeof AppState.addEventListener>
  | undefined;
let discoveryRetryTimer: ReturnType<typeof setTimeout> | undefined;
let discoveryPromise: { route: string; promise: Promise<void> } | undefined;
let discoveryAttempt = 0;
let discoveryRoute = '';
let discoveryExhausted = false;
let discoveryPausedForBackground = false;
let refreshFailureLogged = false;
let enabledConsumerCount = 0;
const aggregatedOmissionCounts = new Map<string, number>();
const listeners = new Set<() => void>();
const EMPTY_ORDERS: ChaseOrder[] = [];
let storeSnapshot: ChaseOrdersSnapshot = {
  orders: cachedOrders,
  discoveryResolvedRoute: initialRefreshRoute,
};
const EMPTY_SNAPSHOT: ChaseOrdersSnapshot = {
  orders: EMPTY_ORDERS,
  discoveryResolvedRoute: '',
};
const hasLiveRetainedOrders = () =>
  cachedOrders.some((order) => CHASE_RETAINED_STATUSES.has(order.status));
const getBoundedTerminalHistory = (orders: ChaseOrder[]) =>
  orders
    .filter((order) => CHASE_HISTORY_STATUSES.has(order.status))
    .sort(
      (left, right) =>
        right.startedAt - left.startedAt ||
        left.handle.localeCompare(right.handle),
    )
    .slice(0, CHASE_ORDER_UI_CONFIG.TerminalHistoryLimit);
const getChaseOrderIdentity = (order: ChaseOrder) =>
  `${order.providerId ?? 'unknown'}:${order.handle}`;
const isSameChaseOrder = (left: ChaseOrder, right: ChaseOrder) =>
  left.handle === right.handle &&
  (left.providerId === right.providerId ||
    left.providerId === undefined ||
    right.providerId === undefined);
const mergeWithCachedHistory = (
  orders: ChaseOrder[],
  preserveMissingRetainedOrders = false,
): ChaseOrder[] => {
  orders.forEach((order) => {
    aggregatedOmissionCounts.delete(getChaseOrderIdentity(order));
    if (order.providerId !== undefined) {
      aggregatedOmissionCounts.delete(`unknown:${order.handle}`);
    } else {
      for (const identity of aggregatedOmissionCounts.keys()) {
        if (identity.endsWith(`:${order.handle}`)) {
          aggregatedOmissionCounts.delete(identity);
        }
      }
    }
  });
  const missingRetainedOrders = cachedOrders.filter(
    (order) =>
      CHASE_RETAINED_STATUSES.has(order.status) &&
      !orders.some((controllerOrder) =>
        isSameChaseOrder(order, controllerOrder),
      ),
  );
  const retainedOrders = preserveMissingRetainedOrders
    ? missingRetainedOrders
    : selectedProvider === 'aggregated'
      ? missingRetainedOrders.filter((order) => {
          const identity = getChaseOrderIdentity(order);
          const misses = (aggregatedOmissionCounts.get(identity) ?? 0) + 1;
          if (misses > CHASE_ORDER_UI_CONFIG.AggregatedOmissionGraceReads) {
            aggregatedOmissionCounts.delete(identity);
            return false;
          }
          aggregatedOmissionCounts.set(identity, misses);
          return true;
        })
      : [];
  if (selectedProvider !== 'aggregated') {
    aggregatedOmissionCounts.clear();
  }
  const mergedOrders = [
    ...orders,
    ...retainedOrders,
    ...cachedOrders.filter(
      (order) =>
        CHASE_HISTORY_STATUSES.has(order.status) &&
        !orders.some((controllerOrder) =>
          isSameChaseOrder(order, controllerOrder),
        ),
    ),
  ];
  return [
    ...mergedOrders.filter(
      (order) => !CHASE_HISTORY_STATUSES.has(order.status),
    ),
    ...getBoundedTerminalHistory(mergedOrders),
  ];
};

const mergeWithAuthoritativeFilledOrders = (
  orders: ChaseOrder[],
  filledOrders: ChaseOrder[],
) => {
  const mergedOrders = mergeWithCachedHistory(orders);
  if (filledOrders.length === 0) return mergedOrders;
  filledOrders.forEach((order) => {
    aggregatedOmissionCounts.delete(getChaseOrderIdentity(order));
    if (order.providerId !== undefined) {
      aggregatedOmissionCounts.delete(`unknown:${order.handle}`);
    }
  });
  const withoutFilledOrders = mergedOrders.filter(
    (order) =>
      !filledOrders.some((filledOrder) => isSameChaseOrder(order, filledOrder)),
  );
  const withFilledOrders = [
    ...withoutFilledOrders,
    ...filledOrders.map((order) => ({
      ...order,
      remainingSize: '0',
      restingOrderId: null,
      status: CHASE_ORDER_STATUS.Filled,
    })),
  ];
  return [
    ...withFilledOrders.filter(
      (order) => !CHASE_HISTORY_STATUSES.has(order.status),
    ),
    ...getBoundedTerminalHistory(withFilledOrders),
  ];
};

const getOrdersProvenFilled = (
  orders: ChaseOrder[],
  historicalOrders: Order[],
) =>
  cachedOrders.filter((cachedOrder) => {
    if (
      !CHASE_RETAINED_STATUSES.has(cachedOrder.status) ||
      cachedOrder.restingOrderId === null ||
      orders.some((order) => isSameChaseOrder(order, cachedOrder))
    ) {
      return false;
    }
    const matchingOrders = historicalOrders.filter(
      (historicalOrder) =>
        historicalOrder.orderId === cachedOrder.restingOrderId &&
        historicalOrder.symbol === cachedOrder.symbol &&
        historicalOrder.timestamp >= cachedOrder.startedAt &&
        (cachedOrder.providerId !== undefined
          ? historicalOrder.providerId === cachedOrder.providerId
          : selectedProvider !== 'aggregated'),
    );
    if (matchingOrders.length === 0) return false;
    const latestTimestamp = Math.max(
      ...matchingOrders.map(
        (historicalOrder) =>
          historicalOrder.lastUpdated ?? historicalOrder.timestamp,
      ),
    );
    const latestOrders = matchingOrders.filter(
      (historicalOrder) =>
        (historicalOrder.lastUpdated ?? historicalOrder.timestamp) ===
        latestTimestamp,
    );
    return latestOrders.every(
      (historicalOrder) => historicalOrder.status === 'filled',
    );
  });

const mergeAfterSuccessfulCancellation = (
  orders: ChaseOrder[],
  canceledOrder: ChaseOrder,
  filledOrders: ChaseOrder[],
  hasUnobservedPotentialChild: boolean,
) => {
  const mergedOrders = mergeWithAuthoritativeFilledOrders(orders, filledOrders);
  if (
    !CHASE_RETAINED_STATUSES.has(canceledOrder.status) ||
    orders.some((order) => isSameChaseOrder(order, canceledOrder)) ||
    filledOrders.some((order) => isSameChaseOrder(order, canceledOrder))
  ) {
    return mergedOrders;
  }
  if (hasUnobservedPotentialChild) {
    return mergeWithCachedHistory(
      [
        {
          ...canceledOrder,
          restingOrderId: null,
          status: CHASE_ORDER_STATUS.TerminationPending,
        },
      ],
      true,
    );
  }
  aggregatedOmissionCounts.delete(getChaseOrderIdentity(canceledOrder));
  if (canceledOrder.providerId !== undefined) {
    aggregatedOmissionCounts.delete(`unknown:${canceledOrder.handle}`);
  }
  const withoutCanceledOrder = mergedOrders.filter(
    (order) => !isSameChaseOrder(order, canceledOrder),
  );
  const withCanceledOrder = [
    ...withoutCanceledOrder,
    {
      ...canceledOrder,
      status: CHASE_ORDER_STATUS.Canceled,
      restingOrderId: null,
    },
  ];
  return [
    ...withCanceledOrder.filter(
      (order) => !CHASE_HISTORY_STATUSES.has(order.status),
    ),
    ...getBoundedTerminalHistory(withCanceledOrder),
  ];
};

const emitChange = () => {
  storeSnapshot = {
    orders: cachedOrders,
    discoveryResolvedRoute: initialRefreshRoute,
  };
  listeners.forEach((listener) => listener());
};

const setCachedOrders = (orders: ChaseOrder[]): boolean => {
  if (isEqual(cachedOrders, orders)) {
    return false;
  }
  cachedOrders = orders;
  return true;
};

const setDiscoveryResolvedRoute = (route: string) => {
  const isCurrentSnapshot =
    initialRefreshRoute === route &&
    storeSnapshot.discoveryResolvedRoute === route &&
    storeSnapshot.orders === cachedOrders;
  initialRefreshRoute = route;
  if (!isCurrentSnapshot) emitChange();
};

const createMutationTimeout = () => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const error = new Error('Chase mutation timed out');
  const promise = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(error),
      CHASE_ORDER_UI_CONFIG.BackgroundSuspensionTimeoutMs,
    );
  });
  return {
    error,
    promise,
    clear: () => {
      if (timer) clearTimeout(timer);
    },
  };
};

const getRouteKey = (): string => selectedRoute;

const isConnectionIdentityReady = () =>
  PerpsConnectionManager.isSelectedUserContextReady();

const canRefreshCurrentRoute = () =>
  isControllerInitialized &&
  Boolean(getRouteKey()) &&
  isConnectionIdentityReady();

const stopRefreshLifecycle = () => {
  if (refreshTimer) clearInterval(refreshTimer);
  refreshTimer = undefined;
  invalidationUnsubscribe?.();
  invalidationUnsubscribe = undefined;
};

function syncRefreshLifecycle() {
  const shouldRefresh =
    listeners.size > 0 &&
    canRefreshCurrentRoute() &&
    enabledConsumerCount > 0 &&
    hasLiveRetainedOrders();
  if (!shouldRefresh) {
    stopRefreshLifecycle();
    return;
  }
  invalidationUnsubscribe ??= PerpsCacheInvalidator.subscribe(
    'accountState',
    () => {
      const route = getRouteKey();
      if ((cancellationReconciliationCounts.get(route) ?? 0) > 0) {
        deferredCancellationRefreshEpochs.set(route, mutationQueueEpoch);
        return;
      }
      requestGeneration += 1;
      refreshPromise = undefined;
      if (canRefreshCurrentRoute()) {
        refreshChaseOrders().catch(() => undefined);
      }
    },
  );
  refreshTimer ??= setInterval(() => {
    if (
      AppState.currentState === 'active' &&
      canRefreshCurrentRoute() &&
      enabledConsumerCount > 0 &&
      hasLiveRetainedOrders()
    ) {
      refreshChaseOrders().catch(() => undefined);
    }
  }, CHASE_ORDER_UI_CONFIG.RefreshIntervalMs);
}

async function refreshChaseOrders(
  canceledOrder?: ChaseOrder,
): Promise<ChaseOrder[]> {
  const route = getRouteKey();
  if (!canRefreshCurrentRoute()) return EMPTY_ORDERS;
  const generation = requestGeneration;
  if (
    refreshPromise?.route === route &&
    refreshPromise.generation === generation
  ) {
    return await refreshPromise.promise;
  }
  const promise = Engine.context.PerpsController.getChaseOrders()
    .catch((error) => {
      if (!refreshFailureLogged) {
        refreshFailureLogged = true;
        Logger.error(ensureError(error, 'usePerpsChaseOrders.refresh'), {
          tags: {
            feature: PERPS_CONSTANTS.FeatureName,
            component: 'usePerpsChaseOrders',
            action: 'get_chase_orders',
          },
          context: {
            name: 'usePerpsChaseOrders.refresh',
            data: { route },
          },
        });
      }
      throw error;
    })
    .then(async (orders) => {
      if (
        generation !== requestGeneration ||
        route !== getRouteKey() ||
        !canRefreshCurrentRoute()
      ) {
        throw new ChaseOrderRequestError('stale_request');
      }
      const missingRetainedOrders = cachedOrders.filter(
        (cachedOrder) =>
          CHASE_RETAINED_STATUSES.has(cachedOrder.status) &&
          cachedOrder.restingOrderId !== null &&
          !orders.some((order) => isSameChaseOrder(order, cachedOrder)),
      );
      let filledOrders: ChaseOrder[] = [];
      let hasUnobservedPotentialChild = false;
      if (missingRetainedOrders.length > 0) {
        // Provider teardown can remove a terminal Chase before Mobile reads its
        // final snapshot. Only the exact child's terminal status proves Filled.
        const startTime = Math.min(
          ...missingRetainedOrders.map((order) => order.startedAt),
        );
        const historicalOrders = await Engine.context.PerpsController.getOrders(
          { startTime },
          { forceRefresh: true },
        );
        if (
          generation !== requestGeneration ||
          route !== getRouteKey() ||
          !canRefreshCurrentRoute()
        ) {
          throw new ChaseOrderRequestError('stale_request');
        }
        filledOrders = getOrdersProvenFilled(orders, historicalOrders);
        if (canceledOrder?.restingOrderId) {
          // v15 exposes no child lineage after removing a Chase session. A
          // different same-route child may be a rotation, so keep the session
          // unresolved instead of attributing one child's cancel to the Chase.
          const canceledChildTimestamps = historicalOrders
            .filter(
              (historicalOrder) =>
                historicalOrder.orderId === canceledOrder.restingOrderId &&
                historicalOrder.symbol === canceledOrder.symbol &&
                historicalOrder.side === canceledOrder.side &&
                (canceledOrder.providerId === undefined
                  ? selectedProvider !== 'aggregated'
                  : historicalOrder.providerId === canceledOrder.providerId),
            )
            .map(
              (historicalOrder) =>
                historicalOrder.lastUpdated ?? historicalOrder.timestamp,
            );
          const canceledChildTimestamp =
            canceledChildTimestamps.length > 0
              ? Math.max(...canceledChildTimestamps)
              : undefined;
          hasUnobservedPotentialChild = historicalOrders.some(
            (historicalOrder) =>
              historicalOrder.orderId !== canceledOrder.restingOrderId &&
              historicalOrder.symbol === canceledOrder.symbol &&
              historicalOrder.side === canceledOrder.side &&
              (canceledChildTimestamp === undefined ||
                (historicalOrder.lastUpdated ?? historicalOrder.timestamp) >
                  canceledChildTimestamp) &&
              (canceledOrder.providerId === undefined
                ? selectedProvider !== 'aggregated'
                : historicalOrder.providerId === canceledOrder.providerId),
          );
        }
      }
      refreshFailureLogged = false;
      cachedRoute = route;
      const ordersChanged = setCachedOrders(
        canceledOrder
          ? mergeAfterSuccessfulCancellation(
              orders,
              canceledOrder,
              filledOrders,
              hasUnobservedPotentialChild,
            )
          : mergeWithAuthoritativeFilledOrders(orders, filledOrders),
      );
      if (ordersChanged) emitChange();
      syncRefreshLifecycle();
      return cachedOrders;
    })
    .finally(() => {
      if (refreshPromise?.promise === promise) refreshPromise = undefined;
    });
  refreshPromise = { route, generation, promise };
  return await promise;
}

const stopDiscoveryRecoverySubscriptions = () => {
  discoveryInvalidationUnsubscribe?.();
  discoveryInvalidationUnsubscribe = undefined;
  discoveryAppStateSubscription?.remove();
  discoveryAppStateSubscription = undefined;
};

const resetDiscoveryState = (route = '') => {
  if (discoveryRetryTimer) clearTimeout(discoveryRetryTimer);
  discoveryRetryTimer = undefined;
  discoveryPromise = undefined;
  discoveryAttempt = 0;
  discoveryRoute = route;
  discoveryExhausted = false;
  discoveryPausedForBackground = false;
  stopDiscoveryRecoverySubscriptions();
};

function startRetainedDiscovery(resetBackoff = false) {
  const route = getRouteKey();
  if (discoveryPromise?.route === route) return;
  if (resetBackoff) {
    refreshFailureLogged = false;
    resetDiscoveryState(route);
    setDiscoveryResolvedRoute('');
  }
  if (
    listeners.size === 0 ||
    !canRefreshCurrentRoute() ||
    initialRefreshRoute === route ||
    discoveryRetryTimer
  ) {
    return;
  }
  if (AppState.currentState === 'background') {
    discoveryPausedForBackground = true;
    installDiscoveryRecoverySubscriptions();
    return;
  }
  if (discoveryRoute !== route) resetDiscoveryState(route);
  discoveryAttempt += 1;
  installDiscoveryRecoverySubscriptions();
  const promise = refreshChaseOrders()
    .then(() => {
      if (selectedRoute !== route || !isConnectionIdentityReady()) return;
      resetDiscoveryState(route);
      setDiscoveryResolvedRoute(route);
      syncRefreshLifecycle();
    })
    .catch(() => {
      const ownsDiscovery = discoveryPromise?.promise === promise;
      if (!ownsDiscovery) return;
      discoveryPromise = undefined;
      if (
        selectedRoute !== route ||
        !canRefreshCurrentRoute() ||
        listeners.size === 0
      ) {
        return;
      }
      if (AppState.currentState === 'background') {
        discoveryPausedForBackground = true;
        installDiscoveryRecoverySubscriptions();
        return;
      }
      if (discoveryAttempt >= CHASE_ORDER_UI_CONFIG.DiscoveryRetryMaxAttempts) {
        discoveryExhausted = true;
        installDiscoveryRecoverySubscriptions();
        return;
      }
      const delayMs = Math.min(
        CHASE_ORDER_UI_CONFIG.RefreshIntervalMs * 2 ** (discoveryAttempt - 1),
        CHASE_ORDER_UI_CONFIG.DiscoveryRetryMaxDelayMs,
      );
      discoveryRetryTimer = setTimeout(() => {
        discoveryRetryTimer = undefined;
        startRetainedDiscovery();
      }, delayMs);
    })
    .finally(() => {
      if (discoveryPromise?.promise === promise) discoveryPromise = undefined;
    });
  discoveryPromise = { route, promise };
}

function installDiscoveryRecoverySubscriptions() {
  if (listeners.size === 0) return;
  if (discoveryExhausted || discoveryPausedForBackground) {
    discoveryInvalidationUnsubscribe ??= PerpsCacheInvalidator.subscribe(
      'accountState',
      () => startRetainedDiscovery(true),
    );
  }
  discoveryAppStateSubscription ??= AppState.addEventListener(
    'change',
    (state) => {
      if (state === 'background') {
        if (discoveryRetryTimer) clearTimeout(discoveryRetryTimer);
        discoveryRetryTimer = undefined;
        discoveryPausedForBackground = true;
        return;
      }
      if (
        state === 'active' &&
        (discoveryExhausted || discoveryPausedForBackground)
      ) {
        startRetainedDiscovery(true);
      }
    },
  );
}

const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener);
  storeReconciliationUnsubscribe ??= subscribeToChaseOrderStoreReconciliation(
    ({ orders, route }) => {
      const routeKey = getRouteIdentityKey(route);
      if (routeKey !== getRouteKey()) return;
      enqueueStoreReconciliation({
        orders,
        route: routeKey,
        expectedEpoch: mutationQueueEpoch,
        applyOrders: true,
      }).catch((error) => {
        Logger.error(
          ensureError(error, 'usePerpsChaseOrders.externalReconciliation'),
          {
            tags: {
              feature: PERPS_CONSTANTS.FeatureName,
              component: 'usePerpsChaseOrders',
              action: 'external_chase_reconciliation',
            },
          },
        );
      });
    },
  );
  syncRefreshLifecycle();
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      storeReconciliationUnsubscribe?.();
      storeReconciliationUnsubscribe = undefined;
      resetChaseOrdersStore();
    } else {
      syncRefreshLifecycle();
    }
  };
};

function resetChaseOrdersStore() {
  stopRefreshLifecycle();
  resetDiscoveryState();
  requestGeneration += 1;
  refreshPromise = undefined;
  mutationQueue = Promise.resolve();
  mutationQueueEpoch += 1;
  storeLifecycleGeneration += 1;
  cancellationReconciliationCounts.clear();
  deferredCancellationRefreshEpochs.clear();
  cachedRoute = '';
  cachedOrders = [];
  selectedRoute = '';
  selectedProvider = undefined;
  initialRefreshRoute = '';
  isControllerInitialized = false;
  refreshFailureLogged = false;
  enabledConsumerCount = 0;
  aggregatedOmissionCounts.clear();
  storeSnapshot = {
    orders: cachedOrders,
    discoveryResolvedRoute: initialRefreshRoute,
  };
}

export const resetPerpsChaseOrdersStoreForTests = () => {
  if (listeners.size > 0) {
    throw new Error('Cannot reset the Chase store while consumers are mounted');
  }
  resetChaseOrdersStore();
};

const getSnapshot = () => storeSnapshot;

function getRouteIdentityKey(route: ChaseOrderRouteIdentity) {
  return `${route.account.toLowerCase()}:${route.provider}:${route.network}`;
}

function enqueueStoreReconciliation({
  orders,
  route,
  expectedEpoch,
  applyOrders,
}: {
  orders: ChaseOrder[];
  route: string;
  expectedEpoch: number;
  applyOrders: boolean;
}) {
  const previousMutationQueue = mutationQueue;
  const operation = previousMutationQueue.then(async () => {
    if (
      expectedEpoch !== mutationQueueEpoch ||
      route !== getRouteKey() ||
      !canRefreshCurrentRoute()
    ) {
      return;
    }
    if (applyOrders && orders.length > 0) {
      cachedRoute = route;
      const ordersChanged = setCachedOrders(
        mergeWithCachedHistory(orders, true),
      );
      if (ordersChanged) emitChange();
    }
    const generation = ++requestGeneration;
    refreshPromise = undefined;
    setDiscoveryResolvedRoute('');
    const freshOrders = await Engine.context.PerpsController.getChaseOrders();
    if (
      expectedEpoch !== mutationQueueEpoch ||
      generation !== requestGeneration ||
      route !== getRouteKey() ||
      !canRefreshCurrentRoute()
    ) {
      return;
    }
    cachedRoute = route;
    const ordersChanged = setCachedOrders(mergeWithCachedHistory(freshOrders));
    if (ordersChanged) emitChange();
    setDiscoveryResolvedRoute(route);
    syncRefreshLifecycle();
  });
  mutationQueue = operation.catch(() => undefined);
  return operation;
}

const suspendAndCacheChaseOrders = async (
  isCurrentLifecycle: () => boolean,
): Promise<ChaseOrder[]> => {
  const previousMutationQueue = mutationQueue;
  const operation = Promise.resolve().then(async () => {
    if (!isCurrentLifecycle()) {
      await previousMutationQueue;
      return [];
    }
    const operationEpoch = ++mutationQueueEpoch;
    const route = getRouteKey();
    const generation = ++requestGeneration;
    refreshPromise = undefined;
    const timeout = createMutationTimeout();
    let controllerSuspension =
      Engine.context.PerpsController.suspendChaseOrders();
    const reconcileLateSuspension = (suspension: Promise<ChaseOrder[]>) => {
      const reconcileOrders = (orders: ChaseOrder[]) => {
        reportSuspendedChaseOrders(orders);
        enqueueStoreReconciliation({
          orders,
          route,
          expectedEpoch: operationEpoch,
          applyOrders: false,
        }).catch(() => undefined);
      };
      suspension.then(reconcileOrders).catch((error) => {
        if (error instanceof ChaseOrderSuspensionError) {
          reconcileOrders(error.suspendedOrders);
        }
        Logger.error(ensureError(error, 'usePerpsChaseOrders.lateSuspension'), {
          tags: {
            feature: PERPS_CONSTANTS.FeatureName,
            component: 'usePerpsChaseOrders',
            action: 'late_chase_suspension',
          },
          context: {
            name: 'usePerpsChaseOrders.lateSuspension',
            data: {
              route,
              partialCount:
                error instanceof ChaseOrderSuspensionError
                  ? error.suspendedOrders.length
                  : 0,
            },
          },
        });
      });
    };
    let result: ChaseOrder[];
    try {
      try {
        result = await Promise.race([controllerSuspension, timeout.promise]);
      } catch (error) {
        if (!(error instanceof ChaseOrderSuspensionError)) {
          throw error;
        }
        if (
          isCurrentLifecycle() &&
          operationEpoch === mutationQueueEpoch &&
          generation === requestGeneration &&
          route === getRouteKey()
        ) {
          cachedRoute = route;
          cachedOrders = mergeWithCachedHistory(error.suspendedOrders, true);
          emitChange();
        }
        // Both attempts share one timeout so the full suspension stays bounded.
        controllerSuspension =
          Engine.context.PerpsController.suspendChaseOrders();
        try {
          result = await Promise.race([controllerSuspension, timeout.promise]);
        } catch (retryError) {
          if (retryError instanceof ChaseOrderSuspensionError) {
            const suspendedOrdersByHandle = new Map(
              [...error.suspendedOrders, ...retryError.suspendedOrders].map(
                (order) => [order.handle, order],
              ),
            );
            const suspendedOrders = [...suspendedOrdersByHandle.values()];
            if (
              isCurrentLifecycle() &&
              operationEpoch === mutationQueueEpoch &&
              generation === requestGeneration &&
              route === getRouteKey()
            ) {
              cachedRoute = route;
              cachedOrders = mergeWithCachedHistory(suspendedOrders, true);
              emitChange();
            }
            throw new ChaseOrderSuspensionError({
              suspendedOrders,
              failures: retryError.failures,
            });
          }
          if (retryError === timeout.error) {
            reconcileLateSuspension(controllerSuspension);
          }
          throw new ChaseOrderSuspensionError({
            suspendedOrders: error.suspendedOrders,
            failures: error.failures.map((failure) => ({
              ...failure,
              reason: retryError,
            })),
          });
        }
      }
    } catch (error) {
      if (error === timeout.error) {
        // Keep the caller bound while the fail-safe suspension finishes, then reconcile
        // through a fresh authoritative read. Never cache the late result.
        reconcileLateSuspension(controllerSuspension);
      }
      throw error;
    } finally {
      timeout.clear();
    }
    if (
      isCurrentLifecycle() &&
      operationEpoch === mutationQueueEpoch &&
      generation === requestGeneration &&
      route === getRouteKey()
    ) {
      cachedRoute = route;
      cachedOrders = mergeWithCachedHistory(result);
      emitChange();
      syncRefreshLifecycle();
    }
    return result;
  });
  mutationQueue = operation.then(
    () => undefined,
    () => undefined,
  );
  return await operation;
};

const getFreshChaseOrders = async ({
  canceledOrder,
  expectedRoute,
}: {
  canceledOrder?: ChaseOrder;
  expectedRoute?: string;
} = {}): Promise<ChaseOrder[]> => {
  if (!canRefreshCurrentRoute()) {
    throw new ChaseOrderRequestError('context_not_ready');
  }
  if (expectedRoute !== undefined && expectedRoute !== getRouteKey()) {
    throw new ChaseOrderRequestError('stale_request');
  }
  let result: ChaseOrder[] = [];
  const epoch = mutationQueueEpoch;
  const cancellationRoute = canceledOrder ? expectedRoute : undefined;
  const cancellationLifecycleGeneration = storeLifecycleGeneration;
  if (cancellationRoute) {
    cancellationReconciliationCounts.set(
      cancellationRoute,
      (cancellationReconciliationCounts.get(cancellationRoute) ?? 0) + 1,
    );
  }
  const operation = mutationQueue.then(async () => {
    if (
      epoch !== mutationQueueEpoch ||
      !canRefreshCurrentRoute() ||
      (expectedRoute !== undefined && expectedRoute !== getRouteKey())
    ) {
      throw new ChaseOrderRequestError('stale_request');
    }
    requestGeneration += 1;
    refreshPromise = undefined;
    result = await refreshChaseOrders(canceledOrder);
  });
  mutationQueue = operation.catch(() => undefined);
  try {
    await operation;
  } finally {
    if (
      cancellationRoute &&
      cancellationLifecycleGeneration === storeLifecycleGeneration
    ) {
      const remainingReconciliations = Math.max(
        0,
        (cancellationReconciliationCounts.get(cancellationRoute) ?? 0) - 1,
      );
      if (remainingReconciliations > 0) {
        cancellationReconciliationCounts.set(
          cancellationRoute,
          remainingReconciliations,
        );
      } else {
        cancellationReconciliationCounts.delete(cancellationRoute);
        const deferredEpoch =
          deferredCancellationRefreshEpochs.get(cancellationRoute);
        deferredCancellationRefreshEpochs.delete(cancellationRoute);
        if (deferredEpoch !== undefined) {
          const previousMutationQueue = mutationQueue;
          const deferredRefresh = previousMutationQueue.then(async () => {
            if (
              deferredEpoch !== mutationQueueEpoch ||
              cancellationRoute !== getRouteKey() ||
              !canRefreshCurrentRoute()
            ) {
              return;
            }
            requestGeneration += 1;
            refreshPromise = undefined;
            await refreshChaseOrders();
          });
          mutationQueue = deferredRefresh.catch(() => undefined);
        }
      }
    }
  }
  return result;
};

const subscribeToConnectionIdentity = (listener: () => void) =>
  PerpsConnectionManager.subscribeToInitializedUserContext(listener);
const getConnectionIdentitySnapshot = () =>
  PerpsConnectionManager.isSelectedUserContextReady();
const getServerConnectionIdentitySnapshot = () => false;

export function usePerpsChaseOrders({
  isEnabled,
  enableDiscovery = true,
}: {
  isEnabled: boolean;
  enableDiscovery?: boolean;
}) {
  const selectedAddress = useSelector(selectSelectedInternalAccountAddress);
  const activeProvider = useSelector(selectPerpsProvider);
  const perpsNetwork = useSelector(selectPerpsNetwork);
  const initializationState = useSelector(selectPerpsInitializationState);
  const connectionIdentityReady = useSyncExternalStore(
    subscribeToConnectionIdentity,
    getConnectionIdentitySnapshot,
    getServerConnectionIdentitySnapshot,
  );
  const wasEnabledRef = useRef(isEnabled);
  const isEnabledFallingEdge = wasEnabledRef.current && !isEnabled;
  const account = selectedAddress?.toLowerCase() ?? '';
  const route = `${account}:${activeProvider}:${perpsNetwork}`;
  const routeSnapshot = useCallback(
    () => (cachedRoute === route ? getSnapshot() : EMPTY_SNAPSHOT),
    [route],
  );
  const chaseSnapshot = useSyncExternalStore(
    subscribe,
    routeSnapshot,
    routeSnapshot,
  );
  const chaseOrders = chaseSnapshot.orders;
  useLayoutEffect(() => {
    const becameEnabled = isEnabled && !wasEnabledRef.current;
    const becameDisabled = !isEnabled && wasEnabledRef.current;
    wasEnabledRef.current = isEnabled;
    if (isEnabled) enabledConsumerCount += 1;
    syncRefreshLifecycle();
    if (enableDiscovery && becameEnabled) startRetainedDiscovery(true);
    if (
      enableDiscovery &&
      becameDisabled &&
      enabledConsumerCount === 0 &&
      initialRefreshRoute === getRouteKey()
    ) {
      setDiscoveryResolvedRoute('');
      startRetainedDiscovery(true);
    }
    return () => {
      if (isEnabled) {
        enabledConsumerCount = Math.max(0, enabledConsumerCount - 1);
      }
      syncRefreshLifecycle();
    };
  }, [enableDiscovery, isEnabled]);
  // Reset route-scoped state first so the initialization effect below can run
  // exactly one discovery read for the new route.
  useLayoutEffect(() => {
    selectedRoute = route;
    selectedProvider = activeProvider;
    if (cachedRoute === route) {
      syncRefreshLifecycle();
      return;
    }
    requestGeneration += 1;
    refreshPromise = undefined;
    refreshFailureLogged = false;
    resetDiscoveryState(route);
    cachedRoute = route;
    cachedOrders = [];
    aggregatedOmissionCounts.clear();
    setDiscoveryResolvedRoute('');
  }, [activeProvider, route]);
  useEffect(() => {
    if (!connectionIdentityReady) {
      requestGeneration += 1;
      refreshPromise = undefined;
      const retainedHistory =
        cachedRoute === route ? getBoundedTerminalHistory(cachedOrders) : [];
      cachedRoute = route;
      cachedOrders = retainedHistory;
      stopRefreshLifecycle();
      resetDiscoveryState(route);
      setDiscoveryResolvedRoute('');
      return;
    }
    syncRefreshLifecycle();
    if (enableDiscovery) startRetainedDiscovery(true);
  }, [connectionIdentityReady, enableDiscovery, route]);
  useEffect(() => {
    isControllerInitialized =
      initializationState === InitializationState.Initialized;
    if (initializationState !== InitializationState.Initialized) {
      requestGeneration += 1;
      refreshPromise = undefined;
      stopRefreshLifecycle();
      resetDiscoveryState(route);
      setDiscoveryResolvedRoute('');
      return;
    }
    syncRefreshLifecycle();
    if (enableDiscovery) startRetainedDiscovery();
  }, [connectionIdentityReady, enableDiscovery, initializationState, route]);
  const getChaseOrders = useCallback(
    async (): Promise<ChaseOrder[]> => await getFreshChaseOrders(),
    [],
  );

  const reconcileCanceledChaseOrder = useCallback(
    async (order: ChaseOrder): Promise<ChaseOrder[]> =>
      await getFreshChaseOrders({ canceledOrder: order, expectedRoute: route }),
    [route],
  );

  const suspendChaseOrders = useCallback(
    async (
      isCurrentLifecycle: () => boolean = () => true,
    ): Promise<ChaseOrder[]> =>
      await suspendAndCacheChaseOrders(isCurrentLifecycle),
    [],
  );

  return {
    chaseOrders,
    getChaseOrders,
    hasLiveChaseOrders: chaseOrders.some((order) =>
      CHASE_RETAINED_STATUSES.has(order.status),
    ),
    isChaseOrderDiscoveryResolved:
      !isEnabledFallingEdge && chaseSnapshot.discoveryResolvedRoute === route,
    reconcileCanceledChaseOrder,
    suspendChaseOrders,
  };
}

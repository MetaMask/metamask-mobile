import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useSyncExternalStore,
} from 'react';
import {
  ChaseOrderSuspensionError,
  InitializationState,
  PERPS_CONSTANTS,
  type ChaseOrder,
} from '@metamask/perps-controller';
import { AppState } from 'react-native';
import { useSelector } from 'react-redux';
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
let selectedProviderMode = '';
let initialRefreshRoute = '';
let isControllerInitialized = false;
let requestGeneration = 0;
let refreshPromise:
  | { route: string; generation: number; promise: Promise<ChaseOrder[]> }
  | undefined;
let mutationQueue: Promise<void> = Promise.resolve();
let mutationQueueEpoch = 0;
let refreshTimer: ReturnType<typeof setInterval> | undefined;
let invalidationUnsubscribe: (() => void) | undefined;
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
const mergeWithCachedHistory = (
  orders: ChaseOrder[],
  preserveMissingRetainedOrders = false,
): ChaseOrder[] => {
  const controllerHandles = new Set(orders.map((order) => order.handle));
  return [
    ...orders,
    ...(preserveMissingRetainedOrders
      ? cachedOrders.filter(
          (order) =>
            CHASE_RETAINED_STATUSES.has(order.status) &&
            !controllerHandles.has(order.handle),
        )
      : []),
    ...cachedOrders.filter(
      (order) =>
        CHASE_HISTORY_STATUSES.has(order.status) &&
        !controllerHandles.has(order.handle),
    ),
  ];
};

const emitChange = () => {
  storeSnapshot = {
    orders: cachedOrders,
    discoveryResolvedRoute: initialRefreshRoute,
  };
  listeners.forEach((listener) => listener());
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
    (enabledConsumerCount > 0 || hasLiveRetainedOrders());
  if (!shouldRefresh) {
    stopRefreshLifecycle();
    return;
  }
  invalidationUnsubscribe ??= PerpsCacheInvalidator.subscribe(
    'accountState',
    () => {
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
      (enabledConsumerCount > 0 || hasLiveRetainedOrders())
    ) {
      refreshChaseOrders().catch(() => undefined);
    }
  }, CHASE_ORDER_UI_CONFIG.RefreshIntervalMs);
}

async function refreshChaseOrders(): Promise<ChaseOrder[]> {
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
      if (isExpectedChaseOrderRequestError(error)) {
        Logger.log('Chase order refresh skipped', { code: error.code });
        throw error;
      }
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
    .then((orders) => {
      if (
        generation !== requestGeneration ||
        route !== getRouteKey() ||
        !canRefreshCurrentRoute()
      ) {
        throw new ChaseOrderRequestError('stale_request');
      }
      refreshFailureLogged = false;
      cachedRoute = route;
      // Controller v15 returns only successful aggregated reads and exposes no
      // completeness metadata. Preserve missing retained sessions; only an
      // empty response against a live cache is detectable as incomplete.
      const isIncompleteAggregatedRead =
        selectedProviderMode === 'aggregated' &&
        orders.length === 0 &&
        hasLiveRetainedOrders();
      cachedOrders = mergeWithCachedHistory(
        orders,
        selectedProviderMode === 'aggregated',
      );
      emitChange();
      syncRefreshLifecycle();
      if (isIncompleteAggregatedRead) {
        setDiscoveryResolvedRoute('');
        throw new Error('Aggregated Chase discovery returned no orders');
      }
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
  syncRefreshLifecycle();
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
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
  cachedRoute = '';
  cachedOrders = [];
  selectedRoute = '';
  selectedProviderMode = '';
  initialRefreshRoute = '';
  isControllerInitialized = false;
  refreshFailureLogged = false;
  enabledConsumerCount = 0;
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

const suspendAndCacheChaseOrders = async (
  isCurrentLifecycle: () => boolean,
): Promise<ChaseOrder[]> => {
  const previousMutationQueue = mutationQueue;
  const operation = Promise.resolve().then(async () => {
    if (!isCurrentLifecycle()) {
      await previousMutationQueue;
      return [];
    }
    mutationQueueEpoch += 1;
    const route = getRouteKey();
    const generation = ++requestGeneration;
    refreshPromise = undefined;
    const timeout = createMutationTimeout();
    let controllerSuspension =
      Engine.context.PerpsController.suspendChaseOrders();
    const reconcileLateSuspension = (suspension: Promise<ChaseOrder[]>) => {
      suspension
        .then(() => {
          if (route !== getRouteKey()) return;
          requestGeneration += 1;
          refreshPromise = undefined;
          setDiscoveryResolvedRoute('');
          if (!canRefreshCurrentRoute()) return;
          refreshChaseOrders()
            .then(() => setDiscoveryResolvedRoute(route))
            .catch(() => undefined);
        })
        .catch(() => undefined);
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

const getFreshChaseOrders = async (): Promise<ChaseOrder[]> => {
  if (!canRefreshCurrentRoute()) {
    throw new ChaseOrderRequestError('context_not_ready');
  }
  let result: ChaseOrder[] = [];
  const epoch = mutationQueueEpoch;
  const operation = mutationQueue.then(async () => {
    if (epoch !== mutationQueueEpoch || !canRefreshCurrentRoute()) {
      throw new ChaseOrderRequestError('stale_request');
    }
    requestGeneration += 1;
    refreshPromise = undefined;
    result = await refreshChaseOrders();
  });
  mutationQueue = operation.catch(() => undefined);
  await operation;
  return result;
};

const recordTerminalChaseOrder = (
  route: string,
  handle: string,
  status: ChaseOrder['status'],
) => {
  if (!CHASE_HISTORY_STATUSES.has(status)) return;
  const hasMatchingOrder = cachedOrders.some(
    (order) => order.handle === handle,
  );
  if (!hasMatchingOrder || cachedRoute !== route) return;
  cachedOrders = cachedOrders.map((order) =>
    order.handle === handle
      ? {
          ...order,
          status,
        }
      : order,
  );
  emitChange();
  syncRefreshLifecycle();
};

const subscribeToConnectionIdentity = (listener: () => void) =>
  PerpsConnectionManager.subscribeToInitializedUserContext(listener);
const getConnectionIdentitySnapshot = () =>
  PerpsConnectionManager.isSelectedUserContextReady();
const getServerConnectionIdentitySnapshot = () => false;

export function usePerpsChaseOrders({ isEnabled }: { isEnabled: boolean }) {
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
    if (becameEnabled) startRetainedDiscovery(true);
    if (
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
  }, [isEnabled]);
  // Reset route-scoped state first so the initialization effect below can run
  // exactly one discovery read for the new route.
  useEffect(() => {
    selectedRoute = route;
    selectedProviderMode = activeProvider ?? '';
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
    setDiscoveryResolvedRoute('');
  }, [activeProvider, route]);
  useEffect(() => {
    if (!connectionIdentityReady) {
      requestGeneration += 1;
      refreshPromise = undefined;
      const retainedHistory =
        cachedRoute === route
          ? cachedOrders.filter((order) =>
              CHASE_HISTORY_STATUSES.has(order.status),
            )
          : [];
      cachedRoute = route;
      cachedOrders = retainedHistory;
      stopRefreshLifecycle();
      resetDiscoveryState(route);
      setDiscoveryResolvedRoute('');
      return;
    }
    syncRefreshLifecycle();
    startRetainedDiscovery(true);
  }, [connectionIdentityReady, route]);
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
    startRetainedDiscovery();
  }, [connectionIdentityReady, initializationState, route]);
  const getChaseOrders = useCallback(
    async (): Promise<ChaseOrder[]> => await getFreshChaseOrders(),
    [],
  );

  const suspendChaseOrders = useCallback(
    async (
      isCurrentLifecycle: () => boolean = () => true,
    ): Promise<ChaseOrder[]> =>
      await suspendAndCacheChaseOrders(isCurrentLifecycle),
    [],
  );

  const recordChaseOrderStatus = useCallback(
    (handle: string, status: ChaseOrder['status']) =>
      recordTerminalChaseOrder(route, handle, status),
    [route],
  );

  return {
    chaseOrders,
    getChaseOrders,
    hasLiveChaseOrders: chaseOrders.some((order) =>
      CHASE_RETAINED_STATUSES.has(order.status),
    ),
    isChaseOrderDiscoveryResolved:
      !isEnabledFallingEdge && chaseSnapshot.discoveryResolvedRoute === route,
    recordChaseOrderStatus,
    suspendChaseOrders,
  };
}

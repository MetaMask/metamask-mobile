import { AppState, type NativeEventSubscription } from 'react-native';
import {
  QueryClient,
  focusManager,
  onlineManager,
  type DehydratedState,
} from '@tanstack/react-query';
import {
  addEventListener as addNetInfoEventListener,
  type NetInfoState,
} from '@react-native-community/netinfo';
import { createUIQueryClient } from '@metamask/react-data-query';
import Engine from '../Engine/Engine';
import { DATA_SERVICES } from '../../constants/data-services';

type DataServiceName = (typeof DATA_SERVICES)[number];

/**
 * The payload of a data service's granular `:cacheUpdated:${hash}` event.
 *
 * Mirrors `DataServiceGranularCacheUpdatedPayload` from
 * `@metamask/base-data-service`, which is only a transitive dependency (via
 * `@metamask/react-data-query`) and does not re-export this type. We redeclare
 * the (small, stable) shape locally to keep the adapter handler assignable to
 * what `createUIQueryClient` expects without depending on an internal module.
 */
type CacheUpdatedPayload =
  | { type: 'added' | 'updated'; state: DehydratedState }
  | { type: 'removed'; state: null };
type CacheUpdatedHandler = (payload: CacheUpdatedPayload) => void;

/**
 * A minimal, structural view of the root messenger that matches the shape
 * `createUIQueryClient` expects: it must at least be able to call any
 * data-service action and subscribe to any data-service granular
 * cache-updated event.
 *
 * The concrete messenger is bridged to this shape by {@link getMessengerView}.
 */
interface MessengerAdapter {
  /**
   * Call a data-service action on the root messenger.
   */
  call(
    actionType: `${DataServiceName}:${string}`,
    ...params: unknown[]
  ): Promise<unknown>;
  /**
   * Subscribe to a data-service granular cache-updated event.
   */
  subscribe(
    eventType: `${DataServiceName}:cacheUpdated:${string}`,
    handler: CacheUpdatedHandler,
  ): void;
  /**
   * Unsubscribe from a data-service granular cache-updated event.
   */
  unsubscribe(
    eventType: `${DataServiceName}:cacheUpdated:${string}`,
    handler: CacheUpdatedHandler,
  ): void;
}

/**
 * Return `Engine.controllerMessenger` viewed through the narrow
 * {@link MessengerAdapter} shape.
 *
 * The messenger's `call`/`subscribe`/`unsubscribe` are generic and bounded by
 * its own declared (literal) action/event unions, so they cannot accept the
 * open `${DataServiceName}:${string}` template that the adapter must expose.
 * Rather than assert on every call, we bridge once here. This is the same
 * capability-bridge pattern used by `BaseController` and by
 * `createUIQueryClient` itself.
 *
 * Resolving the messenger lazily (per call) is also required because
 * `Engine.controllerMessenger` is a proxy whose backing Engine may not exist
 * yet when this module is first imported.
 *
 * @returns The messenger as a {@link MessengerAdapter}.
 */
function getMessengerView(): MessengerAdapter {
  // Type assertion: bridges the messenger's literal-bounded generic methods to
  // the open template signatures the adapter exposes. `createUIQueryClient`
  // only ever invokes these with valid data-service actions/events, so the
  // assertion is safe.
  return Engine.controllerMessenger as unknown as MessengerAdapter;
}

const adapter: MessengerAdapter = {
  call(actionType, ...params) {
    return getMessengerView().call(actionType, ...params);
  },
  subscribe(eventType, handler) {
    getMessengerView().subscribe(eventType, handler);
  },
  unsubscribe(eventType, handler) {
    getMessengerView().unsubscribe(eventType, handler);
  },
};

export class ReactQueryService {
  queryClient: QueryClient;

  #appStateSubscription?: NativeEventSubscription;
  #netInfoUnsubscribe?: () => void;

  constructor() {
    this.queryClient = createUIQueryClient(DATA_SERVICES, adapter, {
      defaultOptions: {
        queries: {
          // Mobile users often trigger re-renders or navigate back/forth frequently.
          staleTime: 1000 * 60 * 5, // 5 minutes
          // On mobile, failures are often due to network drops.
          retry: 2,
          // Keep data in memory for longer.
          cacheTime: 1000 * 60 * 60 * 24, // 24 hours
        },
      },
    });

    this.#subscribeToAppFocusState();
    this.#subscribeToOnlineState();
  }

  /**
   * Tells React Query when the app moves to foreground / background
   * so it can trigger refetches on focus — React Query only provides
   * this automatically on web, not React Native.
   */
  #subscribeToAppFocusState(): void {
    this.#appStateSubscription = AppState.addEventListener(
      'change',
      (status) => {
        focusManager.setFocused(status === 'active');
      },
    );
  }

  /**
   * Syncs React Query's online status with the device's actual network
   * state via NetInfo — without this, React Query assumes the app is
   * always online in React Native environments.
   */
  #subscribeToOnlineState(): void {
    let unsubscribeNetInfo: (() => void) | undefined;

    onlineManager.setEventListener((setOnline) => {
      unsubscribeNetInfo?.();
      unsubscribeNetInfo = addNetInfoEventListener((state: NetInfoState) => {
        setOnline(!!state.isConnected);
      });
      return unsubscribeNetInfo;
    });

    this.#netInfoUnsubscribe = () => unsubscribeNetInfo?.();
  }

  destroy(): void {
    this.#appStateSubscription?.remove();
    this.#appStateSubscription = undefined;

    this.#netInfoUnsubscribe?.();
    this.#netInfoUnsubscribe = undefined;

    this.queryClient.clear();
  }
}

export default new ReactQueryService();

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
import type { RootExtendedMessenger } from '../Engine/types';
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
 * A minimal, structural view of the root messenger that matches the
 * `MessengerAdapter` shape expected by `createUIQueryClient`.
 *
 * We cannot pass `Engine.controllerMessenger` directly: it is exposed via a
 * proxy and the "real" Engine may not be constructed yet when this module is
 * imported by another file. So we wrap it in a lazy adapter that defers to the
 * proxy at call time.
 *
 * The underlying messenger's `call`/`subscribe`/`unsubscribe` are generic over
 * its own declared (literal) action/event unions and cannot express the open
 * `${DataServiceName}:${string}` template that the adapter must accept, so each
 * method bridges through a single localized cast. `createUIQueryClient` only
 * ever invokes these with valid data-service actions/events, so the cast is
 * safe.
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

const adapter: MessengerAdapter = {
  call(actionType, ...params) {
    // Type assertion: the messenger's generic `call` is bounded by its own
    // declared action literals and cannot accept the open template type.
    const messenger =
      Engine.controllerMessenger as unknown as RootExtendedMessenger;
    return Promise.resolve(
      (messenger.call as (type: string, ...args: unknown[]) => unknown)(
        actionType,
        ...params,
      ),
    );
  },
  subscribe(eventType, handler) {
    // Type assertion: the messenger's generic `subscribe` is bounded by its own
    // declared event literals and cannot accept the open template type.
    const messenger =
      Engine.controllerMessenger as unknown as RootExtendedMessenger;
    (messenger.subscribe as (type: string, cb: CacheUpdatedHandler) => void)(
      eventType,
      handler,
    );
  },
  unsubscribe(eventType, handler) {
    // Type assertion: the messenger's generic `unsubscribe` is bounded by its
    // own declared event literals and cannot accept the open template type.
    const messenger =
      Engine.controllerMessenger as unknown as RootExtendedMessenger;
    (messenger.unsubscribe as (type: string, cb: CacheUpdatedHandler) => void)(
      eventType,
      handler,
    );
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

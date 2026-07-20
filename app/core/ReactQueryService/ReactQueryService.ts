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
import type {
  GlobalActions,
  GlobalEvents,
  RootExtendedMessenger,
} from '../Engine/types';
import { DATA_SERVICES } from '../../constants/data-services';

type DataServiceName = (typeof DATA_SERVICES)[number];
type MessengerActionType = GlobalActions['type'];
type MessengerEventType = GlobalEvents['type'];

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
 * Wraps the root messenger to the messenger adapter shape that the
 * `createUIQueryClient` expects.
 *
 * Although `createUIQueryClient` takes a messenger, not just a messenger
 * adapter, we cannot pass `Engine.controllerMessenger` directly to it.
 * Despite its appearance, this is not a property; it is secretly a method
 * which expects `Engine` to have been initialized first before the root
 * messenger can be accessed. So we need to lazy-call
 * `Engine.controllerMessenger`.
 */
class MessengerAdapter {
  async call(
    actionType: `${DataServiceName}:${string}`,
    ...params: unknown[]
  ): Promise<unknown> {
    // Type assertion: We just have to assume that the root messenger supports
    // actions for any of the configured data services. There isn't a way to
    // resolve the literal template type we've declared above with the literal
    // string types in the types for RootExtendedMessenger.
    return Engine.controllerMessenger.call(
      actionType as MessengerActionType,
      // The parameters of a data-service action are not statically known here.
      ...(params as never),
    );
  }

  subscribe(
    eventType: `${DataServiceName}:cacheUpdated:${string}`,
    handler: CacheUpdatedHandler,
  ): void {
    // Type assertion: We just have to assume that the root messenger supports
    // the `:cacheUpdated:${hash}` event for any of the configured data
    // services. There isn't a way to resolve the literal template type we've
    // declared above with the literal string types in the types for
    // RootExtendedMessenger.
    Engine.controllerMessenger.subscribe(
      eventType as MessengerEventType,
      handler as never,
    );
  }

  unsubscribe(
    eventType: `${DataServiceName}:cacheUpdated:${string}`,
    handler: CacheUpdatedHandler,
  ): void {
    // Type assertion: We just have to assume that the root messenger supports
    // the `:cacheUpdated:${hash}` event for any of the configured data
    // services. There isn't a way to resolve the literal template type we've
    // declared above with the literal string types in the types for
    // RootExtendedMessenger.
    Engine.controllerMessenger.unsubscribe(
      eventType as MessengerEventType,
      handler as never,
    );
  }
}

const adapter = new MessengerAdapter();

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

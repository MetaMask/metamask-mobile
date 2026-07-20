import { AppState, type NativeEventSubscription } from 'react-native';
import type { DataServiceGranularCacheUpdatedPayload } from '@metamask/base-data-service';
import {
  QueryClient,
  focusManager,
  onlineManager,
} from '@tanstack/react-query';
import {
  addEventListener as addNetInfoEventListener,
  type NetInfoState,
} from '@react-native-community/netinfo';
import { createUIQueryClient } from '@metamask/react-data-query';
import Engine from '../Engine/Engine';
import type { GlobalActions } from '../Engine/types';
import { DATA_SERVICES } from '../../constants/data-services';
import { ExtractActionParameters } from '@metamask/messenger';

type DataServiceName = (typeof DATA_SERVICES)[number];

/**
 * Handles granular cache update events emitted by data services.
 */
type DataServiceGranularCacheUpdatedHandler = (
  payload: DataServiceGranularCacheUpdatedPayload,
) => void;

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
  call(
    actionType: Extract<GlobalActions['type'], `${DataServiceName}:${string}`>,
    ...params: ExtractActionParameters<
      GlobalActions,
      Extract<GlobalActions['type'], `${DataServiceName}:${string}`>
    >
  ): unknown {
    return Engine.controllerMessenger.call(actionType, ...params);
  }

  subscribe(
    eventType: `${DataServiceName}:cacheUpdated:${string}`,
    handler: DataServiceGranularCacheUpdatedHandler,
  ): void {
    Engine.controllerMessenger.subscribe(eventType, handler);
  }

  unsubscribe(
    eventType: `${DataServiceName}:cacheUpdated:${string}`,
    handler: DataServiceGranularCacheUpdatedHandler,
  ): void {
    Engine.controllerMessenger.unsubscribe(eventType, handler);
  }
}

export class ReactQueryService {
  queryClient: QueryClient;

  #appStateSubscription?: NativeEventSubscription;
  #netInfoUnsubscribe?: () => void;

  constructor() {
    const messengerAdapter = new MessengerAdapter();
    this.queryClient = createUIQueryClient(DATA_SERVICES, messengerAdapter, {
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

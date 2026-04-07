import { AppState, type NativeEventSubscription } from 'react-native';
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
import { Json } from '@metamask/utils';
import { MessengerActions, MessengerEvents } from '@metamask/messenger';
import Engine from '../Engine/Engine';
import { RootMessenger } from '../Engine/types';
import { DATA_SERVICES } from '../../constants/data-services';

type ActionType = MessengerActions<RootMessenger>['type'];
type EventType = MessengerEvents<RootMessenger>['type'];

type JsonSubscriptionCallback = (data: Json) => void;

const adapter = {
  call: async (method: string, ...params: Json[]) =>
    // @ts-expect-error Target requires 1 element(s) but source may have fewer.
    Engine.controllerMessenger.call(method as ActionType, ...params) as Json,
  subscribe: (event: string, callback: JsonSubscriptionCallback) => {
    Engine.controllerMessenger.subscribe(event as EventType, callback);
  },
  unsubscribe: (event: string, callback: JsonSubscriptionCallback) => {
    Engine.controllerMessenger.unsubscribe(event as EventType, callback);
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

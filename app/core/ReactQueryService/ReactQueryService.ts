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
import { DataServiceGranularCacheUpdatedPayload } from '@metamask/base-data-service';
import { withFreshMoneyBalanceOptions } from './moneyBalanceFreshWindow';

type ActionType = MessengerActions<RootMessenger>['type'];
type EventType = MessengerEvents<RootMessenger>['type'];

type DataServiceHandler = (
  data: DataServiceGranularCacheUpdatedPayload,
) => void;

/**
 * The UI query adapter forwards JSON args from query keys. That cannot be
 * checked against the root messenger's action-arg union, so the call is typed
 * to the adapter's contract instead.
 */
type DataServiceMessengerCall = (
  method: ActionType,
  ...params: Json[]
) => Promise<Json> | Json;

const callDataService = Engine.controllerMessenger
  .call as DataServiceMessengerCall;

const adapter = {
  call: async (method: string, ...params: Json[]) =>
    callDataService(
      method as ActionType,
      ...withFreshMoneyBalanceOptions(method, params),
    ),
  subscribe: (event: string, callback: DataServiceHandler) => {
    Engine.controllerMessenger.subscribe(event as EventType, callback);
  },
  unsubscribe: (event: string, callback: DataServiceHandler) => {
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
          gcTime: 1000 * 60 * 60 * 24, // 24 hours
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

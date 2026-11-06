import { AppState, type AppStateStatus } from 'react-native';
import {
  addEventListener as addNetInfoEventListener,
  type NetInfoState,
} from '@react-native-community/netinfo';
import Logger from '../../../../util/Logger';
import type { RootExtendedMessenger } from '../../types';

/**
 * Minimum time between foreground-triggered refreshes. iOS also reports
 * `inactive` -> `active` for system overlays (Control Center, Face ID), so
 * this keeps frequent app switching from turning into one request per switch.
 */
export const FOREGROUND_REFRESH_THROTTLE_MS = 30_000;

/**
 * Delay after a network change before refreshing. Collapses NetInfo bursts
 * and gives a newly connected VPN time to route traffic.
 */
export const NETWORK_CHANGE_DEBOUNCE_MS = 1_500;

export interface GeolocationRefreshOptions {
  /**
   * Whether refreshes are allowed right now (basic functionality). Read on
   * every trigger so toggles apply immediately.
   */
  isEnabled: () => boolean;
}

const isOnline = (state: NetInfoState): boolean =>
  state.isInternetReachable ?? state.isConnected ?? false;

const getNetworkSignature = (state: NetInfoState): string =>
  `${state.type}:${isOnline(state)}`;

/**
 * Keeps geolocation current for the whole app without a restart, so turning a
 * VPN on or off (or travelling) updates geo-gated features in place.
 *
 * Re-fetches the location, bypassing the service cache, when the network
 * changes (connection type or online status), when the app returns to the
 * foreground (throttled), and on unlock when a trigger was skipped while
 * locked. NetInfo catches Wi-Fi/cellular switches and Android VPNs, but emits
 * nothing for a VPN on the same Wi-Fi on iOS, so the foreground trigger is the
 * reliable signal there: toggling a VPN means leaving the app.
 *
 * Consumers react to the new location through GeolocationController state.
 *
 * @param messenger - Root Engine messenger.
 * @param options - Refresh options.
 * @param options.isEnabled - Whether refreshes are currently allowed.
 * @returns A function that removes the AppState and NetInfo listeners.
 * Messenger subscriptions are cleared with the rest of the Engine.
 */
export function registerGeolocationRefresh(
  messenger: RootExtendedMessenger,
  { isEnabled }: GeolocationRefreshOptions,
): () => void {
  let appState: AppStateStatus = AppState.currentState;
  // GeolocationController already fetches on Engine start.
  let lastRefreshAt = Date.now();
  let isRefreshPendingUnlock = false;
  let networkSignature: string | undefined;
  let networkChangeTimer: ReturnType<typeof setTimeout> | undefined;

  const refresh = () => {
    if (!isEnabled() || appState !== 'active') {
      return;
    }

    if (!messenger.call('KeyringController:getState').isUnlocked) {
      isRefreshPendingUnlock = true;
      return;
    }

    isRefreshPendingUnlock = false;
    lastRefreshAt = Date.now();
    messenger
      .call('GeolocationController:refreshGeolocation')
      .catch((error: unknown) =>
        Logger.log('Geolocation refresh failed: ', error),
      );
  };

  const appStateSubscription = AppState.addEventListener(
    'change',
    (nextAppState: AppStateStatus) => {
      const cameToForeground =
        nextAppState === 'active' && appState !== 'active';
      appState = nextAppState;

      if (
        cameToForeground &&
        Date.now() - lastRefreshAt >= FOREGROUND_REFRESH_THROTTLE_MS
      ) {
        refresh();
      }
    },
  );

  const removeNetInfoListener = addNetInfoEventListener(
    (state: NetInfoState) => {
      const nextSignature = getNetworkSignature(state);
      const hasChanged =
        networkSignature !== undefined && nextSignature !== networkSignature;
      networkSignature = nextSignature;

      if (!hasChanged || !isOnline(state)) {
        return;
      }

      clearTimeout(networkChangeTimer);
      networkChangeTimer = setTimeout(refresh, NETWORK_CHANGE_DEBOUNCE_MS);
    },
  );

  messenger.subscribe('KeyringController:unlock', () => {
    if (isRefreshPendingUnlock) {
      refresh();
    }
  });

  return () => {
    clearTimeout(networkChangeTimer);
    appStateSubscription.remove();
    removeNetInfoListener();
  };
}

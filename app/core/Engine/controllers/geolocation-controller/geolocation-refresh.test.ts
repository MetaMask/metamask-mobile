import { AppState, type AppStateStatus } from 'react-native';
import {
  addEventListener as addNetInfoEventListener,
  type NetInfoState,
} from '@react-native-community/netinfo';
import type { GeolocationControllerState } from '@metamask/geolocation-controller';
import type { RootExtendedMessenger } from '../../types';
import {
  FOREGROUND_REFRESH_THROTTLE_MS,
  NETWORK_CHANGE_DEBOUNCE_MS,
  registerGeolocationRefresh,
} from './geolocation-refresh';

jest.mock('../../../../util/Logger', () => ({
  log: jest.fn(),
}));

const mockAddAppStateListener = AppState.addEventListener as jest.Mock;
const mockAddNetInfoListener = addNetInfoEventListener as jest.Mock;

const createNetInfoState = (
  type: string,
  isInternetReachable: boolean | null = true,
): NetInfoState =>
  ({
    type,
    isConnected: true,
    isInternetReachable,
    details: null,
  }) as unknown as NetInfoState;

const createGeolocationState = (location: string): GeolocationControllerState =>
  ({ location }) as GeolocationControllerState;

interface SetupOptions {
  isEnabled?: boolean;
  isUnlocked?: boolean;
}

const setup = ({ isEnabled = true, isUnlocked = true }: SetupOptions = {}) => {
  let appStateListener: (state: AppStateStatus) => void = () => undefined;
  let netInfoListener: (state: NetInfoState) => void = () => undefined;
  const removeAppStateListener = jest.fn();
  const removeNetInfoListener = jest.fn();
  mockAddAppStateListener.mockImplementation((_event, listener) => {
    appStateListener = listener;
    return { remove: removeAppStateListener };
  });
  mockAddNetInfoListener.mockImplementation((listener) => {
    netInfoListener = listener;
    return removeNetInfoListener;
  });

  const keyringState = { isUnlocked };
  const call = jest.fn((action: string) => {
    if (action === 'KeyringController:getState') {
      return keyringState;
    }
    return Promise.resolve();
  });
  const subscribe = jest.fn();
  const messenger = { call, subscribe } as unknown as RootExtendedMessenger;
  const options = { isEnabled: jest.fn(() => isEnabled) };

  const stop = registerGeolocationRefresh(messenger, options);

  const getSubscription = (eventName: string) =>
    subscribe.mock.calls.find(([name]) => name === eventName);

  const countCalls = (action: string) =>
    call.mock.calls.filter(([name]) => name === action).length;

  return {
    stop,
    call,
    options,
    keyringState,
    removeAppStateListener,
    removeNetInfoListener,
    countRefreshes: () =>
      countCalls('GeolocationController:refreshGeolocation'),
    countEligibilityRefreshes: () =>
      countCalls('PerpsController:refreshEligibility'),
    emitAppState: (state: AppStateStatus) => appStateListener(state),
    emitNetInfo: (state: NetInfoState) => netInfoListener(state),
    emitUnlock: () => getSubscription('KeyringController:unlock')?.[1](),
    getLocationSubscription: () =>
      getSubscription('GeolocationController:stateChange'),
  };
};

const returnToForeground = (emitAppState: (state: AppStateStatus) => void) => {
  emitAppState('background');
  emitAppState('active');
};

describe('registerGeolocationRefresh', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    (AppState as { currentState: AppStateStatus }).currentState = 'active';
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('app foreground', () => {
    it('refreshes geolocation when the app returns after the throttle window', () => {
      const { emitAppState, countRefreshes } = setup();
      jest.advanceTimersByTime(FOREGROUND_REFRESH_THROTTLE_MS);

      returnToForeground(emitAppState);

      expect(countRefreshes()).toBe(1);
    });

    it('refreshes geolocation when the app returns from a system overlay', () => {
      const { emitAppState, countRefreshes } = setup();
      jest.advanceTimersByTime(FOREGROUND_REFRESH_THROTTLE_MS);

      emitAppState('inactive');
      emitAppState('active');

      expect(countRefreshes()).toBe(1);
    });

    it('skips the refresh within the throttle window', () => {
      const { emitAppState, countRefreshes } = setup();
      jest.advanceTimersByTime(FOREGROUND_REFRESH_THROTTLE_MS);
      returnToForeground(emitAppState);
      jest.advanceTimersByTime(FOREGROUND_REFRESH_THROTTLE_MS - 1);

      returnToForeground(emitAppState);

      expect(countRefreshes()).toBe(1);
    });

    it('skips the refresh within the throttle window after Engine start', () => {
      const { emitAppState, countRefreshes } = setup();

      returnToForeground(emitAppState);

      expect(countRefreshes()).toBe(0);
    });

    it('skips the refresh when refreshes are disabled', () => {
      const { emitAppState, countRefreshes } = setup({ isEnabled: false });
      jest.advanceTimersByTime(FOREGROUND_REFRESH_THROTTLE_MS);

      returnToForeground(emitAppState);

      expect(countRefreshes()).toBe(0);
    });
  });

  describe('network change', () => {
    it('refreshes geolocation once after a burst of network changes', () => {
      const { emitNetInfo, countRefreshes } = setup();
      emitNetInfo(createNetInfoState('wifi'));

      emitNetInfo(createNetInfoState('vpn'));
      emitNetInfo(createNetInfoState('cellular'));
      jest.advanceTimersByTime(NETWORK_CHANGE_DEBOUNCE_MS);

      expect(countRefreshes()).toBe(1);
    });

    it('waits for the debounce delay before refreshing', () => {
      const { emitNetInfo, countRefreshes } = setup();
      emitNetInfo(createNetInfoState('wifi'));

      emitNetInfo(createNetInfoState('vpn'));
      jest.advanceTimersByTime(NETWORK_CHANGE_DEBOUNCE_MS - 1);

      expect(countRefreshes()).toBe(0);
    });

    it('ignores the initial NetInfo state', () => {
      const { emitNetInfo, countRefreshes } = setup();

      emitNetInfo(createNetInfoState('wifi'));
      jest.advanceTimersByTime(NETWORK_CHANGE_DEBOUNCE_MS);

      expect(countRefreshes()).toBe(0);
    });

    it('ignores NetInfo updates that keep the same type and online status', () => {
      const { emitNetInfo, countRefreshes } = setup();
      emitNetInfo(createNetInfoState('wifi', null));

      emitNetInfo(createNetInfoState('wifi', true));
      jest.advanceTimersByTime(NETWORK_CHANGE_DEBOUNCE_MS);

      expect(countRefreshes()).toBe(0);
    });

    it('skips the refresh when the device goes offline', () => {
      const { emitNetInfo, countRefreshes } = setup();
      emitNetInfo(createNetInfoState('wifi'));

      emitNetInfo(createNetInfoState('none', false));
      jest.advanceTimersByTime(NETWORK_CHANGE_DEBOUNCE_MS);

      expect(countRefreshes()).toBe(0);
    });

    it('refreshes geolocation when the device comes back online', () => {
      const { emitNetInfo, countRefreshes } = setup();
      emitNetInfo(createNetInfoState('none', false));

      emitNetInfo(createNetInfoState('wifi'));
      jest.advanceTimersByTime(NETWORK_CHANGE_DEBOUNCE_MS);

      expect(countRefreshes()).toBe(1);
    });

    it('skips the refresh while the app is in the background', () => {
      const { emitAppState, emitNetInfo, countRefreshes } = setup();
      emitNetInfo(createNetInfoState('wifi'));
      emitAppState('background');

      emitNetInfo(createNetInfoState('cellular'));
      jest.advanceTimersByTime(NETWORK_CHANGE_DEBOUNCE_MS);

      expect(countRefreshes()).toBe(0);
    });
  });

  describe('wallet lock', () => {
    it('defers a refresh while locked and runs it on unlock', () => {
      const { emitAppState, emitUnlock, keyringState, countRefreshes } = setup({
        isUnlocked: false,
      });
      jest.advanceTimersByTime(FOREGROUND_REFRESH_THROTTLE_MS);
      returnToForeground(emitAppState);
      keyringState.isUnlocked = true;

      emitUnlock();

      expect(countRefreshes()).toBe(1);
    });

    it('does not refresh on unlock when no refresh was deferred', () => {
      const { emitUnlock, countRefreshes } = setup();

      emitUnlock();

      expect(countRefreshes()).toBe(0);
    });
  });

  describe('location change', () => {
    it('subscribes to location changes only', () => {
      const { getLocationSubscription } = setup();
      const selector = getLocationSubscription()?.[2];

      const selected = selector(createGeolocationState('FR'));

      expect(selected).toBe('FR');
    });

    it('refreshes Perps eligibility when the location changes', () => {
      const { getLocationSubscription, countEligibilityRefreshes } = setup();
      const handler = getLocationSubscription()?.[1];

      handler('FR', 'US');

      expect(countEligibilityRefreshes()).toBe(1);
    });

    it('does not refresh Perps eligibility when refreshes are disabled', () => {
      const { getLocationSubscription, countEligibilityRefreshes } = setup({
        isEnabled: false,
      });
      const handler = getLocationSubscription()?.[1];

      handler('FR', 'US');

      expect(countEligibilityRefreshes()).toBe(0);
    });
  });

  describe('cleanup', () => {
    it('removes the AppState and NetInfo listeners', () => {
      const { stop, removeAppStateListener, removeNetInfoListener } = setup();

      stop();

      expect(removeAppStateListener).toHaveBeenCalledTimes(1);
      expect(removeNetInfoListener).toHaveBeenCalledTimes(1);
    });

    it('cancels a pending network-change refresh', () => {
      const { stop, emitNetInfo, countRefreshes } = setup();
      emitNetInfo(createNetInfoState('wifi'));
      emitNetInfo(createNetInfoState('vpn'));

      stop();
      jest.advanceTimersByTime(NETWORK_CHANGE_DEBOUNCE_MS);

      expect(countRefreshes()).toBe(0);
    });
  });
});

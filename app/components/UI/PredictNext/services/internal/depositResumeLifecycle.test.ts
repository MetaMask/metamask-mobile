import type { AppStateStatus } from 'react-native';
import type { NetInfoState } from '@react-native-community/netinfo';
import { bindDepositResumeLifecycle } from './depositResumeLifecycle';

const setup = (
  initial: {
    kalshiActive?: boolean;
    unlocked?: boolean;
    signedIn?: boolean;
    appState?: AppStateStatus;
  } = {},
) => {
  let kalshiActive = initial.kalshiActive ?? true;
  let unlocked = initial.unlocked ?? true;
  let signedIn = initial.signedIn ?? true;
  let sessionChanged: () => void = () => undefined;
  let appChanged: (state: AppStateStatus) => void = () => undefined;
  let networkChanged: (state: NetInfoState) => void = () => undefined;
  const service = {
    resumeDeposits: jest.fn().mockResolvedValue(undefined),
    stopDepositPolling: jest.fn(),
    setDepositNetworkTier: jest.fn(),
  };
  const removeSession = jest.fn();
  const removeApp = jest.fn();
  const removeNetwork = jest.fn();

  const cleanup = bindDepositResumeLifecycle({
    service,
    isKalshiActive: () => kalshiActive,
    isUnlocked: () => unlocked,
    isSignedIn: () => signedIn,
    subscribeSession: (listener) => {
      sessionChanged = listener;
      return removeSession;
    },
    appState: {
      currentState: initial.appState ?? 'active',
      addEventListener: jest.fn((_event, listener) => {
        appChanged = listener;
        return { remove: removeApp };
      }),
    },
    network: {
      addEventListener: jest.fn((listener) => {
        networkChanged = listener;
        return removeNetwork;
      }),
    },
  });

  return {
    service,
    cleanup,
    removeSession,
    removeApp,
    removeNetwork,
    setKalshiActive: (next: boolean) => {
      kalshiActive = next;
      sessionChanged();
    },
    setUnlocked: (next: boolean) => {
      unlocked = next;
      sessionChanged();
    },
    setSignedIn: (next: boolean) => {
      signedIn = next;
      sessionChanged();
    },
    app: (state: AppStateStatus) => appChanged(state),
    network: (state: unknown) => networkChanged(state as NetInfoState),
  };
};

describe('bindDepositResumeLifecycle', () => {
  it('resumes immediately when Kalshi is active, unlocked, signed in, and foregrounded', () => {
    const harness = setup();

    expect(harness.service.resumeDeposits).toHaveBeenCalledTimes(1);

    harness.cleanup();
    expect(harness.removeSession).toHaveBeenCalledTimes(1);
    expect(harness.removeApp).toHaveBeenCalledTimes(1);
    expect(harness.removeNetwork).toHaveBeenCalledTimes(1);
    expect(harness.service.stopDepositPolling).toHaveBeenCalledTimes(1);
  });

  it('does not resume when locked, signed out, or on another venue', () => {
    const harness = setup({
      kalshiActive: false,
      unlocked: false,
      signedIn: false,
    });

    expect(harness.service.resumeDeposits).not.toHaveBeenCalled();

    harness.setUnlocked(true);
    harness.setSignedIn(true);
    expect(harness.service.resumeDeposits).not.toHaveBeenCalled();

    harness.setKalshiActive(true);
    expect(harness.service.resumeDeposits).toHaveBeenCalledTimes(1);

    harness.service.stopDepositPolling.mockClear();
    harness.setKalshiActive(false);
    expect(harness.service.stopDepositPolling).toHaveBeenCalledTimes(1);

    harness.cleanup();
  });

  it('stops polling in background and resumes on foreground active', () => {
    const harness = setup();
    harness.service.resumeDeposits.mockClear();
    harness.service.stopDepositPolling.mockClear();

    harness.app('background');
    expect(harness.service.stopDepositPolling).toHaveBeenCalledTimes(1);

    harness.app('active');
    expect(harness.service.resumeDeposits).toHaveBeenCalledTimes(1);

    harness.cleanup();
  });

  it('forwards network tier changes from NetInfo', () => {
    const harness = setup();

    harness.network({
      type: 'none',
      isConnected: false,
      isInternetReachable: false,
      details: null,
    });
    expect(harness.service.setDepositNetworkTier).toHaveBeenLastCalledWith(
      'NONE',
    );

    harness.network({
      type: 'cellular',
      isConnected: true,
      isInternetReachable: true,
      details: { cellularGeneration: '2g' },
    });
    expect(harness.service.setDepositNetworkTier).toHaveBeenLastCalledWith(
      'SLOW_CELLULAR',
    );

    harness.network({
      type: 'wifi',
      isConnected: true,
      isInternetReachable: true,
      details: null,
    });
    expect(harness.service.setDepositNetworkTier).toHaveBeenLastCalledWith(
      'WIFI',
    );

    harness.cleanup();
  });
});

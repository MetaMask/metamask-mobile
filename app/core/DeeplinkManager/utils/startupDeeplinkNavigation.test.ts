import { checkForDeeplink } from '../../../actions/user';
import { StackActions } from '@react-navigation/native';
import { InteractionManager } from 'react-native';
import Routes from '../../../constants/navigation/Routes';
import AppConstants from '../../AppConstants';
import { AppStateEventProcessor } from '../../AppStateEventListener';
import {
  navigateToPostUnlockHome,
  navigateToPendingStartupDeeplink,
  retryPendingDeeplinkAfterDefaultNavigation,
  consumeNextParseAppStartType,
  resetNextParseAppStartTypeForTesting,
} from './startupDeeplinkNavigation';
import {
  rememberUnlockAppStartType,
  resetUnlockAppStartTypeForTesting,
} from '../../Performance/unlockTraces';
import {
  setWalletLockedAt,
  setWalletLockExpiredRoute,
  resetWalletLockedAtForTesting,
} from '../../../util/navigation/walletLockClock';
import type { DeeplinkIntent } from '../types/DeeplinkIntent';

jest
  .spyOn(InteractionManager, 'runAfterInteractions')
  .mockImplementation((callback) => {
    if (typeof callback === 'function') {
      callback();
    }
    return { cancel: jest.fn() } as ReturnType<
      typeof InteractionManager.runAfterInteractions
    >;
  });

const mockDispatch = jest.fn();
const mockReset = jest.fn();
const mockNavigationDispatch = jest.fn();
const mockTrackRouteRestoreEvaluated = jest.fn();
let mockRestoreSettings = {
  enabled: false,
  restoreWindowMs: 300_000,
};
let mockRootState: unknown = { index: 0, routes: [{ name: 'Login' }] };
const mockResolve = jest.fn();
const mockExecuteStartupDeeplinkIntent = jest.fn();
const mockClearPendingDeeplink = jest.fn();
const mockRequestAnimationFrame = jest.fn(
  (callback: FrameRequestCallback): number => {
    callback(0);
    return 0;
  },
);
const originalRequestAnimationFrame = global.requestAnimationFrame;

const setRequestAnimationFrame = (
  value: typeof global.requestAnimationFrame,
) => {
  Object.defineProperty(global, 'requestAnimationFrame', {
    configurable: true,
    value,
    writable: true,
  });
};

jest.mock('../../redux', () => ({
  __esModule: true,
  default: {
    store: {
      dispatch: (action: unknown) => mockDispatch(action),
      getState: () => ({}),
    },
  },
}));

jest.mock('../../NavigationService', () => ({
  __esModule: true,
  default: {
    navigation: {
      reset: (...args: unknown[]) => mockReset(...args),
      dispatch: (...args: unknown[]) => mockNavigationDispatch(...args),
      getRootState: () => mockRootState,
    },
  },
}));

jest.mock('../../../selectors/featureFlagController/routeRestoration', () => ({
  selectRouteRestorationSettings: () => mockRestoreSettings,
}));

jest.mock('../../../util/navigation/walletLockClock', () => {
  let lockedAt: number | null = null;
  let expiredRoute: string | null = null;
  return {
    getWalletLockedAt: () => lockedAt,
    setWalletLockedAt: (value: number | null) => {
      lockedAt = value;
      if (value === null) {
        expiredRoute = null;
      }
    },
    getWalletLockExpiredRoute: () => expiredRoute,
    setWalletLockExpiredRoute: (value: string | null) => {
      expiredRoute = value;
    },
    resetWalletLockedAtForTesting: () => {
      lockedAt = null;
      expiredRoute = null;
    },
  };
});

const mockCancelRestoreWindowExpiry = jest.fn();
jest.mock('../../../util/navigation/restoreWindowExpiry', () => ({
  cancelRestoreWindowExpiry: () => mockCancelRestoreWindowExpiry(),
}));

const mockSetWalletLocked = jest.fn();
jest.mock('../../WalletLockLifecycle', () => ({
  setWalletLocked: (...args: unknown[]) => mockSetWalletLocked(...args),
}));

jest.mock('../../../util/analytics/routeRestoreTracking', () => ({
  trackRouteRestoreEvaluated: (...args: unknown[]) =>
    mockTrackRouteRestoreEvaluated(...args),
}));

jest.mock('../DeeplinkManager', () => ({
  __esModule: true,
  default: {
    resolve: (...args: unknown[]) => mockResolve(...args),
  },
}));

const mockExecuteDeeplinkIntent = jest.fn();
jest.mock('./executeDeeplinkIntent', () => ({
  executeStartupDeeplinkIntent: (intent: DeeplinkIntent) =>
    mockExecuteStartupDeeplinkIntent(intent),
  executeDeeplinkIntent: (intent: DeeplinkIntent) =>
    mockExecuteDeeplinkIntent(intent),
}));

jest.mock('../../AppStateEventListener', () => {
  const appStateEventProcessorMock = {
    pendingDeeplink: null as string | null,
    pendingDeeplinkSource: null as string | null,
    clearPendingDeeplink: jest.fn(() => {
      appStateEventProcessorMock.pendingDeeplink = null;
      appStateEventProcessorMock.pendingDeeplinkSource = null;
      mockClearPendingDeeplink();
    }),
  };

  return { AppStateEventProcessor: appStateEventProcessorMock };
});

jest.mock('../../../util/Logger', () => ({
  error: jest.fn(),
}));

const mockStartDeeplinkNavigatedTrace = jest.fn();
const mockCancelDeeplinkNavigatedTrace = jest.fn();
const mockCancelDeeplinkProcessedTrace = jest.fn();
jest.mock('../../Performance/DeeplinkPerformance', () => ({
  startDeeplinkNavigatedTrace: (...args: unknown[]) =>
    mockStartDeeplinkNavigatedTrace(...args),
  cancelDeeplinkNavigatedTrace: (...args: unknown[]) =>
    mockCancelDeeplinkNavigatedTrace(...args),
  cancelDeeplinkProcessedTrace: (...args: unknown[]) =>
    mockCancelDeeplinkProcessedTrace(...args),
}));

describe('startupDeeplinkNavigation', () => {
  const intent: DeeplinkIntent = {
    target: {
      type: 'home-tab',
      routeName: 'RewardsView',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    resetNextParseAppStartTypeForTesting();
    resetUnlockAppStartTypeForTesting();
    AppStateEventProcessor.pendingDeeplink = null;
    AppStateEventProcessor.pendingDeeplinkSource = null;
    setRequestAnimationFrame(mockRequestAnimationFrame);
    mockResolve.mockResolvedValue(intent);
    mockExecuteStartupDeeplinkIntent.mockResolvedValue(true);
    mockExecuteDeeplinkIntent.mockResolvedValue(undefined);
    mockRestoreSettings = {
      enabled: false,
      restoreWindowMs: 300_000,
    };
    mockRootState = { index: 0, routes: [{ name: 'Login' }] };
    resetWalletLockedAtForTesting();
  });

  afterEach(() => {
    setRequestAnimationFrame(originalRequestAnimationFrame);
  });

  it('does nothing when there is no pending deeplink', async () => {
    await expect(navigateToPendingStartupDeeplink()).resolves.toBe(false);

    expect(mockResolve).not.toHaveBeenCalled();
    expect(mockExecuteStartupDeeplinkIntent).not.toHaveBeenCalled();
    expect(mockClearPendingDeeplink).not.toHaveBeenCalled();
  });

  it('resolves, executes, and clears a handled startup deeplink', async () => {
    AppStateEventProcessor.pendingDeeplink = 'https://link.metamask.io/rewards';

    await expect(navigateToPendingStartupDeeplink()).resolves.toBe(true);

    expect(mockResolve).toHaveBeenCalledWith(
      'https://link.metamask.io/rewards',
      {
        origin: AppConstants.DEEPLINKS.ORIGIN_DEEPLINK,
        appStartType: 'cold',
      },
    );
    expect(mockExecuteStartupDeeplinkIntent).toHaveBeenCalledWith(intent);
    expect(mockClearPendingDeeplink).toHaveBeenCalledTimes(1);
  });

  it('navigates on the mounted session tree instead of the startup reset when HomeNav is alive', async () => {
    AppStateEventProcessor.pendingDeeplink = 'https://link.metamask.io/rewards';
    mockRootState = {
      key: 'root',
      index: 0,
      routes: [
        {
          name: Routes.ONBOARDING.HOME_NAV,
          key: 'home-nav',
          state: {
            key: 'home-nav',
            index: 0,
            routes: [{ name: Routes.PERPS.ROOT, key: 'perps' }],
          },
        },
      ],
    };

    await expect(navigateToPendingStartupDeeplink()).resolves.toBe(true);

    expect(mockNavigationDispatch).toHaveBeenCalledWith(
      StackActions.popTo(Routes.ONBOARDING.HOME_NAV),
    );
    expect(mockExecuteDeeplinkIntent).toHaveBeenCalledWith(intent);
    expect(mockExecuteStartupDeeplinkIntent).not.toHaveBeenCalled();
    expect(mockReset).not.toHaveBeenCalled();
    expect(mockClearPendingDeeplink).toHaveBeenCalledTimes(1);
  });

  it('preserves the pending deeplink source while resolving', async () => {
    AppStateEventProcessor.pendingDeeplink = 'https://link.metamask.io/rewards';
    AppStateEventProcessor.pendingDeeplinkSource =
      AppConstants.DEEPLINKS.ORIGIN_PUSH_NOTIFICATION;

    await navigateToPendingStartupDeeplink();

    expect(mockResolve).toHaveBeenCalledWith(
      'https://link.metamask.io/rewards',
      {
        origin: AppConstants.DEEPLINKS.ORIGIN_PUSH_NOTIFICATION,
        appStartType: 'cold',
      },
    );
  });

  it('keeps the pending deeplink when no startup intent can be resolved', async () => {
    AppStateEventProcessor.pendingDeeplink = 'https://link.metamask.io/swap';
    mockResolve.mockResolvedValueOnce(null);

    await expect(navigateToPendingStartupDeeplink()).resolves.toBe(false);

    expect(mockExecuteStartupDeeplinkIntent).not.toHaveBeenCalled();
    expect(mockClearPendingDeeplink).not.toHaveBeenCalled();
  });

  it('clears the pending deeplink when startup resolution is rejected by the user', async () => {
    AppStateEventProcessor.pendingDeeplink = 'https://link.metamask.io/rewards';
    mockResolve.mockResolvedValueOnce(false);

    await expect(navigateToPendingStartupDeeplink()).resolves.toBe(false);

    expect(mockExecuteStartupDeeplinkIntent).not.toHaveBeenCalled();
    expect(mockClearPendingDeeplink).toHaveBeenCalledTimes(1);
  });

  it('starts Deeplink Navigated as a fallback for saga-driven auto-unlock', async () => {
    AppStateEventProcessor.pendingDeeplink = 'https://link.metamask.io/rewards';

    await navigateToPendingStartupDeeplink();

    expect(mockStartDeeplinkNavigatedTrace).toHaveBeenCalledWith({
      url: 'https://link.metamask.io/rewards',
      source: 'unlock',
      appStartType: 'cold',
    });
  });

  it('cancels both deeplink traces when startup navigation throws', async () => {
    AppStateEventProcessor.pendingDeeplink = 'https://link.metamask.io/rewards';
    mockExecuteStartupDeeplinkIntent.mockRejectedValueOnce(
      new Error('reset failed'),
    );

    await expect(navigateToPendingStartupDeeplink()).resolves.toBe(false);

    expect(mockCancelDeeplinkProcessedTrace).toHaveBeenCalledWith({
      reason: 'error',
    });
    expect(mockCancelDeeplinkNavigatedTrace).toHaveBeenCalledWith({
      reason: 'error',
    });
  });

  it('keeps the unlock-session app start type after a throw for leftover parse', async () => {
    rememberUnlockAppStartType('warm');
    AppStateEventProcessor.pendingDeeplink = 'https://link.metamask.io/rewards';
    mockExecuteStartupDeeplinkIntent.mockRejectedValueOnce(
      new Error('reset failed'),
    );

    await navigateToPendingStartupDeeplink();
    retryPendingDeeplinkAfterDefaultNavigation();

    expect(mockClearPendingDeeplink).not.toHaveBeenCalled();
    expect(consumeNextParseAppStartType()).toBe('warm');
  });

  it('re-dispatches deeplink handling after default navigation when pending remains', () => {
    AppStateEventProcessor.pendingDeeplink = 'https://link.metamask.io/swap';

    retryPendingDeeplinkAfterDefaultNavigation();

    expect(mockRequestAnimationFrame).toHaveBeenCalled();
    expect(mockDispatch).toHaveBeenCalledWith(checkForDeeplink());
    expect(consumeNextParseAppStartType()).toBe('cold');
    expect(consumeNextParseAppStartType()).toBeUndefined();
  });

  it('reuses the unlock-session app start type for leftover parse after a warm lock-unlock', () => {
    rememberUnlockAppStartType('warm');
    AppStateEventProcessor.pendingDeeplink = 'https://link.metamask.io/swap';

    retryPendingDeeplinkAfterDefaultNavigation();

    expect(consumeNextParseAppStartType()).toBe('warm');
  });

  it('navigates directly to a handled startup deeplink after unlock', async () => {
    AppStateEventProcessor.pendingDeeplink = 'https://link.metamask.io/rewards';

    await navigateToPostUnlockHome();

    expect(mockExecuteStartupDeeplinkIntent).toHaveBeenCalledWith(intent);
    expect(mockReset).not.toHaveBeenCalled();
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  describe('route restoration', () => {
    const restorableTree = {
      index: 0,
      routes: [
        {
          name: 'NavigationChildren',
          state: {
            index: 1,
            routes: [
              {
                name: Routes.ONBOARDING.HOME_NAV,
                state: {
                  index: 0,
                  routes: [
                    {
                      name: Routes.PERPS.ROOT,
                      state: {
                        index: 0,
                        routes: [{ name: Routes.PERPS.PERPS_HOME }],
                      },
                    },
                  ],
                },
              },
              { name: Routes.ONBOARDING.LOGIN },
            ],
          },
        },
      ],
    };

    it('uncovers the screens the user left instead of resetting', async () => {
      mockRestoreSettings = {
        ...mockRestoreSettings,
        enabled: true,
      };
      mockRootState = restorableTree;
      setWalletLockedAt(Date.now() - 1000);

      await navigateToPostUnlockHome();

      expect(mockNavigationDispatch).toHaveBeenCalledWith(
        StackActions.popTo(Routes.ONBOARDING.HOME_NAV),
      );
      expect(mockReset).not.toHaveBeenCalled();
      expect(mockNavigationDispatch).toHaveBeenCalledTimes(1);
      expect(mockTrackRouteRestoreEvaluated).toHaveBeenCalledWith(
        {
          restore: true,
          route: Routes.PERPS.PERPS_HOME,
          target: Routes.PERPS.PERPS_HOME,
          exact: true,
        },
        expect.any(Number),
      );
      expect(mockSetWalletLocked).toHaveBeenCalledWith(false);
    });

    it('keeps a nested screen when the allowlisted tree is on the path', async () => {
      mockRestoreSettings = {
        ...mockRestoreSettings,
        enabled: true,
      };
      mockRootState = {
        index: 0,
        routes: [
          {
            name: 'NavigationChildren',
            state: {
              index: 1,
              routes: [
                {
                  name: Routes.ONBOARDING.HOME_NAV,
                  state: {
                    index: 0,
                    routes: [
                      {
                        name: Routes.PERPS.ROOT,
                        state: {
                          index: 1,
                          routes: [
                            { name: Routes.PERPS.PERPS_HOME },
                            { name: Routes.PERPS.MARKET_DETAILS },
                          ],
                        },
                      },
                    ],
                  },
                },
                { name: Routes.ONBOARDING.LOGIN },
              ],
            },
          },
        ],
      };
      setWalletLockedAt(Date.now() - 1000);

      await navigateToPostUnlockHome();

      expect(mockNavigationDispatch).toHaveBeenCalledTimes(1);
      expect(mockNavigationDispatch).toHaveBeenCalledWith(
        StackActions.popTo(Routes.ONBOARDING.HOME_NAV),
      );
      expect(mockNavigationDispatch).not.toHaveBeenCalledWith(
        StackActions.popTo(Routes.PERPS.PERPS_HOME),
      );
      expect(mockReset).not.toHaveBeenCalled();
      expect(mockTrackRouteRestoreEvaluated).toHaveBeenCalledWith(
        {
          restore: true,
          route: Routes.PERPS.MARKET_DETAILS,
          target: Routes.PERPS.MARKET_DETAILS,
          exact: true,
        },
        expect.any(Number),
      );
    });

    it('resets when the flag is off, and does not dispatch a pop', async () => {
      mockRootState = restorableTree;
      setWalletLockedAt(Date.now() - 1000);

      await navigateToPostUnlockHome();

      expect(mockReset).toHaveBeenCalledWith({
        routes: [{ name: Routes.ONBOARDING.HOME_NAV }],
      });
      expect(mockNavigationDispatch).not.toHaveBeenCalled();
    });

    it('does not report cold start, where no restore was possible', async () => {
      mockRestoreSettings = {
        ...mockRestoreSettings,
        enabled: true,
      };

      await navigateToPostUnlockHome();

      expect(mockReset).toHaveBeenCalled();
      expect(mockTrackRouteRestoreEvaluated).not.toHaveBeenCalled();
    });

    it('cancels the armed window expiry before navigating', async () => {
      mockRestoreSettings = {
        ...mockRestoreSettings,
        enabled: true,
      };
      mockRootState = restorableTree;
      setWalletLockedAt(Date.now() - 1000);

      await navigateToPostUnlockHome();

      expect(mockCancelRestoreWindowExpiry).toHaveBeenCalledTimes(1);
    });

    it('resets to Home when the window expired without a proactive reset', async () => {
      mockRestoreSettings = {
        ...mockRestoreSettings,
        enabled: true,
        restoreWindowMs: 1000,
      };
      mockRootState = restorableTree;
      setWalletLockedAt(Date.now() - 5000);

      await navigateToPostUnlockHome();

      expect(mockReset).toHaveBeenCalledWith({
        routes: [{ name: Routes.ONBOARDING.HOME_NAV }],
      });
      expect(mockTrackRouteRestoreEvaluated).toHaveBeenCalledWith(
        {
          restore: false,
          reason: 'window_expired',
          route: Routes.PERPS.PERPS_HOME,
        },
        expect.any(Number),
      );
    });

    it('skips the second reset and reports the abandoned screen after expiry behind the lock cover', async () => {
      mockRestoreSettings = {
        ...mockRestoreSettings,
        enabled: true,
        restoreWindowMs: 1000,
      };
      // Expiry already reset the tree: HomeNav now sits on Home, not Perps.
      mockRootState = {
        index: 0,
        routes: [
          {
            name: 'NavigationChildren',
            state: {
              index: 0,
              routes: [
                {
                  name: Routes.ONBOARDING.HOME_NAV,
                  state: {
                    index: 0,
                    routes: [{ name: Routes.WALLET.HOME }],
                  },
                },
              ],
            },
          },
        ],
      };
      setWalletLockedAt(Date.now() - 5000);
      setWalletLockExpiredRoute(Routes.PERPS.MARKET_DETAILS);

      await navigateToPostUnlockHome();

      expect(mockReset).not.toHaveBeenCalled();
      expect(mockNavigationDispatch).not.toHaveBeenCalled();
      expect(mockTrackRouteRestoreEvaluated).toHaveBeenCalledWith(
        {
          restore: false,
          reason: 'window_expired',
          route: Routes.PERPS.MARKET_DETAILS,
        },
        expect.any(Number),
      );
      expect(mockSetWalletLocked).toHaveBeenCalledWith(false);
    });
  });

  it('navigates home and retries pending deeplinks that need the legacy flow', async () => {
    AppStateEventProcessor.pendingDeeplink = 'https://link.metamask.io/swap';
    mockResolve.mockResolvedValueOnce(null);

    await navigateToPostUnlockHome();

    expect(mockReset).toHaveBeenCalledWith({
      routes: [{ name: Routes.ONBOARDING.HOME_NAV }],
    });
    expect(mockDispatch).toHaveBeenCalledWith(checkForDeeplink());
  });

  it('navigates home without retrying when startup resolution was rejected', async () => {
    AppStateEventProcessor.pendingDeeplink = 'https://link.metamask.io/rewards';
    mockResolve.mockResolvedValueOnce(false);

    await navigateToPostUnlockHome();

    expect(mockClearPendingDeeplink).toHaveBeenCalledTimes(1);
    expect(mockReset).toHaveBeenCalledWith({
      routes: [{ name: Routes.ONBOARDING.HOME_NAV }],
    });
    expect(mockDispatch).not.toHaveBeenCalled();
  });
});

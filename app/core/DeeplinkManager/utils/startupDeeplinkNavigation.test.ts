import { checkForDeeplink } from '../../../actions/user';
import { StackActions } from '@react-navigation/native';
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
import type { DeeplinkIntent } from '../types/DeeplinkIntent';

const mockDispatch = jest.fn();
const mockReset = jest.fn();
const mockNavigationDispatch = jest.fn();
const mockTrackRouteRestoreEvaluated = jest.fn();
let mockRestoreEnabled = false;
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
  selectRouteRestorationEnabled: () => mockRestoreEnabled,
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

jest.mock('./executeDeeplinkIntent', () => ({
  executeStartupDeeplinkIntent: (intent: DeeplinkIntent) =>
    mockExecuteStartupDeeplinkIntent(intent),
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
    mockRestoreEnabled = false;
    mockRootState = { index: 0, routes: [{ name: 'Login' }] };
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
    // The getter lives on the prototype, so define it on the instance instead.
    const setBackgroundedAt = (value: number | null) => {
      Object.defineProperty(AppStateEventProcessor, 'lastBackgroundedAt', {
        configurable: true,
        get: () => value,
      });
    };

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
                  routes: [{ name: Routes.PERPS.PERPS_HOME }],
                },
              },
              { name: Routes.ONBOARDING.LOGIN },
            ],
          },
        },
      ],
    };

    it('uncovers the screens the user left instead of resetting', async () => {
      mockRestoreEnabled = true;
      mockRootState = restorableTree;
      setBackgroundedAt(Date.now() - 1000);

      await navigateToPostUnlockHome();

      expect(mockNavigationDispatch).toHaveBeenCalledWith(
        StackActions.popTo(Routes.ONBOARDING.HOME_NAV),
      );
      expect(mockReset).not.toHaveBeenCalled();
      expect(mockNavigationDispatch).toHaveBeenCalledTimes(1);
      expect(mockTrackRouteRestoreEvaluated).toHaveBeenCalledWith(
        { restore: true, route: Routes.PERPS.PERPS_HOME, exact: true },
        expect.any(Number),
      );
    });

    it('trims the section stack when the user was deeper than a top-level route', async () => {
      mockRestoreEnabled = true;
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
                    index: 1,
                    routes: [
                      { name: Routes.PERPS.PERPS_HOME },
                      { name: 'PerpsOrderForm' },
                    ],
                  },
                },
                { name: Routes.ONBOARDING.LOGIN },
              ],
            },
          },
        ],
      };
      setBackgroundedAt(Date.now() - 1000);

      await navigateToPostUnlockHome();

      // Covers first, then the section's own stack.
      expect(mockNavigationDispatch).toHaveBeenNthCalledWith(
        1,
        StackActions.popTo(Routes.ONBOARDING.HOME_NAV),
      );
      expect(mockNavigationDispatch).toHaveBeenNthCalledWith(
        2,
        StackActions.popTo(Routes.PERPS.PERPS_HOME),
      );
      expect(mockReset).not.toHaveBeenCalled();
    });

    it('resets when the flag is off, and does not dispatch a pop', async () => {
      mockRootState = restorableTree;
      setBackgroundedAt(Date.now() - 1000);

      await navigateToPostUnlockHome();

      expect(mockReset).toHaveBeenCalledWith({
        routes: [{ name: Routes.ONBOARDING.HOME_NAV }],
      });
      expect(mockNavigationDispatch).not.toHaveBeenCalled();
    });

    it('does not report cold start, where no restore was possible', async () => {
      mockRestoreEnabled = true;

      await navigateToPostUnlockHome();

      expect(mockReset).toHaveBeenCalled();
      expect(mockTrackRouteRestoreEvaluated).not.toHaveBeenCalled();
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

/**
 * Component-view journeys for Login covering a locked session + post-unlock
 * restore. In-session lock pushes LockScreen / Login over the tree; unlock
 * pops those covers. Restore cases are parameterized over representative
 * catalog routes.
 */
import '../../../../tests/component-view/mocks';

import { BackHandler } from 'react-native';
import { act, screen } from '@testing-library/react-native';
import { StackActions } from '@react-navigation/native';
import Routes from '../../../constants/navigation/Routes';
import NavigationService from '../../../core/NavigationService';
import ReduxService from '../../../core/redux';
import type { ReduxStore } from '../../../core/redux/types';
import { AppStateEventProcessor } from '../../../core/AppStateEventListener';
import SharedDeeplinkManager from '../../../core/DeeplinkManager/DeeplinkManager';
import { navigateToPostUnlockHome } from '../../../core/DeeplinkManager/utils/startupDeeplinkNavigation';
import {
  setWalletLockedAt,
  resetWalletLockedAtForTesting,
} from '../../../util/navigation/walletLockClock';
import { prepareWalletLockOverlay } from '../../../util/navigation/prepareWalletLockOverlay';
import {
  __resetWalletLockedForTests,
  getWalletLocked,
} from '../../../core/WalletLockLifecycle';
import { renderLoginView } from '../../../../tests/component-view/renderers/login';
import {
  routeRestorationDisabledFlags,
  routeRestorationEnabledFlags,
} from '../../../../tests/component-view/presets/login';
import { LoginViewSelectors } from './LoginView.testIds';
import { itForPlatforms } from '../../../../tests/component-view/platform';

const REPRESENTATIVE_CATALOG_ROUTES = [
  { routeName: Routes.TRENDING_VIEW, label: 'tab-leaf', navigator: 'tab' },
  {
    routeName: Routes.PERPS.ROOT,
    label: 'stack-landing',
    navigator: 'stack',
  },
] as const;

/**
 * HomeNav stays the session root. Unlock pops LockScreen / Login via popTo.
 */
const buildRestorableTree = (
  focusedRoute: string,
  options: { nested?: string; navigator?: 'stack' | 'tab' } = {},
) => {
  const { nested, navigator: navigatorType = 'stack' } = options;
  const catalogRoutes = nested
    ? [
        { name: focusedRoute, key: `${focusedRoute}-old` },
        { name: nested, key: `${nested}-old` },
      ]
    : [{ name: focusedRoute, key: `${focusedRoute}-old` }];

  return {
    key: 'root',
    index: 0,
    routes: [
      {
        name: 'NavigationChildren',
        state: {
          key: 'nav-children',
          index: 0,
          routes: [
            {
              name: Routes.ONBOARDING.HOME_NAV,
              key: 'home-nav',
              state: {
                key: 'home-nav',
                type: navigatorType,
                index: nested ? 1 : 0,
                routes: catalogRoutes,
              },
            },
          ],
        },
      },
    ],
  };
};

describe('Login locked cover + route restore', () => {
  const mockDispatch = jest.fn();
  const mockReset = jest.fn();
  const mockNavigate = jest.fn();
  let previousStore: ReduxStore | undefined;
  let mockRootState: ReturnType<typeof buildRestorableTree> =
    buildRestorableTree(Routes.PERPS.PERPS_HOME);

  const wireUnlockPath = (store: ReduxStore) => {
    try {
      previousStore = ReduxService.store;
    } catch {
      previousStore = undefined;
    }
    ReduxService.store = store;
    NavigationService.navigation = {
      navigate: mockNavigate,
      dispatch: mockDispatch,
      reset: mockReset,
      getRootState: () => mockRootState,
    } as never;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    resetWalletLockedAtForTesting();
    __resetWalletLockedForTests();
    AppStateEventProcessor.pendingDeeplink = null;
    AppStateEventProcessor.pendingDeeplinkSource = null;
    mockRootState = buildRestorableTree(Routes.PERPS.ROOT);
  });

  afterEach(() => {
    NavigationService.resetForTesting();
    resetWalletLockedAtForTesting();
    __resetWalletLockedForTests();
    if (previousStore) {
      ReduxService.store = previousStore;
    }
  });

  itForPlatforms(
    'keeps the locked cover when hardware back is pressed',
    () => {
      const addSpy = jest.spyOn(BackHandler, 'addEventListener');

      renderLoginView({ locked: true });

      expect(
        screen.getByTestId(LoginViewSelectors.CONTAINER),
      ).toBeOnTheScreen();

      const handler = addSpy.mock.calls.find(
        (call) => call[0] === 'hardwareBackPress',
      )?.[1] as (() => boolean) | undefined;

      expect(handler).toBeDefined();
      expect(handler?.()).toBe(true);
      expect(
        screen.getByTestId(LoginViewSelectors.CONTAINER),
      ).toBeOnTheScreen();

      addSpy.mockRestore();
    },
    'android',
  );

  it('lands on Home when route restoration is disabled', async () => {
    const { store } = renderLoginView({
      locked: true,
      remoteFeatureFlags: routeRestorationDisabledFlags,
    });
    wireUnlockPath(store as unknown as ReduxStore);
    setWalletLockedAt(Date.now() - 1_000);

    await act(async () => {
      await navigateToPostUnlockHome();
    });

    expect(mockReset).toHaveBeenCalledWith({
      routes: [{ name: Routes.ONBOARDING.HOME_NAV }],
    });
    expect(mockDispatch).not.toHaveBeenCalled();
    expect(getWalletLocked()).toBe(false);
  });

  it.each(REPRESENTATIVE_CATALOG_ROUTES)(
    'unlocks on the same allowlisted $label ($routeName) without remounting',
    async ({ routeName, navigator: navigatorType }) => {
      const now = Date.now();
      mockRootState = buildRestorableTree(routeName, {
        navigator: navigatorType,
      });
      const { store } = renderLoginView({
        locked: true,
        remoteFeatureFlags: routeRestorationEnabledFlags(),
      });
      wireUnlockPath(store as unknown as ReduxStore);

      await act(async () => {
        prepareWalletLockOverlay({ now });
      });

      expect(mockDispatch).not.toHaveBeenCalled();
      expect(getWalletLocked()).toBe(true);

      await act(async () => {
        await navigateToPostUnlockHome();
      });

      expect(mockDispatch).toHaveBeenCalledWith(
        StackActions.popTo(Routes.ONBOARDING.HOME_NAV),
      );
      expect(mockDispatch).not.toHaveBeenCalledWith(
        StackActions.popTo(Routes.ONBOARDING.LOGIN),
      );
      expect(mockDispatch).not.toHaveBeenCalledWith(
        StackActions.popTo(Routes.LOCK_SCREEN),
      );
      expect(mockNavigate).not.toHaveBeenCalled();
      expect(mockReset).not.toHaveBeenCalled();
      expect(getWalletLocked()).toBe(false);
    },
  );

  it.each(
    REPRESENTATIVE_CATALOG_ROUTES.filter(
      (route) => route.navigator === 'stack',
    ),
  )(
    'keeps nested screens under $routeName through lock and unlock',
    async ({ routeName }) => {
      const now = Date.now();
      mockRootState = buildRestorableTree(routeName, {
        nested: 'NestedDetailScreen',
        navigator: 'stack',
      });
      const { store } = renderLoginView({
        locked: true,
        remoteFeatureFlags: routeRestorationEnabledFlags(),
      });
      wireUnlockPath(store as unknown as ReduxStore);

      await act(async () => {
        prepareWalletLockOverlay({ now });
      });

      expect(mockDispatch).not.toHaveBeenCalled();
      expect(getWalletLocked()).toBe(true);

      await act(async () => {
        await navigateToPostUnlockHome();
      });

      expect(mockDispatch).toHaveBeenCalledWith(
        StackActions.popTo(Routes.ONBOARDING.HOME_NAV),
      );
      expect(mockDispatch).not.toHaveBeenCalledWith(
        StackActions.popTo(routeName),
      );
      expect(mockReset).not.toHaveBeenCalled();
    },
  );

  it('lets a pending startup deeplink win over catalog restore', async () => {
    mockRootState = buildRestorableTree(Routes.PERPS.ROOT);
    const { store } = renderLoginView({
      locked: true,
      remoteFeatureFlags: routeRestorationEnabledFlags(),
    });
    wireUnlockPath(store as unknown as ReduxStore);
    setWalletLockedAt(Date.now() - 1_000);

    AppStateEventProcessor.pendingDeeplink = 'https://link.metamask.io/rewards';
    const originalResolve = SharedDeeplinkManager.resolve.bind(
      SharedDeeplinkManager,
    );
    SharedDeeplinkManager.resolve = jest.fn().mockResolvedValue({
      target: {
        type: 'home-tab',
        routeName: Routes.REWARDS_VIEW,
      },
    });

    try {
      await act(async () => {
        await navigateToPostUnlockHome();
      });

      // Tree is alive under the lock covers: navigate on it (same path as an
      // already-unlocked deeplink) instead of a hand-built startup reset.
      expect(mockNavigate).toHaveBeenCalledWith(Routes.REWARDS_VIEW);
      expect(mockReset).not.toHaveBeenCalled();
      expect(mockDispatch).not.toHaveBeenCalledWith(
        StackActions.popTo(Routes.PERPS.PERPS_HOME),
      );
      expect(getWalletLocked()).toBe(false);
    } finally {
      SharedDeeplinkManager.resolve = originalResolve;
      AppStateEventProcessor.pendingDeeplink = null;
    }
  });
});

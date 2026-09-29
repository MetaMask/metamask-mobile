/* eslint-disable import-x/prefer-default-export */
import {
  type OnNavigationReadyAction,
  type MainNavigatorReadyAction,
  type SetCurrentRouteAction,
  type SetCurrentBottomNavRouteAction,
  NavigationActionType,
} from './types';

export * from './types';

export const setCurrentRoute = (route: string): SetCurrentRouteAction => ({
  type: NavigationActionType.SET_CURRENT_ROUTE,
  payload: { route },
});

export const setCurrentBottomNavRoute = (
  route: string,
): SetCurrentBottomNavRouteAction => ({
  type: NavigationActionType.SET_CURRENT_BOTTOM_NAV_ROUTE,
  payload: { route },
});

/**
 * Action that is called when navigation is ready
 */
export const onNavigationReady = (): OnNavigationReadyAction => ({
  type: NavigationActionType.ON_NAVIGATION_READY,
});

/**
 * Dispatched by `MainNavigator` on mount to announce that post-login screens
 * (Wallet, Ramp, Swap, AssetDetails, ...) are registered with React
 * Navigation. The deeplink saga waits on this signal so `navigate(target)` is
 * never silently dropped by the navigator.
 */
export const mainNavigatorReady = (): MainNavigatorReadyAction => ({
  type: NavigationActionType.MAIN_NAVIGATOR_READY,
});

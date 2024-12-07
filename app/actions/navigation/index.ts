/* eslint-disable import/prefer-default-export */
import {
  type OnNavigationReadyAction,
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

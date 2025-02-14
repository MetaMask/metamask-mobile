import { type Action } from 'redux';

/**
 * Navigation action type enum
 */
export enum NavigationActionType {
  ON_NAVIGATION_READY = 'ON_NAVIGATION_READY',
  SET_CURRENT_ROUTE = 'SET_CURRENT_ROUTE',
  SET_CURRENT_BOTTOM_NAV_ROUTE = 'SET_CURRENT_BOTTOM_NAV_ROUTE',
}

export type OnNavigationReadyAction =
  Action<NavigationActionType.ON_NAVIGATION_READY>;

export type SetCurrentRouteAction =
  Action<NavigationActionType.SET_CURRENT_ROUTE> & {
    payload: { route: string };
  };

export type SetCurrentBottomNavRouteAction =
  Action<NavigationActionType.SET_CURRENT_BOTTOM_NAV_ROUTE> & {
    payload: { route: string };
  };

/**
 * Navigation action
 */
export type NavigationAction =
  | OnNavigationReadyAction
  | SetCurrentRouteAction
  | SetCurrentBottomNavRouteAction;

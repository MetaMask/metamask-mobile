/**
 * Navigation action type enum
 */
export enum NavigationActionType {
  ON_NAVIGATION_READY = 'ON_NAVIGATION_READY',
  SET_CURRENT_ROUTE = 'SET_CURRENT_ROUTE',
  SET_CURRENT_BOTTOM_NAV_ROUTE = 'SET_CURRENT_BOTTOM_NAV_ROUTE',
}

/**
 * Navigation action
 */
export type NavigationAction =
  | { type: NavigationActionType.ON_NAVIGATION_READY }
  | {
      type: NavigationActionType.SET_CURRENT_ROUTE;
      payload: { route: string };
    }
  | {
      type: NavigationActionType.SET_CURRENT_BOTTOM_NAV_ROUTE;
      payload: { route: string };
    };

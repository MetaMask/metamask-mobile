/* eslint-disable import/prefer-default-export */
import { NavigationActionType, NavigationAction } from './types';

export * from './types';

/**
 * Action creators
 */
export const setCurrentRoute = (route: string): NavigationAction => ({
  type: NavigationActionType.SET_CURRENT_ROUTE,
  payload: { route },
});

export const setCurrentBottomNavRoute = (route: string): NavigationAction => ({
  type: NavigationActionType.SET_CURRENT_BOTTOM_NAV_ROUTE,
  payload: { route },
});

/**
 * Action that is called when navigation is ready
 *
 * @returns - On navigation ready action
 */
export const setOnNavigationReady = (): NavigationAction => ({
  type: NavigationActionType.ON_NAVIGATION_READY,
});

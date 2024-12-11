import { type Action } from 'redux';

/**
 * Navigation action type enum
 */
export enum NavigationActionType {
  ON_NAVIGATION_READY = 'ON_NAVIGATION_READY',
}

export type OnNavigationReadyAction =
  Action<NavigationActionType.ON_NAVIGATION_READY>;

/**
 * Navigation action
 */
export type NavigationAction = OnNavigationReadyAction;

/* eslint-disable import/prefer-default-export */
import { type OnNavigationReadyAction, NavigationActionType } from './types';

export * from './types';

/**
 * Action that is called when navigation is ready
 */
export const onNavigationReady = (): OnNavigationReadyAction => ({
  type: NavigationActionType.ON_NAVIGATION_READY,
});

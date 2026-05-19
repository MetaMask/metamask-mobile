import { createSelector } from 'reselect';
import { RootState } from '..';

/**
 * Selects the navigation state
 */
export const selectNavigationState = (state: RootState) => state.navigation;

/**
 * Selects the current route
 */
export const selectCurrentRoute = createSelector(
  selectNavigationState,
  (navigationState) => navigationState.currentRoute,
);

/**
 * Selects the current bottom nav route
 */
export const selectCurrentBottomNavRoute = createSelector(
  selectNavigationState,
  (navigationState) => navigationState.currentBottomNavRoute,
);

/**
 * Whether `MainNavigator` has mounted and post-login screens are registered
 * with React Navigation. Used by the deeplink saga to avoid parsing a
 * deeplink before its target screen exists in the navigation state tree.
 */
export const selectIsMainNavigatorReady = createSelector(
  selectNavigationState,
  (navigationState) => navigationState.isMainNavigatorReady,
);

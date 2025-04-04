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

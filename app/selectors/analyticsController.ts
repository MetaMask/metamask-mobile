import { createSelector } from 'reselect';
import { analyticsControllerSelectors } from '@metamask/analytics-controller';
import { RootState } from '../reducers';

/**
 * Selects the AnalyticsController state from the root Redux state
 * Private helper used by other selectors in this file
 *
 * @param state - Root Redux state
 * @returns AnalyticsController state or undefined if not available
 */
const selectAnalyticsControllerState = (state: RootState) =>
  state?.engine?.backgroundState?.AnalyticsController;

/**
 * Selects the analytics ID (UUID) from the AnalyticsController
 * Uses the controller's selector to ensure logic is controlled by the controller
 *
 * @returns Analytics ID or undefined if controller state is not available
 */
export const selectAnalyticsId = createSelector(
  selectAnalyticsControllerState,
  (state) => state && analyticsControllerSelectors.selectAnalyticsId(state),
);

/**
 * Selects whether analytics is enabled
 * Uses the controller's selector which computes enabled state from opt-in flag
 *
 * @returns True if enabled, false if disabled, undefined if state not available
 */
export const selectAnalyticsEnabled = createSelector(
  selectAnalyticsControllerState,
  (state) => state && analyticsControllerSelectors.selectEnabled(state),
);

/**
 * Selects whether user opted in
 * Uses the controller's selector to ensure logic is controlled by the controller
 *
 * @returns True if opted in, false if not, undefined if state not available
 */
export const selectAnalyticsOptedIn = createSelector(
  selectAnalyticsControllerState,
  (state) => state && analyticsControllerSelectors.selectOptedIn(state),
);

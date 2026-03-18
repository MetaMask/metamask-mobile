import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';

/**
 * Selector for account menu availability.
 * The account menu is now permanently enabled.
 */
export const selectAccountMenuEnabled = createSelector(
  selectRemoteFeatureFlags,
  () => true,
);

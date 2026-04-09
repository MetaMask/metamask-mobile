import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';

/**
 * Selector to check if multichain accounts state 2 is enabled.
 * The feature is permanently enabled — the remote feature flag is no longer required.
 * @returns Always true.
 */
export const selectMultichainAccountsState2Enabled = createSelector(
  selectRemoteFeatureFlags,
  (): boolean => true,
);

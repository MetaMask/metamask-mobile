import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';

/**
 * Selector to check if the addBitcoinAccount feature flag is enabled.
 * This flag controls whether Bitcoin provider is available for account creation.
 */
export const selectIsAddBitcoinAccountEnabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => Boolean(remoteFeatureFlags.addBitcoinAccount),
);

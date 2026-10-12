import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';
import { hasProperty } from '@metamask/utils';

const DEFAULT_RWA_ENABLED = false;
export const FEATURE_FLAG_NAME = 'rwaTokensEnabled';

/**
 * Simplified boolean from client-config. Dev is on; production is off until
 * the flag is flipped. Only a literal `true` shows Robinhood RWA assets.
 */
export const SHOW_ROBINHOOD_RWA_FLAG_NAME = 'ASSETS4098ShowRobinhoodRwa';

export const selectRWAEnabledFlag = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) =>
    hasProperty(remoteFeatureFlags, FEATURE_FLAG_NAME)
      ? (remoteFeatureFlags[FEATURE_FLAG_NAME] as boolean)
      : DEFAULT_RWA_ENABLED,
);

export const selectShowRobinhoodRwa = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags): boolean =>
    hasProperty(remoteFeatureFlags, SHOW_ROBINHOOD_RWA_FLAG_NAME) &&
    remoteFeatureFlags[SHOW_ROBINHOOD_RWA_FLAG_NAME] === true,
);

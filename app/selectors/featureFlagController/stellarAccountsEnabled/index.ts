import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';
import { isStellarAccountsFeatureEnabled } from '../../../multichain-stellar/remote-feature-flag';

/**
 * Selector to check if the stellarAccounts feature flag is enabled.
 * Uses shared implementation for consistency with extension.
 */
export const selectIsStellarAccountsEnabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags): boolean => {
    const { stellarAccounts } = remoteFeatureFlags;
    return isStellarAccountsFeatureEnabled(stellarAccounts);
  },
);

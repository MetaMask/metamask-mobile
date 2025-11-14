import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';
import { isTronAccountsFeatureEnabled } from '../../../multichain-tron/remote-feature-flag';

/**
 * Selector to check if the tronAccounts feature flag is enabled.
 * Uses shared implementation for consistency with extension.
 */
export const selectIsTronAccountsEnabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags): boolean => {
    const { tronAccounts } = remoteFeatureFlags;
    return isTronAccountsFeatureEnabled(tronAccounts);
  },
);

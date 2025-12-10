import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';
import { isBitcoinAccountsFeatureEnabled } from '../../../multichain-bitcoin/remote-feature-flag';

/**
 * Selector to check if the bitcoinAccounts feature flag is enabled.
 * Uses shared implementation for consistency with extension.
 */
export const selectIsBitcoinAccountsEnabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags): boolean => {
    const { bitcoinAccounts } = remoteFeatureFlags;
    return isBitcoinAccountsFeatureEnabled(bitcoinAccounts);
  },
);

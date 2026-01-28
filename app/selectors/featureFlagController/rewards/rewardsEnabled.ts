import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';
import { hasProperty } from '@metamask/utils';
import {
  validatedVersionGatedFeatureFlag,
  VersionGatedFeatureFlag,
} from '../../../util/remoteFeatureFlag';
import { selectBasicFunctionalityEnabled } from '../../settings';

export const BITCOIN_REWARDS_FLAG_NAME = 'rewardsBitcoinEnabled';
export const TRON_REWARDS_FLAG_NAME = 'rewardsTronEnabled';

const DEFAULT_BITCOIN_REWARDS_ENABLED = false;
const DEFAULT_TRON_REWARDS_ENABLED = false;

/**
 * Selector for the raw Bitcoin rewards enabled remote flag value.
 * Returns the flag value without considering basic functionality.
 */
export const selectBitcoinRewardsEnabledRawFlag = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    if (!hasProperty(remoteFeatureFlags, BITCOIN_REWARDS_FLAG_NAME)) {
      return DEFAULT_BITCOIN_REWARDS_ENABLED;
    }
    const remoteFlag = remoteFeatureFlags[
      BITCOIN_REWARDS_FLAG_NAME
    ] as unknown as VersionGatedFeatureFlag;

    return (
      validatedVersionGatedFeatureFlag(remoteFlag) ??
      DEFAULT_BITCOIN_REWARDS_ENABLED
    );
  },
);

/**
 * Selector for the Bitcoin rewards enabled flag.
 * Returns false if basic functionality is disabled, otherwise returns the remote flag value.
 */
export const selectBitcoinRewardsEnabledFlag = createSelector(
  selectBasicFunctionalityEnabled,
  selectBitcoinRewardsEnabledRawFlag,
  (isBasicFunctionalityEnabled, bitcoinRewardsEnabledRawFlag) => {
    if (!isBasicFunctionalityEnabled) {
      return false;
    }
    return bitcoinRewardsEnabledRawFlag;
  },
);

/**
 * Selector for the raw Tron rewards enabled remote flag value.
 * Returns the flag value without considering basic functionality.
 */
export const selectTronRewardsEnabledRawFlag = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    if (!hasProperty(remoteFeatureFlags, TRON_REWARDS_FLAG_NAME)) {
      return DEFAULT_TRON_REWARDS_ENABLED;
    }
    const remoteFlag = remoteFeatureFlags[
      TRON_REWARDS_FLAG_NAME
    ] as unknown as VersionGatedFeatureFlag;

    return (
      validatedVersionGatedFeatureFlag(remoteFlag) ??
      DEFAULT_TRON_REWARDS_ENABLED
    );
  },
);

/**
 * Selector for the Tron rewards enabled flag.
 * Returns false if basic functionality is disabled, otherwise returns the remote flag value.
 */
export const selectTronRewardsEnabledFlag = createSelector(
  selectBasicFunctionalityEnabled,
  selectTronRewardsEnabledRawFlag,
  (isBasicFunctionalityEnabled, tronRewardsEnabledRawFlag) => {
    if (!isBasicFunctionalityEnabled) {
      return false;
    }
    return tronRewardsEnabledRawFlag;
  },
);

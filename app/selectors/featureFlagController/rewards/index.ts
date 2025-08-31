import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';
import { hasProperty } from '@metamask/utils';

const DEFAULT_REWARDS_ENABLED = true; // TODO: REVERT BEFORE COMMIT - Enabled for testing rewards integration
export const FEATURE_FLAG_NAME = 'rewards';

export const selectRewardsEnabledFlag = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) =>
    hasProperty(remoteFeatureFlags, FEATURE_FLAG_NAME)
      ? (remoteFeatureFlags[FEATURE_FLAG_NAME] as boolean)
      : DEFAULT_REWARDS_ENABLED,
);

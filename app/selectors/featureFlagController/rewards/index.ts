import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';

export const FEATURE_FLAG_NAME = 'rewards';

export const selectRewardsEnabledFlag = createSelector(
  selectRemoteFeatureFlags,
  () => true,
);

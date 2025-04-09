import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';

export const selectPooledStakingEnabledFlag = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    const localFlag = process.env.MM_POOLED_STAKING_ENABLED;
    const remoteFlag = remoteFeatureFlags?.earnPooledStakingEnabled;
    const result = localFlag ?? remoteFlag;
    return result;
  },
);

export const selectPooledStakingServiceInterruptionBannerEnabledFlag =
  createSelector(selectRemoteFeatureFlags, (remoteFeatureFlags) => {
    const localFlag =
      process.env.MM_POOLED_STAKING_SERVICE_INTERRUPTION_BANNER_ENABLED;
    const remoteFlag =
      remoteFeatureFlags?.earnPooledStakingServiceInterruptionBannerEnabled;
    return localFlag ?? remoteFlag;
  });

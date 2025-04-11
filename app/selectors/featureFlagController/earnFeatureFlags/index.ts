import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';

export const selectPooledStakingEnabledFlag = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    const localFlag = process.env.MM_POOLED_STAKING_ENABLED;
    const remoteFlag = remoteFeatureFlags?.earnPooledStakingEnabled;
    const result = localFlag ?? remoteFlag;
    return result as boolean;
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

export const selectStablecoinLendingEnabledFlag = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags): boolean => {
    const localFlag = process.env.MM_STABLECOIN_LENDING_UI_ENABLED;
    const remoteFlag = remoteFeatureFlags?.earnStablecoinLendingEnabled;
    const result = localFlag ?? remoteFlag;
    return result as boolean;
  },
);

export const selectStablecoinLendingServiceInterruptionBannerEnabledFlag =
  createSelector(selectRemoteFeatureFlags, (remoteFeatureFlags) => {
    const localFlag =
      process.env.MM_STABLE_COIN_SERVICE_INTERRUPTION_BANNER_ENABLED;
    const remoteFlag =
      remoteFeatureFlags?.earnStablecoinLendingServiceInterruptionBannerEnabled;
    const result = localFlag ?? remoteFlag;
    return result;
  });

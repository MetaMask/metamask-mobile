import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '../../../../../selectors/featureFlagController';

const prioritizeFlagsByEnv = (localFlag: boolean, remoteFlag: boolean) => {
  const isDev = process.env.NODE_ENV === 'development';

  // Prioritize local flag in development
  if (isDev) return ((localFlag ?? remoteFlag) as boolean) ?? false;

  // Prioritize remote flag in production
  // To be safe, default to false if remote and local flags are null or undefined.
  return ((remoteFlag ?? localFlag) as boolean) ?? false;
};

export const selectPooledStakingEnabledFlag = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    const localFlag = Boolean(process.env.MM_POOLED_STAKING_ENABLED);
    const remoteFlag = Boolean(remoteFeatureFlags?.earnPooledStakingEnabled);

    return prioritizeFlagsByEnv(localFlag, remoteFlag);
  },
);

export const selectPooledStakingServiceInterruptionBannerEnabledFlag =
  createSelector(selectRemoteFeatureFlags, (remoteFeatureFlags) => {
    const localFlag = Boolean(
      process.env.MM_POOLED_STAKING_SERVICE_INTERRUPTION_BANNER_ENABLED,
    );
    const remoteFlag = Boolean(
      remoteFeatureFlags?.earnPooledStakingServiceInterruptionBannerEnabled,
    );

    return prioritizeFlagsByEnv(localFlag, remoteFlag);
  });

export const selectStablecoinLendingEnabledFlag = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags): boolean => {
    const localFlag = Boolean(process.env.MM_STABLECOIN_LENDING_UI_ENABLED);
    const remoteFlag = Boolean(
      remoteFeatureFlags?.earnStablecoinLendingEnabled,
    );

    return prioritizeFlagsByEnv(localFlag, remoteFlag);
  },
);

export const selectStablecoinLendingServiceInterruptionBannerEnabledFlag =
  createSelector(selectRemoteFeatureFlags, (remoteFeatureFlags) => {
    const localFlag = Boolean(
      process.env.MM_STABLE_COIN_SERVICE_INTERRUPTION_BANNER_ENABLED,
    );
    const remoteFlag = Boolean(
      remoteFeatureFlags?.earnStablecoinLendingServiceInterruptionBannerEnabled,
    );

    return prioritizeFlagsByEnv(localFlag, remoteFlag);
  });

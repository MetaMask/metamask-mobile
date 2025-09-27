import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '../../../../../selectors/featureFlagController';
import { EarnLaunchDarklyFlag } from './types';
import { hasMinimumRequiredVersion } from '../../../../../util/remoteFeatureFlag';
import { isRemoteFeatureFlagOverrideActivated } from '../../../../../core/Engine/controllers/remote-feature-flag-controller/utils';

export const earnRemoteFeatureFlag = (remoteFlag: EarnLaunchDarklyFlag) => {
  // If failed to fetch remote flag or flag is overridden or misconfigured return undefined to trigger fallback
  if (
    isRemoteFeatureFlagOverrideActivated ||
    !remoteFlag ||
    typeof remoteFlag.enabled !== 'boolean' ||
    typeof remoteFlag.minimumVersion !== 'string'
  ) {
    return undefined;
  }

  return (
    remoteFlag.enabled && hasMinimumRequiredVersion(remoteFlag.minimumVersion)
  );
};

export const selectPooledStakingEnabledFlag = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    const localFlag = process.env.MM_POOLED_STAKING_ENABLED === 'true';
    const remoteFlag =
      remoteFeatureFlags?.earnPooledStakingEnabled as unknown as EarnLaunchDarklyFlag;

    // Fallback to local flag if remote flag is not available
    return earnRemoteFeatureFlag(remoteFlag) ?? localFlag;
  },
);

export const selectPooledStakingServiceInterruptionBannerEnabledFlag =
  createSelector(selectRemoteFeatureFlags, (remoteFeatureFlags) => {
    const localFlag =
      process.env.MM_POOLED_STAKING_SERVICE_INTERRUPTION_BANNER_ENABLED ===
      'true';
    const remoteFlag =
      remoteFeatureFlags?.earnPooledStakingServiceInterruptionBannerEnabled as unknown as EarnLaunchDarklyFlag;

    // Fallback to local flag if remote flag is not available
    return earnRemoteFeatureFlag(remoteFlag) ?? localFlag;
  });

export const selectStablecoinLendingEnabledFlag = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags): boolean => {
    const localFlag = process.env.MM_STABLECOIN_LENDING_UI_ENABLED === 'true';
    const remoteFlag =
      remoteFeatureFlags?.earnStablecoinLendingEnabled as unknown as EarnLaunchDarklyFlag;

    // Fallback to local flag if remote flag is not available
    return earnRemoteFeatureFlag(remoteFlag) ?? localFlag;
  },
);

export const selectStablecoinLendingServiceInterruptionBannerEnabledFlag =
  createSelector(selectRemoteFeatureFlags, (remoteFeatureFlags) => {
    const localFlag =
      process.env.MM_STABLE_COIN_SERVICE_INTERRUPTION_BANNER_ENABLED === 'true';
    const remoteFlag =
      remoteFeatureFlags?.earnStablecoinLendingServiceInterruptionBannerEnabled as unknown as EarnLaunchDarklyFlag;

    // Fallback to local flag if remote flag is not available
    return earnRemoteFeatureFlag(remoteFlag) ?? localFlag;
  });

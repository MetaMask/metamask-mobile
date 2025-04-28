import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '../../../../../selectors/featureFlagController';
import { getVersion } from 'react-native-device-info';
import compareVersions from 'compare-versions';
import { isProduction } from '../../../../../util/environment';
import { EarnLaunchDarklyFlag } from './types';

const hasMinimumRequiredVersion = (minRequiredVersion: string) => {
  if (!minRequiredVersion) return false;
  const currentVersion = getVersion();
  return compareVersions.compare(currentVersion, minRequiredVersion, '>=');
};

const earnRemoteFeatureFlag = (remoteFlag: EarnLaunchDarklyFlag) =>
  Boolean(remoteFlag?.enabled) &&
  hasMinimumRequiredVersion(remoteFlag?.minimumVersion);

const prioritizeFlagsByEnv = (
  localFlag: boolean,
  remoteFlag: EarnLaunchDarklyFlag,
) => {
  if (isProduction()) {
    // Prioritize remote flag in production
    return earnRemoteFeatureFlag(remoteFlag) ?? localFlag;
  }

  // Prioritize local flag in development
  return localFlag ?? earnRemoteFeatureFlag(remoteFlag);
};

export const selectPooledStakingEnabledFlag = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    const localFlag = process.env.MM_POOLED_STAKING_ENABLED === 'true';
    const remoteFlag =
      remoteFeatureFlags?.earnPooledStakingEnabled as unknown as EarnLaunchDarklyFlag;

    return prioritizeFlagsByEnv(localFlag, remoteFlag);
  },
);

export const selectPooledStakingServiceInterruptionBannerEnabledFlag =
  createSelector(selectRemoteFeatureFlags, (remoteFeatureFlags) => {
    const localFlag =
      process.env.MM_POOLED_STAKING_SERVICE_INTERRUPTION_BANNER_ENABLED ===
      'true';
    const remoteFlag =
      remoteFeatureFlags?.earnPooledStakingServiceInterruptionBannerEnabled as unknown as EarnLaunchDarklyFlag;

    return prioritizeFlagsByEnv(localFlag, remoteFlag);
  });

export const selectStablecoinLendingEnabledFlag = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags): boolean => {
    const localFlag = process.env.MM_STABLECOIN_LENDING_UI_ENABLED === 'true';
    const remoteFlag =
      remoteFeatureFlags?.earnStablecoinLendingEnabled as unknown as EarnLaunchDarklyFlag;

    return prioritizeFlagsByEnv(localFlag, remoteFlag);
  },
);

export const selectStablecoinLendingServiceInterruptionBannerEnabledFlag =
  createSelector(selectRemoteFeatureFlags, (remoteFeatureFlags) => {
    const localFlag =
      process.env.MM_STABLE_COIN_SERVICE_INTERRUPTION_BANNER_ENABLED === 'true';
    const remoteFlag =
      remoteFeatureFlags?.earnStablecoinLendingServiceInterruptionBannerEnabled as unknown as EarnLaunchDarklyFlag;

    return prioritizeFlagsByEnv(localFlag, remoteFlag);
  });

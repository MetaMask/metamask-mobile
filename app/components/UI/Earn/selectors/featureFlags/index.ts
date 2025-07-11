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

export const prioritizeFlagsByEnv = (
  localFlag: boolean,
  remoteFlag: EarnLaunchDarklyFlag,
) => {
  console.log(
    `--> prioritizeFlagsByEnv(${JSON.stringify(localFlag)}, ${JSON.stringify(
      remoteFlag,
    )}, isProduction=${isProduction()})`,
  );
  let result = false;
  if (isProduction()) {
    result = earnRemoteFeatureFlag(remoteFlag) ?? localFlag;
    console.log(` --> 1. result: ${result}`);
    // Prioritize remote flag in production
    return earnRemoteFeatureFlag(remoteFlag) ?? localFlag;
  }

  result = localFlag ?? earnRemoteFeatureFlag(remoteFlag);
  console.log(` --> 2. result: ${result}`);
  // Prioritize local flag in development
  return localFlag || earnRemoteFeatureFlag(remoteFlag);
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
    console.log(
      `--> selectStablecoinLendingEnabledFlag(${JSON.stringify(
        remoteFeatureFlags,
      )})`,
    );
    const localFlag = process.env.MM_STABLECOIN_LENDING_UI_ENABLED === 'true';
    console.log(` --> localFlag: ${localFlag}`);
    const remoteFlag =
      remoteFeatureFlags?.earnStablecoinLendingEnabled as unknown as EarnLaunchDarklyFlag;

    console.log(` --> remoteFlag: ${JSON.stringify(remoteFlag)}`);
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

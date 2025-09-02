import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '../../../../../selectors/featureFlagController';
import { hasMinimumRequiredVersion } from '../../../../../util/remoteFeatureFlag';
import { PerpsLaunchDarklyFlag } from '../../types';

// TODO: Add tests for fallback logic
const perpsRemoteFeatureFlag = (remoteFlag: PerpsLaunchDarklyFlag) => {
  // If failed to fetch remote flag or flag is misconfigured, return undefined to trigger fallback
  if (
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

export const prioritizeFlagsByEnv = (
  localFlag: boolean,
  remoteFlag: PerpsLaunchDarklyFlag,
) => {
  if (process.env.METAMASK_ENVIRONMENT === 'production') {
    // In production, use remote flag if available, otherwise fall back to local
    return perpsRemoteFeatureFlag(remoteFlag) ?? localFlag;
  }

  // In development, use local flag.
  return localFlag;
};

export const selectPerpsEnabledFlag = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    const localFlag = process.env.MM_PERPS_ENABLED === 'true';
    const remoteFlag =
      remoteFeatureFlags?.perpsPerpTradingEnabled as unknown as PerpsLaunchDarklyFlag;

    return prioritizeFlagsByEnv(localFlag, remoteFlag);
  },
);

export const selectPerpsServiceInterruptionBannerEnabledFlag = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    const localFlag =
      process.env.MM_PERPS_SERVICE_INTERRUPTION_BANNER_ENABLED === 'true';
    const remoteFlag =
      remoteFeatureFlags?.perpsPerpTradingServiceInterruptionBannerEnabled as unknown as PerpsLaunchDarklyFlag;

    return prioritizeFlagsByEnv(localFlag, remoteFlag);
  },
);

export const selectPerpsGtmOnboardingModalEnabledFlag = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    const remoteFlag =
      remoteFeatureFlags?.perpsPerpGtmOnboardingModalEnabled as unknown as PerpsLaunchDarklyFlag;

    return perpsRemoteFeatureFlag(remoteFlag);
  },
);

import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '../../../../../selectors/featureFlagController';
import { hasMinimumRequiredVersion } from '../../../../../util/remoteFeatureFlag';
import { PerpsLaunchDarklyFlag } from '../../types';

const perpsRemoteFeatureFlag = (remoteFlag: PerpsLaunchDarklyFlag) =>
  Boolean(remoteFlag?.enabled) &&
  hasMinimumRequiredVersion(remoteFlag?.minimumVersion);

export const selectPerpsEnabledFlag = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    const remoteFlag =
      remoteFeatureFlags?.perpsPerpTradingEnabled as unknown as PerpsLaunchDarklyFlag;

    return perpsRemoteFeatureFlag(remoteFlag);
  },
);

export const selectPerpsServiceInterruptionBannerEnabledFlag = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    const remoteFlag =
      remoteFeatureFlags?.perpsPerpTradingServiceInterruptionBannerEnabled as unknown as PerpsLaunchDarklyFlag;

    return perpsRemoteFeatureFlag(remoteFlag);
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

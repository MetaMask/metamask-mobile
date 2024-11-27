import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '../.';
import {
  FEATURE_FLAG_NAME,
  FeatureFlagType,
  UndefinedFeatureFlagType,
} from './types';

const featureFlagFallback: FeatureFlagType = {
  [FEATURE_FLAG_NAME]: {
    appMinimumBuild: 1243,
    appleMinimumOS: 6,
    androidMinimumAPIVersion: 21,
  },
};

export const selectMobileMinimumVersions = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    const remoteFeatureFlag = remoteFeatureFlags.find(
      (featureflag) =>
        featureflag[FEATURE_FLAG_NAME]
    );

    const featureFlagValues =
      remoteFeatureFlag as UndefinedFeatureFlagType
      ?? featureFlagFallback;

    return featureFlagValues[FEATURE_FLAG_NAME];
  }
);

export const selectAppMinimumBuild = createSelector(
  selectMobileMinimumVersions,
  (mobileVersions) =>
    mobileVersions?.appMinimumBuild
    ?? featureFlagFallback[FEATURE_FLAG_NAME].appMinimumBuild,
);

export const selectAppleMinimumOS = createSelector(
  selectMobileMinimumVersions,
  (mobileVersions) =>
    mobileVersions?.appleMinimumOS
    ?? featureFlagFallback[FEATURE_FLAG_NAME].appleMinimumOS,
);

export const selectAndroidMinimumAPI = createSelector(
  selectMobileMinimumVersions,
  (mobileVersions) =>
    mobileVersions?.androidMinimumAPIVersion
    ?? featureFlagFallback[FEATURE_FLAG_NAME].androidMinimumAPIVersion,
);

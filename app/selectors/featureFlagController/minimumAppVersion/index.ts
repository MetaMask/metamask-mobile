import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '../.';
import { FEATURE_FLAG_NAME, FeatureFlagType } from './types';

const featureFlagFallback: FeatureFlagType = {
  [FEATURE_FLAG_NAME]: {
    appMinimumBuild: 1024,
    appleMinimumOS: 1025,
    androidMinimumAPIVersion: 1026,
  },
};

export const selectMobileMinimumVersions = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    const remoteFeatureFlag = remoteFeatureFlags.find(
      (remoteFeatureFlag) =>
        remoteFeatureFlag[FEATURE_FLAG_NAME]
    );
    return (
      remoteFeatureFlag as FeatureFlagType
      ?? featureFlagFallback
    )[FEATURE_FLAG_NAME];
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

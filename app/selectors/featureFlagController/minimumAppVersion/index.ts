import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '../.';
import {
  FEATURE_FLAG_NAME,
  FeatureFlagType,
} from './types';

export const defaultValues: FeatureFlagType = {
  appMinimumBuild: 1243,
  appleMinimumOS: 6,
  androidMinimumAPIVersion: 21,
};

export const selectMobileMinimumVersions = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    const remoteFeatureFlag = remoteFeatureFlags[FEATURE_FLAG_NAME];

    const featureFlagValues =
      remoteFeatureFlag
      ?? defaultValues;

    return featureFlagValues as FeatureFlagType;
  }
);

export const selectAppMinimumBuild = createSelector(
  selectMobileMinimumVersions,
  (mobileVersions) => {
    const { appMinimumBuild } = mobileVersions ?? defaultValues;

    return appMinimumBuild;
  }
);

export const selectAppleMinimumOS = createSelector(
  selectMobileMinimumVersions,
  (mobileVersions) => {
    const { appleMinimumOS } = mobileVersions ?? defaultValues;

    return appleMinimumOS;
  }
);

export const selectAndroidMinimumAPI = createSelector(
  selectMobileMinimumVersions,
  (mobileVersions) => {
    const { androidMinimumAPIVersion } = mobileVersions ?? defaultValues;

    return androidMinimumAPIVersion;
  }
);

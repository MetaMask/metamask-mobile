import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '../.';
import { FEATURE_FLAG_NAME, FeatureFlagType } from './types';

export const selectMobileMinimumVersions = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => (remoteFeatureFlags.find((flag) =>
    flag[FEATURE_FLAG_NAME]
  ) as FeatureFlagType | undefined)?.[FEATURE_FLAG_NAME]
);

export const selectAppMinimumBuild = createSelector(
  selectMobileMinimumVersions,
  (mobileVersions) =>
    mobileVersions?.appMinimumBuild,
);

export const selectAppleMinimumOS = createSelector(
  selectMobileMinimumVersions,
  (mobileVersions) =>
    mobileVersions?.appleMinimumOS,
);

export const selectAndroidMinimumAPI = createSelector(
  selectMobileMinimumVersions,
  (mobileVersions) =>
    mobileVersions?.androidMinimumAPIVersion,
);

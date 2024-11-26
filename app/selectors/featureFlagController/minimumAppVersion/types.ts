export const FEATURE_FLAG_NAME = 'mobileMinimumVersions';

export type FeatureFlagType = {
  [FEATURE_FLAG_NAME]: {
    appMinimumBuild: number;
    appleMinimumOS: number;
    androidMinimumAPIVersion: number;
  }
};

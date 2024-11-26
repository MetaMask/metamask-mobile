export const FEATURE_FLAG_NAME = 'mobileMinimumVersion';

export type FeatureFlagType = {
  [FEATURE_FLAG_NAME]: {
    appMinimumBuild: number;
    appleMinimumOS: number;
    androidMinimumAPIVersion: number;
  }
};

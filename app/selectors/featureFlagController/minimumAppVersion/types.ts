export const FEATURE_FLAG_NAME = 'mobileMinimumVersions';

export interface FeatureFlagType {
  appMinimumBuild: number;
  appleMinimumOS: number;
  androidMinimumAPIVersion: number;
}


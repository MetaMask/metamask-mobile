export const FEATURE_FLAG_NAME = 'mobileMinimumVersions';

export interface FeatureFlagType {
  [FEATURE_FLAG_NAME]: {
    appMinimumBuild: number;
    appleMinimumOS: number;
    androidMinimumAPIVersion: number;
  }
}

export type UndefinedFeatureFlagType = FeatureFlagType | undefined

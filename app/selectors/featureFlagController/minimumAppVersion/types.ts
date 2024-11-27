export const FEATURE_FLAG_NAME = 'mobileMinimumVersions';

export interface FeatureFlagType {
  [featureFlagName: string]: {
    appMinimumBuild: number;
    appleMinimumOS: number;
    androidMinimumAPIVersion: number;
  }
}

export type UndefinedFeatureFlagType = FeatureFlagType | undefined

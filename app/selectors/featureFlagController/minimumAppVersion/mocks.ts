import { FEATURE_FLAG_NAME, FeatureFlagType } from "./types";

export const mockedMinimumAppVersion: FeatureFlagType = {
  [FEATURE_FLAG_NAME]: {
    appMinimumBuild: 1025,
    androidMinimumAPIVersion: 29,
    appleMinimumOS: 12,
  }
};

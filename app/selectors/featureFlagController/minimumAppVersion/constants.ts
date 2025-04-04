import { FEATURE_FLAG_NAME, MinimumAppVersionType } from './types';

export const defaultValues: MinimumAppVersionType = {
  appMinimumBuild: 1243,
  appleMinimumOS: 6,
  androidMinimumAPIVersion: 21,
};

export const mockedMinimumAppVersion = {
  [FEATURE_FLAG_NAME]: {
    appMinimumBuild: 1337,
    androidMinimumAPIVersion: 12,
    appleMinimumOS: 2,
  },
};

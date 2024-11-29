import { FEATURE_FLAG_NAME } from './types';

export const mockedMinimumAppVersion = {
  [FEATURE_FLAG_NAME]: {
    appMinimumBuild: 1337,
    androidMinimumAPIVersion: 12,
    appleMinimumOS: 2,
  },
};

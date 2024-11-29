import { FEATURE_FLAG_NAME } from './types';

export const mockedMinimumAppVersion = {
  [FEATURE_FLAG_NAME]: {
    appMinimumBuild: 1025,
    androidMinimumAPIVersion: 29,
    appleMinimumOS: 12,
  },
};

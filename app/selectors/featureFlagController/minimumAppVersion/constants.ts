import { DEFAULT_MOBILE_MINIMUM_VERSIONS } from '../../../constants/featureFlags';
import { FEATURE_FLAG_NAME, MinimumAppVersionType } from './types';

export const defaultValues: MinimumAppVersionType =
  DEFAULT_MOBILE_MINIMUM_VERSIONS;

export const mockedMinimumAppVersion = {
  [FEATURE_FLAG_NAME]: {
    appMinimumBuild: 1337,
    androidMinimumAPIVersion: 12,
    appleMinimumOS: 2,
  },
};

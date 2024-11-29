import { mockedMinimumAppVersion } from './minimumAppVersion/mocks';

export const mockedState = {
  engine: {
    backgroundState: {
      RemoteFeatureFlagController: {
        remoteFeatureFlags: {
          mockedMinimumAppVersion
        },
        cacheTimestamp: 0,
      },
    },
  },
};

export const mockedEmptyFlagsState = {
  engine: {
    backgroundState: {
      RemoteFeatureFlagController: {
        remoteFeatureFlags: {},
        cacheTimestamp: 0,
      },
    },
  },
};

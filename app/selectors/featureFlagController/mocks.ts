import { FeatureFlags } from '@metamask/remote-feature-flag-controller';
import { mockedMinimumAppVersion } from './minimumAppVersion/constants';
import { mockedEarnFeatureFlagsEnabledState } from '../../components/UI/Earn/__mocks__/earnMockData';

export const mockedState = {
  engine: {
    backgroundState: {
      RemoteFeatureFlagController: {
        remoteFeatureFlags: {
          ...mockedMinimumAppVersion,
          ...mockedEarnFeatureFlagsEnabledState,
          productSafetyDappScanning: true,
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

export const mockedUndefinedFlagsState = {
  engine: {
    backgroundState: {
      RemoteFeatureFlagController: undefined,
    },
  },
};

export const getInvalidMockedFeatureFlag = (
  invalidFeatureFlag: FeatureFlags,
) => ({
  engine: {
    backgroundState: {
      RemoteFeatureFlagController: {
        remoteFeatureFlags: {
          ...invalidFeatureFlag,
        },
        cacheTimestamp: 0,
      },
    },
  },
});

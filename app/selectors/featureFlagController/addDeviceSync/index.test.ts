import { selectAddDeviceSyncEnabled } from '.';
import mockedEngine from '../../../core/__mocks__/MockedEngine';
import { mockedEmptyFlagsState, mockedUndefinedFlagsState } from '../mocks';
import {
  ADD_DEVICE_SYNC_MINIMUM_VERSION,
  FeatureFlagNames,
} from '../../../constants/featureFlags';
import { getVersion } from 'react-native-device-info';

jest.mock('../../../core/Engine', () => ({
  init: () => mockedEngine.init(),
}));

jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn().mockReturnValue('1.0.0'),
}));

jest.mock(
  '../../../core/Engine/controllers/remote-feature-flag-controller',
  () => ({
    isRemoteFeatureFlagOverrideActivated: false,
  }),
);

describe('Add Device Sync feature flag selector (version-gated)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getVersion as jest.MockedFunction<typeof getVersion>).mockReturnValue(
      ADD_DEVICE_SYNC_MINIMUM_VERSION,
    );
  });

  it('returns true when enabled and minimum version requirement passes', () => {
    const state = {
      engine: {
        backgroundState: {
          RemoteFeatureFlagController: {
            remoteFeatureFlags: {
              [FeatureFlagNames.addDeviceSyncEnabled]: {
                enabled: true,
                minimumVersion: ADD_DEVICE_SYNC_MINIMUM_VERSION,
              },
            },
            cacheTimestamp: 0,
          },
        },
      },
    };

    expect(selectAddDeviceSyncEnabled(state)).toBe(true);
  });

  it('returns false when enabled but minimum version requirement fails', () => {
    (getVersion as jest.MockedFunction<typeof getVersion>).mockReturnValue(
      '1.0.0',
    );

    const state = {
      engine: {
        backgroundState: {
          RemoteFeatureFlagController: {
            remoteFeatureFlags: {
              [FeatureFlagNames.addDeviceSyncEnabled]: {
                enabled: true,
                minimumVersion: '99.0.0',
              },
            },
            cacheTimestamp: 0,
          },
        },
      },
    };

    expect(selectAddDeviceSyncEnabled(state)).toBe(false);
  });

  it('returns false when disabled regardless of version', () => {
    const state = {
      engine: {
        backgroundState: {
          RemoteFeatureFlagController: {
            remoteFeatureFlags: {
              [FeatureFlagNames.addDeviceSyncEnabled]: {
                enabled: false,
                minimumVersion: '0.0.0',
              },
            },
            cacheTimestamp: 0,
          },
        },
      },
    };

    expect(selectAddDeviceSyncEnabled(state)).toBe(false);
  });

  it('returns false when remote flag is missing', () => {
    const state = {
      engine: {
        backgroundState: {
          RemoteFeatureFlagController: {
            remoteFeatureFlags: {
              someOtherFlag: true,
            },
            cacheTimestamp: 0,
          },
        },
      },
    };

    expect(selectAddDeviceSyncEnabled(state)).toBe(false);
  });

  it('returns false when feature flag state is empty', () => {
    expect(selectAddDeviceSyncEnabled(mockedEmptyFlagsState)).toBe(false);
  });

  it('returns false when RemoteFeatureFlagController state is undefined', () => {
    expect(selectAddDeviceSyncEnabled(mockedUndefinedFlagsState)).toBe(false);
  });

  it('supports boolean dev-tool overrides when true', () => {
    const state = {
      engine: {
        backgroundState: {
          RemoteFeatureFlagController: {
            remoteFeatureFlags: {
              [FeatureFlagNames.addDeviceSyncEnabled]: true,
            },
            cacheTimestamp: 0,
          },
        },
      },
    };

    expect(selectAddDeviceSyncEnabled(state)).toBe(true);
  });

  it('supports boolean dev-tool overrides when false', () => {
    const state = {
      engine: {
        backgroundState: {
          RemoteFeatureFlagController: {
            remoteFeatureFlags: {
              [FeatureFlagNames.addDeviceSyncEnabled]: false,
            },
            cacheTimestamp: 0,
          },
        },
      },
    };

    expect(selectAddDeviceSyncEnabled(state)).toBe(false);
  });

  it('returns false when flag has invalid shape', () => {
    const state = {
      engine: {
        backgroundState: {
          RemoteFeatureFlagController: {
            remoteFeatureFlags: {
              [FeatureFlagNames.addDeviceSyncEnabled]: {
                enabled: 'true',
                minimumVersion: 100,
              },
            },
            cacheTimestamp: 0,
          },
        },
      },
    };

    expect(selectAddDeviceSyncEnabled(state)).toBe(false);
  });
});

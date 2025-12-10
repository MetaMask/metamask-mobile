import { selectTrxStakingEnabled } from '.';
import mockedEngine from '../../../core/__mocks__/MockedEngine';
import { mockedEmptyFlagsState, mockedUndefinedFlagsState } from '../mocks';
import { getVersion } from 'react-native-device-info';
// eslint-disable-next-line import/no-namespace
import * as remoteFeatureFlagModule from '../../../util/remoteFeatureFlag';

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

const originalEnv = process.env;

describe('TRX Staking Feature Flag Selector (version-gated)', () => {
  let mockHasMinimumRequiredVersion: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };

    mockHasMinimumRequiredVersion = jest.spyOn(
      remoteFeatureFlagModule,
      'hasMinimumRequiredVersion',
    );
    mockHasMinimumRequiredVersion.mockReturnValue(true);
    (getVersion as jest.MockedFunction<typeof getVersion>).mockReturnValue(
      '1.0.0',
    );
  });

  afterEach(() => {
    process.env = originalEnv;
    mockHasMinimumRequiredVersion?.mockRestore();
  });

  it('returns true when trxStakingEnabled is enabled and minimum version requirement passes', () => {
    const state = {
      engine: {
        backgroundState: {
          RemoteFeatureFlagController: {
            remoteFeatureFlags: {
              trxStakingEnabled: { enabled: true, minimumVersion: '1.0.0' },
            },
            cacheTimestamp: 0,
          },
        },
      },
    };

    const result = selectTrxStakingEnabled(state);

    expect(result).toBe(true);
  });

  it('returns false when trxStakingEnabled is enabled but minimum version requirement fails', () => {
    mockHasMinimumRequiredVersion.mockReturnValue(false);

    const state = {
      engine: {
        backgroundState: {
          RemoteFeatureFlagController: {
            remoteFeatureFlags: {
              trxStakingEnabled: { enabled: true, minimumVersion: '99.0.0' },
            },
            cacheTimestamp: 0,
          },
        },
      },
    };

    const result = selectTrxStakingEnabled(state);

    expect(result).toBe(false);
  });

  it('returns false when trxStakingEnabled is disabled regardless of version', () => {
    const state = {
      engine: {
        backgroundState: {
          RemoteFeatureFlagController: {
            remoteFeatureFlags: {
              trxStakingEnabled: { enabled: false, minimumVersion: '0.0.0' },
            },
            cacheTimestamp: 0,
          },
        },
      },
    };

    const result = selectTrxStakingEnabled(state);

    expect(result).toBe(false);
    expect(mockHasMinimumRequiredVersion).not.toHaveBeenCalled();
  });

  it('returns false when trxStakingEnabled flag is missing', () => {
    const result = selectTrxStakingEnabled({
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
    });

    expect(result).toBe(false);
  });

  it('returns false when feature flag state is empty', () => {
    const result = selectTrxStakingEnabled(mockedEmptyFlagsState);

    expect(result).toBe(false);
  });

  it('returns false when RemoteFeatureFlagController state is undefined', () => {
    const result = selectTrxStakingEnabled(mockedUndefinedFlagsState);

    expect(result).toBe(false);
  });

  it('returns false when trxStakingEnabled has wrong property types', () => {
    const state = {
      engine: {
        backgroundState: {
          RemoteFeatureFlagController: {
            remoteFeatureFlags: {
              trxStakingEnabled: {
                enabled: 'true',
                minimumVersion: 100,
              },
            },
            cacheTimestamp: 0,
          },
        },
      },
    };

    const result = selectTrxStakingEnabled(state);

    expect(result).toBe(false);
  });

  it('returns false when trxStakingEnabled is null', () => {
    const state = {
      engine: {
        backgroundState: {
          RemoteFeatureFlagController: {
            remoteFeatureFlags: {
              trxStakingEnabled: null,
            },
            cacheTimestamp: 0,
          },
        },
      },
    };

    const result = selectTrxStakingEnabled(state);

    expect(result).toBe(false);
  });
});

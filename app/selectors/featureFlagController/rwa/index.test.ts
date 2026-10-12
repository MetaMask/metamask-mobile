import { selectRWAEnabledFlag } from '.';
import mockedEngine from '../../../core/__mocks__/MockedEngine';
import { mockedEmptyFlagsState, mockedUndefinedFlagsState } from '../mocks';

jest.mock('../../../core/Engine', () => ({
  init: () => mockedEngine.init(),
}));

const originalEnv = process.env;
beforeEach(() => {
  jest.resetModules();
  process.env = { ...originalEnv };
});

afterEach(() => {
  process.env = originalEnv;
  jest.clearAllMocks();
});

const mockedStateWithRWAEnabled = {
  engine: {
    backgroundState: {
      RemoteFeatureFlagController: {
        remoteFeatureFlags: {
          rwaTokensEnabled: true,
        },
        cacheTimestamp: 0,
      },
    },
  },
};

const mockedStateWithRWADisabled = {
  engine: {
    backgroundState: {
      RemoteFeatureFlagController: {
        remoteFeatureFlags: {
          rwaTokensEnabled: false,
        },
        cacheTimestamp: 0,
      },
    },
  },
};

const mockedStateWithoutRWAFlag = {
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

describe('RWA Feature Flag Selector', () => {
  it('returns true when rwaTokensEnabled feature flag is enabled', () => {
    const result = selectRWAEnabledFlag(mockedStateWithRWAEnabled);

    expect(result).toBe(true);
  });

  it('returns false when rwaTokensEnabled feature flag is explicitly disabled', () => {
    const result = selectRWAEnabledFlag(mockedStateWithRWADisabled);

    expect(result).toBe(false);
  });

  it('returns DEFAULT_RWA_ENABLED (false) when rwaTokensEnabled feature flag property is missing', () => {
    const result = selectRWAEnabledFlag(mockedStateWithoutRWAFlag);

    expect(result).toBe(false);
  });

  it('returns DEFAULT_RWA_ENABLED (false) when feature flag state is empty', () => {
    const result = selectRWAEnabledFlag(mockedEmptyFlagsState);

    expect(result).toBe(false);
  });

  it('returns DEFAULT_RWA_ENABLED (false) when RemoteFeatureFlagController state is undefined', () => {
    const result = selectRWAEnabledFlag(mockedUndefinedFlagsState);

    expect(result).toBe(false);
  });

  it('handles null values correctly', () => {
    const stateWithNullFlag = {
      engine: {
        backgroundState: {
          RemoteFeatureFlagController: {
            remoteFeatureFlags: {
              rwaTokensEnabled: null,
            },
            cacheTimestamp: 0,
          },
        },
      },
    };

    const result = selectRWAEnabledFlag(stateWithNullFlag);

    expect(result).toBeNull();
  });
});

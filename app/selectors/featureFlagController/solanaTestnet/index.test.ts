import { selectIsSolanaTestnetEnabled } from '.';
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

const mockedStateWithSolanaTestnetsEnabled = {
  engine: {
    backgroundState: {
      RemoteFeatureFlagController: {
        remoteFeatureFlags: {
          solanaTestnetsEnabled: true,
        },
        cacheTimestamp: 0,
      },
    },
  },
};

const mockedStateWithSolanaTestnetsDisabled = {
  engine: {
    backgroundState: {
      RemoteFeatureFlagController: {
        remoteFeatureFlags: {
          solanaTestnetsEnabled: false,
        },
        cacheTimestamp: 0,
      },
    },
  },
};

const mockedStateWithoutSolanaTestnetsFlag = {
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

describe('Solana Testnet Feature Flag Selector', () => {
  it('returns true when solanaTestnetsEnabled feature flag is enabled', () => {
    const result = selectIsSolanaTestnetEnabled(
      mockedStateWithSolanaTestnetsEnabled,
    );

    expect(result).toBe(true);
  });

  it('returns false when solanaTestnetsEnabled feature flag is explicitly disabled', () => {
    const result = selectIsSolanaTestnetEnabled(
      mockedStateWithSolanaTestnetsDisabled,
    );

    expect(result).toBe(false);
  });

  it('returns undefined when solanaTestnetsEnabled feature flag property is missing', () => {
    const result = selectIsSolanaTestnetEnabled(
      mockedStateWithoutSolanaTestnetsFlag,
    );

    expect(result).toBeUndefined();
  });

  it('returns undefined when feature flag state is empty', () => {
    const result = selectIsSolanaTestnetEnabled(mockedEmptyFlagsState);

    expect(result).toBeUndefined();
  });

  it('returns undefined when RemoteFeatureFlagController state is undefined', () => {
    const result = selectIsSolanaTestnetEnabled(mockedUndefinedFlagsState);

    expect(result).toBeUndefined();
  });

  it('handles null values correctly', () => {
    const stateWithNullFlag = {
      engine: {
        backgroundState: {
          RemoteFeatureFlagController: {
            remoteFeatureFlags: {
              solanaTestnetsEnabled: null,
            },
            cacheTimestamp: 0,
          },
        },
      },
    };

    const result = selectIsSolanaTestnetEnabled(stateWithNullFlag);

    expect(result).toBeNull();
  });
});

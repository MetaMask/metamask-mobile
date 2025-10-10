import { selectIsBitcoinTestnetEnabled } from '.';
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

const mockedStateWithBitcoinTestnetsEnabled = {
  engine: {
    backgroundState: {
      RemoteFeatureFlagController: {
        remoteFeatureFlags: {
          bitcoinTestnetsEnabled: true,
        },
        cacheTimestamp: 0,
      },
    },
  },
};

const mockedStateWithBitcoinTestnetsDisabled = {
  engine: {
    backgroundState: {
      RemoteFeatureFlagController: {
        remoteFeatureFlags: {
          bitcoinTestnetsEnabled: false,
        },
        cacheTimestamp: 0,
      },
    },
  },
};

const mockedStateWithoutBitcoinTestnetsFlag = {
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

describe('Bitcoin Testnet Feature Flag Selector', () => {
  it('returns true when bitcoinTestnetsEnabled feature flag is enabled', () => {
    const result = selectIsBitcoinTestnetEnabled(
      mockedStateWithBitcoinTestnetsEnabled,
    );

    expect(result).toBe(true);
  });

  it('returns false when bitcoinTestnetsEnabled feature flag is explicitly disabled', () => {
    const result = selectIsBitcoinTestnetEnabled(
      mockedStateWithBitcoinTestnetsDisabled,
    );

    expect(result).toBe(false);
  });

  it('returns undefined when bitcoinTestnetsEnabled feature flag property is missing', () => {
    const result = selectIsBitcoinTestnetEnabled(
      mockedStateWithoutBitcoinTestnetsFlag,
    );

    expect(result).toBeUndefined();
  });

  it('returns undefined when feature flag state is empty', () => {
    const result = selectIsBitcoinTestnetEnabled(mockedEmptyFlagsState);

    expect(result).toBeUndefined();
  });

  it('returns undefined when RemoteFeatureFlagController state is undefined', () => {
    const result = selectIsBitcoinTestnetEnabled(mockedUndefinedFlagsState);

    expect(result).toBeUndefined();
  });

  it('handles null values correctly', () => {
    const stateWithNullFlag = {
      engine: {
        backgroundState: {
          RemoteFeatureFlagController: {
            remoteFeatureFlags: {
              bitcoinTestnetsEnabled: null,
            },
            cacheTimestamp: 0,
          },
        },
      },
    };

    const result = selectIsBitcoinTestnetEnabled(stateWithNullFlag);

    expect(result).toBeNull();
  });
});

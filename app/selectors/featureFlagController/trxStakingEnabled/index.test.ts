import { selectTrxStakingEnabled } from '.';
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

const mockedStateWithTrxStakingEnabled = {
  engine: {
    backgroundState: {
      RemoteFeatureFlagController: {
        remoteFeatureFlags: {
          trxStakingEnabled: true,
        },
        cacheTimestamp: 0,
      },
    },
  },
};

const mockedStateWithTrxStakingDisabled = {
  engine: {
    backgroundState: {
      RemoteFeatureFlagController: {
        remoteFeatureFlags: {
          trxStakingEnabled: false,
        },
        cacheTimestamp: 0,
      },
    },
  },
};

const mockedStateWithoutTrxStakingFlag = {
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

describe('TRX Staking Feature Flag Selector', () => {
  it('returns true when bitcoinTestnetsEnabled feature flag is enabled', () => {
    const result = selectTrxStakingEnabled(mockedStateWithTrxStakingEnabled);

    expect(result).toBe(true);
  });

  it('returns false when trxStakingEnabled feature flag is explicitly disabled', () => {
    const result = selectTrxStakingEnabled(mockedStateWithTrxStakingDisabled);

    expect(result).toBe(false);
  });

  it('returns undefined when trxStakingEnabled feature flag property is missing', () => {
    const result = selectTrxStakingEnabled(mockedStateWithoutTrxStakingFlag);

    expect(result).toBeUndefined();
  });

  it('returns undefined when feature flag state is empty', () => {
    const result = selectTrxStakingEnabled(mockedEmptyFlagsState);

    expect(result).toBeUndefined();
  });

  it('returns undefined when RemoteFeatureFlagController state is undefined', () => {
    const result = selectTrxStakingEnabled(mockedUndefinedFlagsState);

    expect(result).toBeUndefined();
  });

  it('handles null values correctly', () => {
    const stateWithNullFlag = {
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

    const result = selectTrxStakingEnabled(stateWithNullFlag);

    expect(result).toBeNull();
  });
});

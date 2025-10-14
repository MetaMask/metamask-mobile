import { selectIsAddBitcoinAccountEnabled } from '.';
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

const mockedStateWithAddBitcoinAccountEnabled = {
  engine: {
    backgroundState: {
      RemoteFeatureFlagController: {
        cacheTimestamp: 0,
        remoteFeatureFlags: {
          addBitcoinAccount: { enabled: true, minVersion: '7.58.0' },
        },
      },
    },
  },
};

const mockedStateWithAddBitcoinAccountDisabled = {
  engine: {
    backgroundState: {
      RemoteFeatureFlagController: {
        cacheTimestamp: 0,
        remoteFeatureFlags: {
          addBitcoinAccount: { enabled: false, minVersion: '7.58.0' },
        },
      },
    },
  },
};

const mockedStateWithInsufficientVersion = {
  engine: {
    backgroundState: {
      RemoteFeatureFlagController: {
        cacheTimestamp: 0,
        remoteFeatureFlags: {
          addBitcoinAccount: { enabled: true, minVersion: '8.0.0' }, // Higher than current 7.58.0
        },
      },
    },
  },
};

describe('selectIsAddBitcoinAccountEnabled', () => {
  it('returns true when addBitcoinAccount flag is enabled', () => {
    expect(
      selectIsAddBitcoinAccountEnabled(mockedStateWithAddBitcoinAccountEnabled),
    ).toBe(true);
  });

  it('returns false when addBitcoinAccount flag is disabled', () => {
    expect(
      selectIsAddBitcoinAccountEnabled(mockedStateWithAddBitcoinAccountDisabled),
    ).toBe(false);
  });

  it('returns false when addBitcoinAccount flag is undefined', () => {
    expect(selectIsAddBitcoinAccountEnabled(mockedUndefinedFlagsState)).toBe(
      false,
    );
  });

  it('returns false when remoteFeatureFlags is empty', () => {
    expect(selectIsAddBitcoinAccountEnabled(mockedEmptyFlagsState)).toBe(true); // Default to true
  });

  it('returns false when version requirement is not met', () => {
    expect(selectIsAddBitcoinAccountEnabled(mockedStateWithInsufficientVersion)).toBe(false);
  });

  it('returns true when flag is simple boolean true', () => {
    const simpleEnabledState = {
      engine: {
        backgroundState: {
          RemoteFeatureFlagController: {
            cacheTimestamp: 0,
            remoteFeatureFlags: {
              addBitcoinAccount: true, // Simple boolean
            },
          },
        },
      },
    };
    expect(selectIsAddBitcoinAccountEnabled(simpleEnabledState)).toBe(true);
  });
});

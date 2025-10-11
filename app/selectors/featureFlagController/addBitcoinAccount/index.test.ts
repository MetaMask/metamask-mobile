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
          addBitcoinAccount: true,
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
          addBitcoinAccount: false,
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
    expect(selectIsAddBitcoinAccountEnabled(mockedEmptyFlagsState)).toBe(false);
  });
});

import { selectIsBitcoinAccountsEnabled } from '.';
import mockedEngine from '../../../core/__mocks__/MockedEngine';
import { mockedEmptyFlagsState, mockedUndefinedFlagsState } from '../mocks';
import packageJson from '../../../../package.json';

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

const mockedStateWithBitcoinAccountsEnabled = {
  engine: {
    backgroundState: {
      RemoteFeatureFlagController: {
        cacheTimestamp: 0,
        remoteFeatureFlags: {
          bitcoinAccounts: {
            enabled: true,
            minimumVersion: '1.0.0',
          },
        },
      },
    },
  },
};

const mockedStateWithBitcoinAccountsDisabled = {
  engine: {
    backgroundState: {
      RemoteFeatureFlagController: {
        cacheTimestamp: 0,
        remoteFeatureFlags: {
          bitcoinAccounts: {
            enabled: false,
            minimumVersion: '1.0.0',
          },
        },
      },
    },
  },
};

const mockedStateWithVersionTooHigh = {
  engine: {
    backgroundState: {
      RemoteFeatureFlagController: {
        cacheTimestamp: 0,
        remoteFeatureFlags: {
          bitcoinAccounts: {
            enabled: true,
            minimumVersion: '999.999.999',
          },
        },
      },
    },
  },
};

describe('selectIsBitcoinAccountsEnabled', () => {
  it('returns true when bitcoinAccounts flag is enabled and version meets minimum', () => {
    expect(
      selectIsBitcoinAccountsEnabled(mockedStateWithBitcoinAccountsEnabled),
    ).toBe(true);
  });

  it('returns false when bitcoinAccounts flag is disabled', () => {
    expect(
      selectIsBitcoinAccountsEnabled(mockedStateWithBitcoinAccountsDisabled),
    ).toBe(false);
  });

  it('returns false when bitcoinAccounts flag is undefined', () => {
    expect(selectIsBitcoinAccountsEnabled(mockedUndefinedFlagsState)).toBe(
      false,
    );
  });

  it('returns false when bitcoinAccounts flag is empty', () => {
    expect(selectIsBitcoinAccountsEnabled(mockedEmptyFlagsState)).toBe(false);
  });

  it('returns false when app version is below minimum version', () => {
    expect(selectIsBitcoinAccountsEnabled(mockedStateWithVersionTooHigh)).toBe(
      false,
    );
  });

  it('returns true when app version equals minimum version', () => {
    const currentVersion = packageJson.version;
    const mockedStateWithCurrentVersion = {
      engine: {
        backgroundState: {
          RemoteFeatureFlagController: {
            cacheTimestamp: 0,
            remoteFeatureFlags: {
              bitcoinAccounts: {
                enabled: true,
                minimumVersion: currentVersion,
              },
            },
          },
        },
      },
    };

    expect(selectIsBitcoinAccountsEnabled(mockedStateWithCurrentVersion)).toBe(
      true,
    );
  });

  it('returns false when flag structure is invalid', () => {
    const mockedStateWithInvalidFlag = {
      engine: {
        backgroundState: {
          RemoteFeatureFlagController: {
            cacheTimestamp: 0,
            remoteFeatureFlags: {
              bitcoinAccounts: {
                enabled: true,
                // Missing minimumVersion - should return false for safety
              },
            },
          },
        },
      },
    };

    expect(selectIsBitcoinAccountsEnabled(mockedStateWithInvalidFlag)).toBe(
      false,
    );
  });
});

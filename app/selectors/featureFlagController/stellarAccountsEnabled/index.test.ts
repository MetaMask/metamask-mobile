import { selectIsStellarAccountsEnabled } from '.';
import mockedEngine from '../../../core/__mocks__/MockedEngine';
import { mockedEmptyFlagsState, mockedUndefinedFlagsState } from '../mocks';
import packageJson from '../../../../package.json';
import type { StellarAccountsFeatureFlag } from '../../../multichain-stellar/remote-feature-flag';
import { FeatureFlags } from '@metamask/remote-feature-flag-controller';

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

// Helper function to create mock state with stellarAccounts flag
function mockStateWith(stellarAccounts: StellarAccountsFeatureFlag) {
  return {
    engine: {
      backgroundState: {
        RemoteFeatureFlagController: {
          cacheTimestamp: 0,
          remoteFeatureFlags: {
            stellarAccounts,
            // Not sure why this cannot be inferred properly.
          } as unknown as FeatureFlags,
        },
      },
    },
  };
}

describe('selectIsStellarAccountsEnabled', () => {
  it('returns true when stellarAccounts flag is enabled and version meets minimum', () => {
    const mockedState = mockStateWith({
      enabled: true,
      minimumVersion: '1.0.0',
    });

    expect(selectIsStellarAccountsEnabled(mockedState)).toBe(true);
  });

  it('returns false when stellarAccounts flag is disabled', () => {
    const mockedState = mockStateWith({
      enabled: false,
      minimumVersion: '1.0.0',
    });

    expect(selectIsStellarAccountsEnabled(mockedState)).toBe(false);
  });

  it('returns false when stellarAccounts flag is undefined', () => {
    expect(selectIsStellarAccountsEnabled(mockedUndefinedFlagsState)).toBe(
      false,
    );
  });

  it('returns false when stellarAccounts flag is empty', () => {
    expect(selectIsStellarAccountsEnabled(mockedEmptyFlagsState)).toBe(false);
  });

  it('returns false when app version is below minimum version', () => {
    const mockedState = mockStateWith({
      enabled: true,
      minimumVersion: '999.999.999',
    });

    expect(selectIsStellarAccountsEnabled(mockedState)).toBe(false);
  });

  it('returns true when app version equals minimum version', () => {
    const currentVersion = packageJson.version;
    const mockedState = mockStateWith({
      enabled: true,
      minimumVersion: currentVersion,
    });

    expect(selectIsStellarAccountsEnabled(mockedState)).toBe(true);
  });

  it('returns false when flag structure is invalid', () => {
    // @ts-expect-error - Testing error case.
    const mockedState = mockStateWith({
      enabled: true,
      // Missing minimumVersion - should return false for safety
    });

    expect(selectIsStellarAccountsEnabled(mockedState)).toBe(false);
  });
});

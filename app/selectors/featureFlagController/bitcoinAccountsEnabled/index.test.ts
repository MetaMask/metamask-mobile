import { selectIsBitcoinAccountsEnabled } from '.';
import mockedEngine from '../../../core/__mocks__/MockedEngine';
import { mockedEmptyFlagsState, mockedUndefinedFlagsState } from '../mocks';
import packageJson from '../../../../package.json';
import type { BitcoinAccountsFeatureFlag } from '../../../multichain-bitcoin/remote-feature-flag';
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

// Helper function to create mock state with bitcoinAccounts flag
function mockStateWith(bitcoinAccounts: BitcoinAccountsFeatureFlag) {
  return {
    engine: {
      backgroundState: {
        RemoteFeatureFlagController: {
          cacheTimestamp: 0,
          remoteFeatureFlags: {
            bitcoinAccounts,
            // Not sure why this cannot be inferred properly.
          } as unknown as FeatureFlags,
        },
      },
    },
  };
}

describe('selectIsBitcoinAccountsEnabled', () => {
  it('returns true when bitcoinAccounts flag is enabled and version meets minimum', () => {
    const mockedState = mockStateWith({
      enabled: true,
      minimumVersion: '1.0.0',
    });

    expect(selectIsBitcoinAccountsEnabled(mockedState)).toBe(true);
  });

  it('returns false when bitcoinAccounts flag is disabled', () => {
    const mockedState = mockStateWith({
      enabled: false,
      minimumVersion: '1.0.0',
    });

    expect(selectIsBitcoinAccountsEnabled(mockedState)).toBe(false);
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
    const mockedState = mockStateWith({
      enabled: true,
      minimumVersion: '999.999.999',
    });

    expect(selectIsBitcoinAccountsEnabled(mockedState)).toBe(false);
  });

  it('returns true when app version equals minimum version', () => {
    const currentVersion = packageJson.version;
    const mockedState = mockStateWith({
      enabled: true,
      minimumVersion: currentVersion,
    });

    expect(selectIsBitcoinAccountsEnabled(mockedState)).toBe(true);
  });

  it('returns false when flag structure is invalid', () => {
    // @ts-expect-error - Testing error case.
    const mockedState = mockStateWith({
      enabled: true,
      // Missing minimumVersion - should return false for safety
    });

    expect(selectIsBitcoinAccountsEnabled(mockedState)).toBe(false);
  });
});

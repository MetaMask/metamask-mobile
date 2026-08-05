import packageJson from '../../package.json';
import {
  isStellarAccountsFeatureEnabled,
  type StellarAccountsFeatureFlag,
} from './remote-feature-flag';

describe('isStellarAccountsFeatureEnabled', () => {
  it('returns true when flag is enabled and version meets minimum', () => {
    const flag: StellarAccountsFeatureFlag = {
      enabled: true,
      minimumVersion: '1.0.0',
    };

    expect(isStellarAccountsFeatureEnabled(flag)).toBe(true);
  });

  it('returns false when flag is disabled', () => {
    const flag: StellarAccountsFeatureFlag = {
      enabled: false,
      minimumVersion: '1.0.0',
    };

    expect(isStellarAccountsFeatureEnabled(flag)).toBe(false);
  });

  it('returns false when flag is undefined', () => {
    expect(isStellarAccountsFeatureEnabled(undefined)).toBe(false);
  });

  it('returns false when flag is null', () => {
    expect(isStellarAccountsFeatureEnabled(null)).toBe(false);
  });

  it('returns false when app version is below minimum version', () => {
    const flag: StellarAccountsFeatureFlag = {
      enabled: true,
      minimumVersion: '999.999.999',
    };

    expect(isStellarAccountsFeatureEnabled(flag)).toBe(false);
  });

  it('returns true when app version equals minimum version', () => {
    const flag: StellarAccountsFeatureFlag = {
      enabled: true,
      minimumVersion: packageJson.version,
    };

    expect(isStellarAccountsFeatureEnabled(flag)).toBe(true);
  });

  it('returns false when flag structure is invalid', () => {
    expect(
      isStellarAccountsFeatureEnabled({
        enabled: true,
      }),
    ).toBe(false);
  });

  it('returns true for simple boolean flag', () => {
    expect(isStellarAccountsFeatureEnabled(true)).toBe(true);
    expect(isStellarAccountsFeatureEnabled(false)).toBe(false);
  });
});

import { isStellarAccountsFeatureEnabled } from './remote-feature-flag';

describe('isStellarAccountsFeatureEnabled', () => {
  it('returns false when flag value is missing', () => {
    expect(isStellarAccountsFeatureEnabled(null)).toBe(false);
    expect(isStellarAccountsFeatureEnabled(undefined)).toBe(false);
  });

  it('returns boolean flag values directly', () => {
    expect(isStellarAccountsFeatureEnabled(true)).toBe(true);
    expect(isStellarAccountsFeatureEnabled(false)).toBe(false);
  });

  it('returns false when enabled but minimumVersion is missing', () => {
    expect(
      isStellarAccountsFeatureEnabled({ enabled: true, minimumVersion: null }),
    ).toBe(false);
  });

  it('returns false when flag is disabled', () => {
    expect(
      isStellarAccountsFeatureEnabled({
        enabled: false,
        minimumVersion: '1.0.0',
      }),
    ).toBe(false);
  });

  it('returns true when app version meets minimumVersion', () => {
    expect(
      isStellarAccountsFeatureEnabled({
        enabled: true,
        minimumVersion: '0.0.1',
      }),
    ).toBe(true);
  });

  it('returns false when app version is below minimumVersion', () => {
    expect(
      isStellarAccountsFeatureEnabled({
        enabled: true,
        minimumVersion: '999.999.999',
      }),
    ).toBe(false);
  });

  it('returns false for invalid flag structure', () => {
    expect(isStellarAccountsFeatureEnabled({ enabled: true })).toBe(false);
  });
});

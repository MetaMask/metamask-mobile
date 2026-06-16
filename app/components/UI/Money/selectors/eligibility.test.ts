import { selectIsMoneyAccountGeoEligible } from './eligibility';
import type { RootState } from '../../../../reducers';

describe('selectIsMoneyAccountGeoEligible', () => {
  const createStateWithGeolocation = (
    geolocation: string | null | undefined,
    remoteFeatureFlags: Record<string, unknown> = {},
  ) =>
    ({
      engine: {
        backgroundState: {
          RemoteFeatureFlagController: {
            remoteFeatureFlags,
            cacheTimestamp: 0,
          },
          GeolocationController: {
            location: geolocation,
          },
        },
      },
    }) as unknown as RootState;

  const noBlockedCountriesFlags = {
    moneyAccountGeoBlockedCountries: { blockedRegions: [] },
  };

  const gbBlockedFlags = {
    moneyAccountGeoBlockedCountries: { blockedRegions: ['GB'] },
  };

  const gbUsBlockedFlags = {
    moneyAccountGeoBlockedCountries: { blockedRegions: ['GB', 'US'] },
  };

  it('returns false when geolocation is undefined (loading state)', () => {
    const state = createStateWithGeolocation(undefined, gbBlockedFlags);

    const result = selectIsMoneyAccountGeoEligible(state);

    expect(result).toBe(false);
  });

  it('returns false when geolocation is null', () => {
    const state = createStateWithGeolocation(null, gbBlockedFlags);

    const result = selectIsMoneyAccountGeoEligible(state);

    expect(result).toBe(false);
  });

  it('returns false when geolocation is UNKNOWN', () => {
    const state = createStateWithGeolocation('UNKNOWN', gbBlockedFlags);

    const result = selectIsMoneyAccountGeoEligible(state);

    expect(result).toBe(false);
  });

  it('returns false when user country is in the blocked list', () => {
    const state = createStateWithGeolocation('GB', gbBlockedFlags);

    const result = selectIsMoneyAccountGeoEligible(state);

    expect(result).toBe(false);
  });

  it('returns false when country-region code matches a blocked country', () => {
    const state = createStateWithGeolocation('GB-ENG', gbBlockedFlags);

    const result = selectIsMoneyAccountGeoEligible(state);

    expect(result).toBe(false);
  });

  it('returns false when user is in one of multiple blocked countries', () => {
    const state = createStateWithGeolocation('US', gbUsBlockedFlags);

    const result = selectIsMoneyAccountGeoEligible(state);

    expect(result).toBe(false);
  });

  it('returns true when user country is not in the blocked list', () => {
    const state = createStateWithGeolocation('US', gbBlockedFlags);

    const result = selectIsMoneyAccountGeoEligible(state);

    expect(result).toBe(true);
  });

  it('returns true when the blocked countries list is empty', () => {
    const state = createStateWithGeolocation('GB', noBlockedCountriesFlags);

    const result = selectIsMoneyAccountGeoEligible(state);

    expect(result).toBe(true);
  });

  it('comparison is case-insensitive for geolocation codes', () => {
    const state = createStateWithGeolocation('gb', gbBlockedFlags);

    const result = selectIsMoneyAccountGeoEligible(state);

    expect(result).toBe(false);
  });

  it('comparison is case-insensitive for blocked country codes', () => {
    const lowercaseBlockedFlags = {
      moneyAccountGeoBlockedCountries: { blockedRegions: ['gb'] },
    };
    const state = createStateWithGeolocation('GB', lowercaseBlockedFlags);

    const result = selectIsMoneyAccountGeoEligible(state);

    expect(result).toBe(false);
  });

  it('returns true when user country-region does not match any blocked country', () => {
    const state = createStateWithGeolocation('US-CA', gbBlockedFlags);

    const result = selectIsMoneyAccountGeoEligible(state);

    expect(result).toBe(true);
  });

  it('defaults to blocking GB when no remote flag and no env var is set', () => {
    const originalEnv = process.env.MM_MONEY_ACCOUNT_GEO_BLOCKED_COUNTRIES;
    delete process.env.MM_MONEY_ACCOUNT_GEO_BLOCKED_COUNTRIES;

    const state = createStateWithGeolocation('GB', {});

    const result = selectIsMoneyAccountGeoEligible(state);

    expect(result).toBe(false);

    if (originalEnv !== undefined) {
      process.env.MM_MONEY_ACCOUNT_GEO_BLOCKED_COUNTRIES = originalEnv;
    }
  });

  it('returns true for non-blocked country when using default blocked list', () => {
    const originalEnv = process.env.MM_MONEY_ACCOUNT_GEO_BLOCKED_COUNTRIES;
    delete process.env.MM_MONEY_ACCOUNT_GEO_BLOCKED_COUNTRIES;

    const state = createStateWithGeolocation('US', {});

    const result = selectIsMoneyAccountGeoEligible(state);

    expect(result).toBe(true);

    if (originalEnv !== undefined) {
      process.env.MM_MONEY_ACCOUNT_GEO_BLOCKED_COUNTRIES = originalEnv;
    }
  });
});

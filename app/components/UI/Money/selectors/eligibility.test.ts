import {
  selectIsMoneyAccountGeoEligible,
  selectIsUserInUS,
  selectIsUsUnauthenticatedNonCardholder,
} from './eligibility';
import {
  selectIsCardAuthenticated,
  selectHasCardholderAccounts,
} from '../../../../selectors/cardController';
import type { RootState } from '../../../../reducers';

jest.mock('../../../../selectors/cardController', () => ({
  selectIsCardAuthenticated: jest.fn(),
  selectHasCardholderAccounts: jest.fn(),
}));

const mockSelectIsCardAuthenticated =
  selectIsCardAuthenticated as unknown as jest.MockedFunction<() => boolean>;
const mockSelectHasCardholderAccounts =
  selectHasCardholderAccounts as unknown as jest.MockedFunction<() => boolean>;

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

describe('selectIsUserInUS', () => {
  const createStateWithGeolocation = (geolocation: string | null | undefined) =>
    ({
      engine: {
        backgroundState: {
          GeolocationController: {
            location: geolocation,
          },
        },
      },
    }) as unknown as RootState;

  it('returns true for a plain US country code', () => {
    expect(selectIsUserInUS(createStateWithGeolocation('US'))).toBe(true);
  });

  it('returns true for a US country-region code', () => {
    expect(selectIsUserInUS(createStateWithGeolocation('US-CA'))).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(selectIsUserInUS(createStateWithGeolocation('us'))).toBe(true);
  });

  it('returns false for a non-US country', () => {
    expect(selectIsUserInUS(createStateWithGeolocation('GB'))).toBe(false);
  });

  it('returns false when geolocation is unknown', () => {
    expect(selectIsUserInUS(createStateWithGeolocation('UNKNOWN'))).toBe(false);
  });

  it('returns false when geolocation is undefined', () => {
    expect(selectIsUserInUS(createStateWithGeolocation(undefined))).toBe(false);
  });
});

describe('selectIsUsUnauthenticatedNonCardholder', () => {
  const createState = (geolocation: string | null | undefined) =>
    ({
      engine: {
        backgroundState: {
          GeolocationController: {
            location: geolocation,
          },
        },
      },
    }) as unknown as RootState;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns true for a US user who is not authenticated and not a cardholder', () => {
    mockSelectIsCardAuthenticated.mockReturnValue(false);
    mockSelectHasCardholderAccounts.mockReturnValue(false);

    expect(selectIsUsUnauthenticatedNonCardholder(createState('US'))).toBe(
      true,
    );
  });

  it('returns false when the user is not in the US', () => {
    mockSelectIsCardAuthenticated.mockReturnValue(false);
    mockSelectHasCardholderAccounts.mockReturnValue(false);

    expect(selectIsUsUnauthenticatedNonCardholder(createState('GB'))).toBe(
      false,
    );
  });

  it('returns false when the US user is authenticated', () => {
    mockSelectIsCardAuthenticated.mockReturnValue(true);
    mockSelectHasCardholderAccounts.mockReturnValue(false);

    expect(selectIsUsUnauthenticatedNonCardholder(createState('US'))).toBe(
      false,
    );
  });

  it('returns false when any wallet account is a cardholder', () => {
    mockSelectIsCardAuthenticated.mockReturnValue(false);
    mockSelectHasCardholderAccounts.mockReturnValue(true);

    expect(selectIsUsUnauthenticatedNonCardholder(createState('US'))).toBe(
      false,
    );
  });
});

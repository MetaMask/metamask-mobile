import { CardProviderIds } from '../../../../core/Engine/controllers/card-controller/provider-types';
import { CardScreens } from './metrics';
import {
  buildCountryPrefillAnalytics,
  cardProviderIdForPrefillCountry,
  countryCodeFromGeolocationLocation,
  locationFormatFromGeolocationLocation,
  prefillCountryKeyForSignUp,
  regionForSignUpCountryPrefill,
  signUpCountryPrefillViewProperties,
  UK_MIGRATION_COUNTRY_CODE,
} from './countryPrefill';

describe('countryCodeFromGeolocationLocation', () => {
  it('returns the country prefix for a subdivision location', () => {
    expect(countryCodeFromGeolocationLocation('US-NY')).toBe('US');
    expect(countryCodeFromGeolocationLocation('CA-ON')).toBe('CA');
  });

  it('returns a plain country code unchanged', () => {
    expect(countryCodeFromGeolocationLocation('gb')).toBe('GB');
  });

  it('returns null when the location is unknown or empty', () => {
    expect(countryCodeFromGeolocationLocation('UNKNOWN')).toBeNull();
    expect(countryCodeFromGeolocationLocation(undefined)).toBeNull();
    expect(countryCodeFromGeolocationLocation('USA')).toBeNull();
  });
});

describe('locationFormatFromGeolocationLocation', () => {
  it('classifies country and subdivision codes', () => {
    expect(locationFormatFromGeolocationLocation('GB')).toBe('country');
    expect(locationFormatFromGeolocationLocation('US-NY')).toBe('subdivision');
    expect(locationFormatFromGeolocationLocation('UNKNOWN')).toBe('unknown');
  });
});

describe('buildCountryPrefillAnalytics', () => {
  const settled = {
    registrationSettingsFetched: true,
    hasRegistrationCountries: true,
    geolocationStatus: 'complete',
    fromMigration: false,
    matchedCountry: false,
  };

  it('returns null while geolocation is still loading', () => {
    const result = buildCountryPrefillAnalytics({
      ...settled,
      geolocationStatus: 'loading',
      geolocation: 'GB',
      matchedCountry: true,
    });

    expect(result).toBeNull();
  });

  it('reports a prefilled country when location is known and status is idle', () => {
    const result = buildCountryPrefillAnalytics({
      ...settled,
      geolocationStatus: 'idle',
      geolocation: 'US-NY',
      matchedCountry: true,
    });

    expect(result).toEqual({
      country_prefill_status: 'prefilled',
      location_format: 'subdivision',
    });
  });

  it('reports a prefilled country when location is known and status is missing', () => {
    const result = buildCountryPrefillAnalytics({
      ...settled,
      geolocationStatus: undefined,
      geolocation: 'GB',
      matchedCountry: true,
    });

    expect(result).toEqual({
      country_prefill_status: 'prefilled',
      location_format: 'country',
    });
  });

  it('returns null while status is idle and location is still unknown', () => {
    const result = buildCountryPrefillAnalytics({
      ...settled,
      geolocationStatus: 'idle',
      geolocation: 'UNKNOWN',
    });

    expect(result).toBeNull();
  });

  it('returns null before registration settings have fetched', () => {
    const result = buildCountryPrefillAnalytics({
      ...settled,
      registrationSettingsFetched: false,
      hasRegistrationCountries: false,
      geolocation: 'GB',
    });

    expect(result).toBeNull();
  });

  it('reports a prefilled country without a failure reason', () => {
    const result = buildCountryPrefillAnalytics({
      ...settled,
      geolocation: 'US-CA',
      matchedCountry: true,
    });

    expect(result).toEqual({
      country_prefill_status: 'prefilled',
      location_format: 'subdivision',
    });
  });

  it('reports skipped UK migration without a failure reason', () => {
    const result = buildCountryPrefillAnalytics({
      ...settled,
      fromMigration: true,
      geolocation: 'US',
      matchedCountry: true,
    });

    expect(result).toEqual({
      country_prefill_status: 'skipped_uk_migration',
      location_format: 'country',
    });
  });

  it('prefers unavailable registration settings over a geolocation error', () => {
    const result = buildCountryPrefillAnalytics({
      ...settled,
      hasRegistrationCountries: false,
      geolocationStatus: 'error',
      geolocation: 'UNKNOWN',
    });

    expect(result).toEqual({
      country_prefill_status: 'failed',
      country_prefill_failure_reason: 'registration_settings_unavailable',
      location_format: 'unknown',
    });
  });

  it('reports a geolocation error when the country list is available', () => {
    const result = buildCountryPrefillAnalytics({
      ...settled,
      geolocationStatus: 'error',
      geolocation: 'UNKNOWN',
    });

    expect(result?.country_prefill_failure_reason).toBe('geolocation_error');
  });

  it('reports an unknown location after a completed fetch', () => {
    const result = buildCountryPrefillAnalytics({
      ...settled,
      geolocation: 'UNKNOWN',
    });

    expect(result).toEqual({
      country_prefill_status: 'failed',
      country_prefill_failure_reason: 'unknown_location',
      location_format: 'unknown',
    });
  });

  it('reports an unmatched location for a country missing from registration settings', () => {
    const result = buildCountryPrefillAnalytics({
      ...settled,
      geolocation: 'JP',
    });

    expect(result).toEqual({
      country_prefill_status: 'failed',
      country_prefill_failure_reason: 'unmatched_location',
      location_format: 'country',
    });
  });
});

describe('regionForSignUpCountryPrefill', () => {
  const unitedStates = { key: 'US' };
  const unitedKingdom = { key: 'GB' };
  const getRegionByCode = (code: string | null | undefined) => {
    if (code === 'US') {
      return unitedStates;
    }
    if (code === UK_MIGRATION_COUNTRY_CODE) {
      return unitedKingdom;
    }
    return null;
  };

  it('matches a subdivision location to its country', () => {
    expect(
      regionForSignUpCountryPrefill({
        fromMigration: false,
        geolocationStatus: 'complete',
        geolocation: 'US-NY',
        getRegionByCode,
      }),
    ).toBe(unitedStates);
  });

  it('returns null when geolocation failed', () => {
    expect(
      regionForSignUpCountryPrefill({
        fromMigration: false,
        geolocationStatus: 'error',
        geolocation: 'US-NY',
        getRegionByCode,
      }),
    ).toBeNull();
  });

  it('uses the United Kingdom during migration', () => {
    expect(
      regionForSignUpCountryPrefill({
        fromMigration: true,
        geolocationStatus: 'error',
        geolocation: 'US-NY',
        getRegionByCode,
      }),
    ).toBe(unitedKingdom);
  });
});

describe('cardProviderIdForPrefillCountry', () => {
  it('returns null without a country key', () => {
    expect(cardProviderIdForPrefillCountry(null, true, ['GB'])).toBeNull();
  });

  it('returns Immersve when that country is enabled', () => {
    expect(cardProviderIdForPrefillCountry('GB', true, ['GB'])).toBe(
      CardProviderIds.Immersve,
    );
  });

  it('returns Baanx otherwise', () => {
    expect(cardProviderIdForPrefillCountry('US', true, ['GB'])).toBe(
      CardProviderIds.Baanx,
    );
    expect(cardProviderIdForPrefillCountry('GB', false, ['GB'])).toBe(
      CardProviderIds.Baanx,
    );
  });
});

describe('prefillCountryKeyForSignUp', () => {
  it('keeps the United Kingdom during migration', () => {
    expect(
      prefillCountryKeyForSignUp({
        fromMigration: true,
        matchedRegionKey: 'US',
        selectedCountryKey: 'FR',
      }),
    ).toBe(UK_MIGRATION_COUNTRY_CODE);
  });

  it('prefers the region matched on this render', () => {
    expect(
      prefillCountryKeyForSignUp({
        fromMigration: false,
        matchedRegionKey: 'US',
        selectedCountryKey: 'FR',
      }),
    ).toBe('US');
  });
});

describe('signUpCountryPrefillViewProperties', () => {
  const prefilled = {
    country_prefill_status: 'prefilled' as const,
    location_format: 'country' as const,
  };

  it('omits the provider when prefill failed', () => {
    expect(
      signUpCountryPrefillViewProperties({
        prefillAnalytics: {
          country_prefill_status: 'failed',
          country_prefill_failure_reason: 'unknown_location',
          location_format: 'unknown',
        },
        provider: CardProviderIds.Baanx,
        migrationAnalyticsProps: { flow: 'migration' },
      }),
    ).toEqual({
      screen: CardScreens.SIGN_UP,
      country_prefill_status: 'failed',
      country_prefill_failure_reason: 'unknown_location',
      location_format: 'unknown',
    });
  });

  it('includes the provider and migration properties when prefill succeeds', () => {
    expect(
      signUpCountryPrefillViewProperties({
        prefillAnalytics: prefilled,
        provider: CardProviderIds.Immersve,
        migrationAnalyticsProps: { flow: 'migration' },
      }),
    ).toEqual({
      provider: CardProviderIds.Immersve,
      screen: CardScreens.SIGN_UP,
      flow: 'migration',
      ...prefilled,
    });
  });
});

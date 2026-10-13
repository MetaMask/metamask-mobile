import {
  buildCountryPrefillAnalytics,
  countryCodeFromGeolocationLocation,
  locationFormatFromGeolocationLocation,
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

import { UNKNOWN_LOCATION } from '@metamask/geolocation-controller';

const COUNTRY_CODE_PATTERN = /^[A-Z]{2}$/u;
const SUBDIVISION_CODE_PATTERN = /^[A-Z]{2}-[A-Z0-9]{1,3}$/u;

export type CountryPrefillLocationFormat =
  | 'unknown'
  | 'country'
  | 'subdivision';

export type CountryPrefillFailureReason =
  | 'geolocation_error'
  | 'unknown_location'
  | 'unmatched_location'
  | 'registration_settings_unavailable';

export interface CountryPrefillAnalytics {
  country_prefill_status: 'prefilled' | 'failed' | 'skipped_uk_migration';
  country_prefill_failure_reason?: CountryPrefillFailureReason;
  location_format: CountryPrefillLocationFormat;
}

/**
 * ISO alpha-2 country key for a GeolocationController location.
 * `US-NY` and `CA-ON` resolve to `US` and `CA`.
 */
export const countryCodeFromGeolocationLocation = (
  location: string | null | undefined,
): string | null => {
  if (!location || location.toUpperCase() === UNKNOWN_LOCATION) {
    return null;
  }

  const countryCode = location.toUpperCase().split('-')[0] ?? '';
  return COUNTRY_CODE_PATTERN.test(countryCode) ? countryCode : null;
};

/**
 * Classifies a GeolocationController location as a country, a subdivision, or unknown.
 *
 * @param location - Raw controller location, such as `GB`, `US-NY`, or `UNKNOWN`.
 * @returns The analytics location format.
 */
export const locationFormatFromGeolocationLocation = (
  location: string | null | undefined,
): CountryPrefillLocationFormat => {
  if (!location || location.toUpperCase() === UNKNOWN_LOCATION) {
    return 'unknown';
  }

  const normalizedLocation = location.toUpperCase();
  if (COUNTRY_CODE_PATTERN.test(normalizedLocation)) {
    return 'country';
  }
  if (SUBDIVISION_CODE_PATTERN.test(normalizedLocation)) {
    return 'subdivision';
  }
  return 'unknown';
};

/**
 * Whether a geolocation lookup has reached a terminal status.
 *
 * @param status - GeolocationController status.
 * @returns True when status is `complete` or `error`.
 */
export const isGeolocationSettled = (
  status: string | null | undefined,
): boolean => status === 'complete' || status === 'error';

/**
 * Prefill analytics once registration settings are available and geolocation
 * is no longer in flight. A known location is enough when status is missing
 * or still `idle`; failures wait for `complete` or `error` unless that
 * location is already present. Returns null while a lookup is loading.
 */
export const buildCountryPrefillAnalytics = ({
  fromMigration,
  registrationSettingsFetched,
  hasRegistrationCountries,
  geolocationStatus,
  geolocation,
  matchedCountry,
}: {
  fromMigration: boolean;
  registrationSettingsFetched: boolean;
  hasRegistrationCountries: boolean;
  geolocationStatus: string | null | undefined;
  geolocation: string | null | undefined;
  matchedCountry: boolean;
}): CountryPrefillAnalytics | null => {
  const locationAlreadyKnown =
    geolocationStatus !== 'loading' &&
    countryCodeFromGeolocationLocation(geolocation) !== null;

  if (
    !registrationSettingsFetched ||
    (!isGeolocationSettled(geolocationStatus) && !locationAlreadyKnown)
  ) {
    return null;
  }

  const locationFormat = locationFormatFromGeolocationLocation(geolocation);

  if (fromMigration) {
    return {
      country_prefill_status: 'skipped_uk_migration',
      location_format: locationFormat,
    };
  }

  if (matchedCountry) {
    return {
      country_prefill_status: 'prefilled',
      location_format: locationFormat,
    };
  }

  let failureReason: CountryPrefillFailureReason;
  if (!hasRegistrationCountries) {
    failureReason = 'registration_settings_unavailable';
  } else if (geolocationStatus === 'error') {
    failureReason = 'geolocation_error';
  } else if (!countryCodeFromGeolocationLocation(geolocation)) {
    failureReason = 'unknown_location';
  } else {
    failureReason = 'unmatched_location';
  }

  return {
    country_prefill_status: 'failed',
    country_prefill_failure_reason: failureReason,
    location_format: locationFormat,
  };
};

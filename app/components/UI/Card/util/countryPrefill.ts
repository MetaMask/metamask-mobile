import { UNKNOWN_LOCATION } from '@metamask/geolocation-controller';
import { CardProviderIds } from '../../../../core/Engine/controllers/card-controller/provider-types';
import { CardScreens, withCardProvider } from './metrics';

export const UK_MIGRATION_COUNTRY_CODE = 'GB';

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

/**
 * Region to prefill, before any visit latch.
 * UK migration always uses GB. Other visits use the geolocation country prefix.
 *
 * @param params - Migration flag, geolocation, and the registration-settings lookup.
 * @param params.fromMigration - Whether this visit is the UK migration flow.
 * @param params.geolocationStatus - GeolocationController status.
 * @param params.geolocation - Raw controller location.
 * @param params.getRegionByCode - Registration-settings lookup by country key.
 * @returns The matching region, or null when prefill should stay blank.
 */
export const regionForSignUpCountryPrefill = <T extends { key: string }>({
  fromMigration,
  geolocationStatus,
  geolocation,
  getRegionByCode,
}: {
  fromMigration: boolean;
  geolocationStatus: string | null | undefined;
  geolocation: string | null | undefined;
  getRegionByCode: (code: string | null | undefined) => T | null;
}): T | null => {
  if (fromMigration) {
    return getRegionByCode(UK_MIGRATION_COUNTRY_CODE);
  }
  if (geolocationStatus === 'error') {
    return null;
  }

  const countryKey = countryCodeFromGeolocationLocation(geolocation);
  return countryKey ? getRegionByCode(countryKey) : null;
};

/**
 * Card provider for a prefilled country key.
 *
 * @param countryKey - Registration country key, or null when prefill failed.
 * @param immersveOnboardingEnabled - Whether Immersve onboarding is on.
 * @param immersveCountries - Country keys routed to Immersve.
 * @returns The provider id, or null when there is no country key.
 */
export const cardProviderIdForPrefillCountry = (
  countryKey: string | null | undefined,
  immersveOnboardingEnabled: boolean,
  immersveCountries: readonly string[],
): string | null => {
  if (!countryKey) {
    return null;
  }
  if (immersveOnboardingEnabled && immersveCountries.includes(countryKey)) {
    return CardProviderIds.Immersve;
  }
  return CardProviderIds.Baanx;
};

/**
 * Properties for the sign-up `Card Viewed` event.
 * Failures omit the provider because it depends on a matched country.
 *
 * @param params - Prefill result, provider, and migration properties.
 * @param params.prefillAnalytics - Prefill status, failure reason, and location format.
 * @param params.provider - Provider id, or null when prefill failed.
 * @param params.migrationAnalyticsProps - Extra properties for the UK migration flow.
 * @returns Event properties, including `provider` only for a known country.
 */
export const signUpCountryPrefillViewProperties = ({
  prefillAnalytics,
  provider,
  migrationAnalyticsProps,
}: {
  prefillAnalytics: CountryPrefillAnalytics;
  provider: string | null;
  migrationAnalyticsProps: Record<string, unknown>;
}): Record<string, unknown> => {
  if (prefillAnalytics.country_prefill_status === 'failed' || !provider) {
    return {
      screen: CardScreens.SIGN_UP,
      ...prefillAnalytics,
    };
  }

  return withCardProvider(provider, {
    screen: CardScreens.SIGN_UP,
    ...migrationAnalyticsProps,
    ...prefillAnalytics,
  });
};

/**
 * Country key used to choose the provider for this visit.
 *
 * @param params - Migration flag and the region chosen on this render.
 * @param params.fromMigration - Whether this visit is the UK migration flow.
 * @param params.matchedRegionKey - Key matched during this render.
 * @param params.selectedCountryKey - Key already selected on an earlier render.
 * @returns GB for UK migration, otherwise the matched or selected key.
 */
export const prefillCountryKeyForSignUp = ({
  fromMigration,
  matchedRegionKey,
  selectedCountryKey,
}: {
  fromMigration: boolean;
  matchedRegionKey?: string;
  selectedCountryKey?: string;
}): string | null => {
  if (fromMigration) {
    return UK_MIGRATION_COUNTRY_CODE;
  }
  return matchedRegionKey ?? selectedCountryKey ?? null;
};

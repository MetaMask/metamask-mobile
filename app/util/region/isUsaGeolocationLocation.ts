import { UNKNOWN_LOCATION } from '@metamask/geolocation-controller';

const US_COUNTRY_CODE = 'US';

/**
 * Whether a GeolocationController location string resolves to the United States.
 *
 * The geolocation API returns codes like "US" or "US-CA" (country-region), so
 * only the leading country segment is compared.
 */
export function isUsaGeolocationLocation(
  location: string | undefined | null,
): boolean {
  if (!location || location === UNKNOWN_LOCATION) {
    return false;
  }

  return location.toUpperCase().split('-')[0] === US_COUNTRY_CODE;
}

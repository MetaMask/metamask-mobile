import { UNKNOWN_LOCATION } from '@metamask/geolocation-controller';

const BRAZIL_COUNTRY_CODE = 'BR';

/**
 * Whether a GeolocationController location string resolves to Brazil.
 *
 * The geolocation API returns codes like "BR" or "BR-SP" (country-region), so
 * only the leading country segment is compared. Unknown, empty, and failed
 * lookups return false so callers can hide geo-gated entry points.
 *
 * @param location - Raw GeolocationController location, when one has been stored.
 * @returns True when the leading country segment is Brazil.
 */
export function isBrazilGeolocationLocation(
  location: string | undefined | null,
): boolean {
  if (!location || location === UNKNOWN_LOCATION) {
    return false;
  }

  return location.toUpperCase().split('-')[0] === BRAZIL_COUNTRY_CODE;
}

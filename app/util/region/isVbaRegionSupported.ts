import { UNKNOWN_LOCATION } from '@metamask/geolocation-controller';

/**
 * ISO 3166-1 alpha-2 country codes where Virtual Bank Account onboarding is
 * available. Add a code here to expand beyond the current market.
 */
const SUPPORTED_VBA_COUNTRY_CODES = new Set(['BR']);

/**
 * Whether a GeolocationController location string is in a country that supports
 * Virtual Bank Account onboarding.
 *
 * The geolocation API returns codes like "BR" or "BR-SP" (country-region), so
 * only the leading country segment is compared. Unknown, empty, and failed
 * lookups return false so callers can hide geo-gated entry points.
 *
 * @param location - Raw GeolocationController location, when one has been stored.
 * @returns True when the leading country segment is a supported VBA country.
 */
export function isVbaRegionSupported(
  location: string | undefined | null,
): boolean {
  if (!location || location === UNKNOWN_LOCATION) {
    return false;
  }

  return SUPPORTED_VBA_COUNTRY_CODES.has(location.toUpperCase().split('-')[0]);
}

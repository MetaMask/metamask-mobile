import { UNKNOWN_LOCATION } from '@metamask/geolocation-controller';

const ASIA_COUNTRY_CODES = new Set(['JP', 'KR', 'TW', 'CN', 'HK']);

/**
 * Whether a GeolocationController location string resolves to one of the
 * targeted Asian markets (JP, KR, VN, TW, CN).
 *
 * The geolocation API returns codes like "JP" or "CN-BJ" (country-region), so
 * only the leading country segment is compared.
 */
export function isAsiaGeolocationLocation(
  location: string | undefined | null,
): boolean {
  if (!location || location === UNKNOWN_LOCATION) {
    return false;
  }

  return ASIA_COUNTRY_CODES.has(location.toUpperCase().split('-')[0]);
}

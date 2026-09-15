import { UNKNOWN_LOCATION } from '@metamask/geolocation-controller';

/**
 * ISO 3166-1 alpha-2 codes for the 27 EU member states.
 */
const EU_COUNTRY_CODES = new Set([
  'AT',
  'BE',
  'BG',
  'HR',
  'CY',
  'CZ',
  'DK',
  'EE',
  'FI',
  'FR',
  'DE',
  'GR',
  'HU',
  'IE',
  'IT',
  'LV',
  'LT',
  'LU',
  'MT',
  'NL',
  'PL',
  'PT',
  'RO',
  'SK',
  'SI',
  'ES',
  'SE',
]);

/**
 * Whether a GeolocationController location string resolves to an EU member state.
 *
 * The geolocation API returns codes like "DE" or "FR-IDF" (country-region), so
 * only the leading country segment is compared.
 */
export function isEuGeolocationLocation(
  location: string | undefined | null,
): boolean {
  if (!location || location === UNKNOWN_LOCATION) {
    return false;
  }

  const countryCode = location.toUpperCase().split('-')[0];
  return EU_COUNTRY_CODES.has(countryCode);
}

/**
 * ISO 3166-1 alpha-2 codes for EEA countries, which Transak routes through
 * its MiCA (Transak GmbH) KYC flow.
 */
const EEA_COUNTRIES = new Set<string>([
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
  'IS',
  'LI',
  'NO',
]);

export function isEeaCountry(countryCode?: string | null): boolean {
  return Boolean(countryCode) && EEA_COUNTRIES.has(countryCode as string);
}

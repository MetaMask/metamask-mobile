import type { Country } from '@metamask/ramps-controller';

export const DEFAULT_PHONE_TEMPLATE = '(XXX) XXX-XXXX';

/**
 * Returns the digits-only dialing prefix for a country (e.g. `+351` -> `351`).
 */
export function getPhonePrefixDigits(country?: Country | null): string {
  return country?.phone?.prefix?.replace(/\D/g, '') ?? '';
}

/**
 * Strips the country dialing prefix from a stored mobile number, returning the
 * local digits the user actually typed.
 */
export function getLocalPhoneDigits(
  mobileNumber: string,
  country?: Country | null,
): string {
  const digits = mobileNumber.replace(/\D/g, '');
  const prefixDigits = getPhonePrefixDigits(country);

  if (!prefixDigits) return digits;

  return digits.startsWith(prefixDigits)
    ? digits.slice(prefixDigits.length)
    : digits;
}

/**
 * Finds the country whose dialing prefix matches the start of the given mobile
 * number. Longer prefixes are matched first so that overlapping codes (e.g.
 * `+1` vs `+1xxx`) resolve to the most specific country.
 */
export function findCountryByPhonePrefix(
  countries: Country[],
  mobileNumber?: string,
): Country | null {
  const digits = mobileNumber?.replace(/\D/g, '') ?? '';
  if (!digits) return null;

  const sortedCountries = [...countries].sort(
    (a, b) => getPhonePrefixDigits(b).length - getPhonePrefixDigits(a).length,
  );

  return (
    sortedCountries.find((country) => {
      const prefixDigits = getPhonePrefixDigits(country);
      return Boolean(prefixDigits) && digits.startsWith(prefixDigits);
    }) ?? null
  );
}

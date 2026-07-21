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
 * number. Longer prefixes win first so that overlapping codes (e.g. `+1` vs
 * `+1xxx`) resolve to the most specific country. When several countries share
 * the same code (e.g. US and Canada both use `+1`), the `fallbackCountry` is
 * preferred among the tied matches so a prefilled number keeps its expected
 * region instead of an arbitrary one.
 */
export function findCountryByPhonePrefix(
  countries: Country[],
  mobileNumber?: string,
  fallbackCountry?: Country | null,
): Country | null {
  const digits = mobileNumber?.replace(/\D/g, '') ?? '';
  if (!digits) return null;

  const matches = countries.filter((country) => {
    const prefixDigits = getPhonePrefixDigits(country);
    return Boolean(prefixDigits) && digits.startsWith(prefixDigits);
  });
  if (matches.length === 0) return null;

  // Keep only the most specific (longest-prefix) matches before breaking ties.
  const longestPrefixLength = Math.max(
    ...matches.map((country) => getPhonePrefixDigits(country).length),
  );
  const bestMatches = matches.filter(
    (country) => getPhonePrefixDigits(country).length === longestPrefixLength,
  );

  const fallbackMatch = fallbackCountry
    ? bestMatches.find((country) => country.isoCode === fallbackCountry.isoCode)
    : undefined;

  return fallbackMatch ?? bestMatches[0];
}

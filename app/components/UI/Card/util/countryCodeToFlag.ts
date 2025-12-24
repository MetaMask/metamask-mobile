/**
 * Converts an ISO 3166-1 alpha-2 country code to a flag emoji.
 *
 * This works by converting each letter to its corresponding
 * Unicode Regional Indicator Symbol (A→🇦, B→🇧, etc.).
 * The pair of symbols is then rendered as a flag emoji by the OS.
 *
 * @param isoCode - ISO 3166-1 alpha-2 country code (e.g., 'US', 'GB')
 * @returns Flag emoji (e.g., '🇺🇸', '🇬🇧') or '🌍' as fallback
 */
export const countryCodeToFlag = (
  isoCode: string | null | undefined,
): string => {
  if (!isoCode || isoCode.length !== 2) {
    return '🌍';
  }

  const upperCode = isoCode.toUpperCase();

  // Validate that the code contains only A-Z characters
  if (!/^[A-Z]{2}$/.test(upperCode)) {
    return '🌍';
  }

  // Regional Indicator Symbol Letter A starts at Unicode code point 127462
  // 'A'.charCodeAt(0) is 65, so 127462 - 65 = 127397 is the offset
  const REGIONAL_INDICATOR_OFFSET = 127397;

  const codePoints = upperCode
    .split('')
    .map((char) => REGIONAL_INDICATOR_OFFSET + char.charCodeAt(0));

  return String.fromCodePoint(...codePoints);
};

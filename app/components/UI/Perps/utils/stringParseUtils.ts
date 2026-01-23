/**
 * Strip surrounding quotes from a string (handles both single and double quotes)
 * Use this to clean up values that may have been JSON-encoded with extra quotes
 *
 * @param s - String to strip quotes from
 * @returns String with surrounding quotes removed, or unchanged if no matching quotes
 *
 * @example
 * stripQuotes('"xyz"') // → "xyz"
 * stripQuotes("'abc'") // → "abc"
 * stripQuotes('xyz')   // → "xyz" (unchanged)
 */
export const stripQuotes = (s: string): string => {
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    return s.slice(1, -1);
  }
  return s;
};

/**
 * Parse comma-separated string into array of trimmed non-empty values
 * Commonly used for LaunchDarkly feature flag list values
 *
 * Note: This function only handles parsing and trimming. If your values may
 * contain surrounding quotes (e.g., from LaunchDarkly JSON encoding), apply
 * stripQuotes separately: `parseCommaSeparatedString(value).map(stripQuotes)`
 *
 * @param value - Comma-separated string
 * @returns Array of trimmed non-empty strings
 *
 * @example Basic usage
 * parseCommaSeparatedString("xyz:*, abc:TSLA") // → ["xyz:*", "abc:TSLA"]
 *
 * @example Empty string
 * parseCommaSeparatedString("") // → []
 *
 * @example Whitespace handling
 * parseCommaSeparatedString("  ,  , xyz  ") // → ["xyz"]
 */
export const parseCommaSeparatedString = (value: string): string[] =>
  value
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

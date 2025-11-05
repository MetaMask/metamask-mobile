/**
 * Parse comma-separated string into array of trimmed non-empty values
 * Commonly used for LaunchDarkly feature flag list values
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

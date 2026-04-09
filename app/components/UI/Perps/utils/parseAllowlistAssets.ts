import {
  parseCommaSeparatedString,
  stripQuotes,
} from '@metamask/perps-controller';

/**
 * Normalizes a single allowlist entry: strip quotes, trim, lowercase.
 * Used consistently for both string and array parsing.
 */
function normalizeEntry(s: string): string {
  return stripQuotes(s).trim().toLowerCase();
}

function isStringArray(val: unknown): val is string[] {
  return Array.isArray(val) && val.every((item) => typeof item === 'string');
}

/**
 * Parses a remote list value (string or array of strings) into normalized
 * "chainId.address" entries (lowercased for case-insensitive address comparison).
 *
 * Returns [] for invalid or empty input. Callers treat [] as "allow all tokens"
 * so that a bad LaunchDarkly format does not block the app.
 */
export function parseAllowlistAssets(remoteValue: unknown): string[] {
  try {
    if (typeof remoteValue === 'string') {
      return parseCommaSeparatedString(remoteValue)
        .map((s) => normalizeEntry(s))
        .filter((s) => s.length > 0);
    }
    if (isStringArray(remoteValue)) {
      return remoteValue
        .map((s) => normalizeEntry(s))
        .filter((s) => s.length > 0);
    }
    return [];
  } catch {
    // Fallback to allow all tokens if LaunchDarkly format is invalid
    return [];
  }
}

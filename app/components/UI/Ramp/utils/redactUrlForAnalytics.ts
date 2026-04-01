/**
 * Strips query string and fragment from a URL so that no PII
 * (e.g. email, wallet address, tokens embedded in query params)
 * leaks into analytics payloads. Returns `origin + pathname` only.
 *
 * Falls back to the raw string when `new URL()` cannot parse it.
 */
export const redactUrlForAnalytics = (rawUrl: string): string => {
  try {
    const parsed = new URL(rawUrl);
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return rawUrl;
  }
};

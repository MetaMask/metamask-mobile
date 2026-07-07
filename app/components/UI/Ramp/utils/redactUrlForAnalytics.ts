/**
 * Strips query string and fragment from a URL so no PII (emails,
 * wallet addresses, provider tokens) leaks into analytics payloads.
 * Returns `origin + pathname` only. Falls back to the raw string
 * when `new URL()` cannot parse the input.
 */
export const redactUrlForAnalytics = (rawUrl: string): string => {
  if (!rawUrl) return rawUrl;
  try {
    const parsed = new URL(rawUrl);
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return rawUrl;
  }
};

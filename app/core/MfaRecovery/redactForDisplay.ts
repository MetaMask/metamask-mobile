const MAX_LENGTH = 120;

/**
 * Shortens text for on-screen developer messages: removes email addresses
 * and long token-like strings so nothing sensitive is shown.
 *
 * @param text - The text to clean.
 * @returns The cleaned, shortened text.
 */
export function redactForDisplay(text: string): string {
  return text
    .replace(/[^\s"'@]+@[^\s"'@]+/gu, '<email>')
    .replace(/[A-Za-z0-9+/_=-]{24,}/gu, '<redacted>')
    .slice(0, MAX_LENGTH);
}

const MAX_LENGTH = 120;

function redactEmails(text: string): string {
  return text.replace(/[^\s"']+/gu, (token) => {
    const atIndex = token.indexOf('@');
    return atIndex > 0 && atIndex < token.length - 1 ? '<email>' : token;
  });
}

/**
 * Shortens text for on-screen developer messages: removes email addresses
 * and long token-like strings so nothing sensitive is shown.
 *
 * @param text - The text to clean.
 * @returns The cleaned, shortened text.
 */
export function redactForDisplay(text: string): string {
  return redactEmails(text)
    .replace(/[A-Za-z0-9+/_=-]{24,}/gu, '<redacted>')
    .slice(0, MAX_LENGTH);
}

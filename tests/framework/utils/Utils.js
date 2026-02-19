/**
 * Splits an amount string into individual characters (digits and decimal point)
 * for keypad entry in E2E tests.
 * @param {string} amount - Amount string (e.g. "1", "1.5", "0.25")
 * @returns {string[]} Array of single-character strings to tap
 */
export function splitAmountIntoDigits(amount) {
  return String(amount).split('');
}

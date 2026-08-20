/**
 * Whether a provider's quote error message is a user-actionable limit message,
 * e.g. "Minimum purchase is 12 EUR" / "Maximum purchase is 20 EUR".
 *
 * The on-ramp API builds these as hardcoded English strings
 * (`Minimum/Maximum purchase is …`, see OrderService limit-error block); they
 * are not localized. Only these actionable limit messages should be surfaced.
 * Any other per-provider quote error — technical strings, "[object Object]",
 * HTML/5xx bodies, validation failures, the vague "Amount is outside the
 * supported range" — falls back to a generic "Quote unavailable".
 *
 * @param message - The raw provider error string from the quotes response.
 * @returns True when the message is a min/max purchase limit.
 */
export function isProviderLimitError(
  message: string | null | undefined,
): message is string {
  if (!message) {
    return false;
  }

  return /\b(minimum|maximum)\s+purchase\s+is\b/i.test(message);
}

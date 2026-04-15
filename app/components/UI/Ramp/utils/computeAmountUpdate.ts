/**
 * Computes the new amount string and numeric value from a keypad/quick-amount
 * input. Used by BuildQuote's updateAmount callback.
 */
export function computeAmountUpdate(
  valueOrNumber: string | number,
  valueAsNumber?: number,
): { amount: string; amountAsNumber: number } {
  if (typeof valueOrNumber === 'string') {
    const amount = valueOrNumber === '' ? '0' : valueOrNumber;
    const amountAsNumber =
      valueAsNumber != null ? valueAsNumber : parseFloat(valueOrNumber) || 0;
    return { amount, amountAsNumber };
  }
  return {
    amount: String(valueOrNumber),
    amountAsNumber: valueOrNumber,
  };
}

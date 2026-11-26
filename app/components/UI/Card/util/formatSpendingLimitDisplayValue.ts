/**
 * Consumed fraction at which the Manage limit sublabel (and the progress
 * bar fill) turns warning. Matches the old bar's >= 80% consumed cutoff.
 */
export const SPENDING_LIMIT_WARNING_THRESHOLD = 0.8;

/**
 * Display formatting used by SpendingLimitProgressBar and the Manage limit
 * row. Values are already in token units; decimals are not re-applied.
 */
export const formatSpendingLimitDisplayValue = (value: number): string => {
  const precision = value < 1 ? 6 : 2;
  return parseFloat(value.toFixed(precision)).toString();
};

/**
 * Formats the rate of return as a percentage string
 */
export const formatRateOfReturn = (rate: number): string => {
  const percentage = rate * 100;
  const sign = percentage >= 0 ? '+' : '';
  return `${sign}${percentage.toFixed(2)}%`;
};

/**
 * Formats the computed at timestamp to a human-readable time string.
 * Accepts string | null — returns '' for null or unparseable values.
 */
export const formatComputedAt = (isoString: string | null): string => {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '';
  const h = date.getHours().toString().padStart(2, '0');
  const m = date.getMinutes().toString().padStart(2, '0');
  const s = date.getSeconds().toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
};

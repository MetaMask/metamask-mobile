/**
 * Formats a numeric value as a USD string with 2 decimal places.
 * Uses toFixed() instead of toLocaleString() because Hermes
 * does not support Intl number formatting options.
 */
export function formatUsd(value: string | number | undefined): string {
  const num = Number(value) || 0;
  const fixed = num.toFixed(2);
  const [whole, decimal] = fixed.split('.');
  const withCommas = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `$${withCommas}.${decimal}`;
}

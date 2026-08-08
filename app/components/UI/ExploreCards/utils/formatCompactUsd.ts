/** Compact USD formatting for secondary stats, e.g. 1234567 → "$1.2M". */
export const formatCompactUsd = (value: number): string => {
  if (!Number.isFinite(value) || value <= 0) {
    return '—';
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
};

import { formatComputedAt } from '../../utils/formatUtils';

export { formatComputedAt };

/**
 * Formats a PnL value as a signed USD string.
 * @example formatPnl(1234.5)  // '+$1,234.50'
 * @example formatPnl(-567.0)  // '-$567.00'
 */
export const formatPnl = (pnl: number): string => {
  const sign = pnl >= 0 ? '+' : '';
  const formatted = Math.abs(pnl).toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  return `${sign}${pnl < 0 ? '-' : ''}$${formatted}`;
};

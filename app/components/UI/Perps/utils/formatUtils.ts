/**
 * Shared formatting utilities for Perps components
 */
import { formatWithThreshold } from '../../../../util/assets';

/**
 * Formats a price value as USD currency with appropriate decimal places
 * Uses the existing formatWithThreshold utility for consistency
 * @param price - The price value to format (string or number)
 * @returns Formatted price string with currency symbol
 */
export const formatPrice = (price: string | number): string => {
  const num = typeof price === 'string' ? parseFloat(price) : price;

  if (isNaN(num)) {
    return '$0.00';
  }

  // For prices >= 1000, use 2 decimal places
  if (num >= 1000) {
    return formatWithThreshold(num, 1000, 'en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  // For prices < 1000, use up to 4 decimal places
  return formatWithThreshold(num, 0.0001, 'en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });
};

/**
 * Formats a PnL (Profit and Loss) value with appropriate sign and currency
 * @param pnl - The PnL value to format (string or number)
 * @returns Formatted PnL string with + or - prefix
 */
export const formatPnl = (pnl: string | number): string => {
  const num = typeof pnl === 'string' ? parseFloat(pnl) : pnl;

  if (isNaN(num)) {
    return '$0.00';
  }

  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(num));

  return num >= 0 ? `+${formatted}` : `-${formatted}`;
};

/**
 * Formats a percentage value with appropriate sign and % symbol
 * @param value - The percentage value to format (string or number)
 * @returns Formatted percentage string with + or - prefix
 */
export const formatPercentage = (value: string | number): string => {
  const num = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(num)) {
    return '0.00%';
  }

  return `${num >= 0 ? '+' : ''}${num.toFixed(2)}%`;
};

/**
 * Formats a large number for display (e.g., 1000 -> 1K, 1000000 -> 1M)
 * @param value - The number to format
 * @returns Formatted number string with suffix
 */
export const formatLargeNumber = (value: string | number): string => {
  const num = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(num)) {
    return '0';
  }

  if (num >= 1000000000) {
    return `${(num / 1000000000).toFixed(1)}B`;
  }
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }

  return num.toFixed(2);
};

/**
 * Formats a position size with appropriate decimal places
 * @param size - The position size to format (string or number)
 * @returns Formatted size string
 */
export const formatPositionSize = (size: string | number): string => {
  const num = typeof size === 'string' ? parseFloat(size) : size;

  if (isNaN(num)) {
    return '0';
  }

  const abs = Math.abs(num);

  // For very small numbers, use more decimal places
  if (abs < 0.01) {
    return num.toFixed(6);
  }

  // For small numbers, use 4 decimal places
  if (abs < 1) {
    return num.toFixed(4);
  }

  // For normal numbers, use 2 decimal places
  return num.toFixed(2);
};

/**
 * Formats a leverage value with 'x' suffix
 * @param leverage - The leverage value to format (string or number)
 * @returns Formatted leverage string with 'x' suffix
 */
export const formatLeverage = (leverage: string | number): string => {
  const num = typeof leverage === 'string' ? parseFloat(leverage) : leverage;

  if (isNaN(num)) {
    return '1x';
  }

  return `${num.toFixed(1)}x`;
};

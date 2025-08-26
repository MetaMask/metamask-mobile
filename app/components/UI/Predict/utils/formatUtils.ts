import { formatWithThreshold } from '../../../../util/assets';

/**
 * Formats a percentage value with sign prefix
 * @param value - Raw percentage value (e.g., 5.25 for 5.25%, not 0.0525)
 * @returns Format: "+X.XX%" or "-X.XX%" (always shows sign, 2 decimals)
 * @example formatPercentage(5.25) => "+5.25%"
 * @example formatPercentage(-2.75) => "-2.75%"
 * @example formatPercentage(0) => "+0.00%"
 * @example formatPercentage(100) => "+100%"
 */
export const formatPercentage = (value: string | number): string => {
  const num = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(num)) {
    return '0.00%';
  }

  const sign = num >= 0 ? '+' : '';
  const absoluteValue = Math.abs(num);

  // If the number is a whole number (no decimal places), don't show .00
  if (absoluteValue === Math.floor(absoluteValue)) {
    return `${sign}${absoluteValue}%`;
  }

  return `${sign}${num.toFixed(2)}%`;
};

/**
 * Formats a price value as USD currency with variable decimal places based on magnitude
 * @param price - Raw numeric price value
 * @param options - Optional formatting options
 * @param options.minimumDecimals - Minimum decimal places (default: 2, use 0 for whole numbers)
 * @returns USD formatted string with variable decimals:
 * - Prices >= $1000: "$X,XXX.XX" (2-4 decimals)
 * - Prices < $1000: "$X.XXXX" (up to 4 decimals)
 * @example formatPrice(1234.5678) => "$1,234.57"
 * @example formatPrice(0.1234) => "$0.1234"
 * @example formatPrice(50000, { minimumDecimals: 0 }) => "$50,000"
 */
export const formatPrice = (
  price: string | number,
  options?: { minimumDecimals?: number },
): string => {
  const num = typeof price === 'string' ? parseFloat(price) : price;
  const minDecimals = options?.minimumDecimals ?? 2;

  if (isNaN(num)) {
    return minDecimals === 0 ? '$0' : '$0.00';
  }

  // For prices >= 1000, use specified minimum decimal places
  if (num >= 1000) {
    return formatWithThreshold(num, 1000, 'en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: minDecimals,
      maximumFractionDigits: Math.max(minDecimals, 2),
    });
  }

  // For prices < 1000, use up to 4 decimal places
  return formatWithThreshold(num, 0.0001, 'en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: minDecimals,
    maximumFractionDigits: 4,
  });
};

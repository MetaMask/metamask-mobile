import { formatWithThreshold } from '../../../../util/assets';
import { PredictSeries, Recurrence } from '../types';

/**
 * Formats a percentage value with sign prefix
 * @param value - Raw percentage value (e.g., 5.25 for 5.25%, not 0.0525)
 * @returns Format: "+X.XX%" or "-X.XX%" (always shows sign, 2 decimals)
 * @example formatPercentage(5.25) => "+5.25%"
 * @example formatPercentage(-2.75) => "-2.75%"
 * @example formatPercentage(0) => "0%"
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
    if (num === 0) {
      return '0%';
    }
    return `${sign}${num}%`;
  }

  return `${sign}${num.toFixed(2)}%`;
};

/**
 * Formats a price value as USD currency with variable decimal places based on magnitude
 * @param price - Raw numeric price value
 * @param options - Optional formatting options
 * @param options.minimumDecimals - Minimum decimal places (default: 2, use 0 for whole numbers)
 * @param options.maximumDecimals - Maximum decimal places (default: 2 for prices >= $1000, 4 for prices < $1000)
 * @returns USD formatted string with variable decimals:
 * - Prices >= $1000: "$X,XXX.XX" (2 decimals by default)
 * - Prices < $1000: "$X.XXXX" (up to 4 decimals)
 * @example formatPrice(1234.5678) => "$1,234.57"
 * @example formatPrice(0.1234) => "$0.1234"
 * @example formatPrice(50000, { minimumDecimals: 0 }) => "$50,000"
 */
export const formatPrice = (
  price: string | number,
  options?: { minimumDecimals?: number; maximumDecimals?: number },
): string => {
  const num = typeof price === 'string' ? parseFloat(price) : price;
  const minDecimals = options?.minimumDecimals ?? 2;
  const maxDecimals = options?.maximumDecimals ?? 4;

  if (isNaN(num)) {
    return minDecimals === 0 ? '$0' : '$0.00';
  }

  // For prices >= 1000, use specified minimum decimal places
  if (num >= 1000) {
    return formatWithThreshold(num, 1000, 'en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: minDecimals,
      maximumFractionDigits:
        options?.maximumDecimals ?? Math.max(minDecimals, 2),
    });
  }

  // For prices < 1000, use up to 4 decimal places
  return formatWithThreshold(num, 0.0001, 'en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: minDecimals,
    maximumFractionDigits: maxDecimals,
  });
};

/**
 * Formats a volume value with appropriate suffix based on magnitude
 * @param volume - Raw numeric volume value
 * @returns Formatted string with suffix:
 * - Volume >= 1,000,000: "X.XXM" (millions)
 * - Volume >= 1,000: "X.XXk" (thousands)
 * - Volume < 1,000: "X" (whole number)
 * @example formatVolume(1500000) => "1.5M"
 * @example formatVolume(2500) => "2.5k"
 * @example formatVolume(500) => "500"
 */
export const formatVolume = (volume: string | number): string => {
  const num = typeof volume === 'string' ? parseFloat(volume) : volume;

  if (isNaN(num)) {
    return '0';
  }

  if (num >= 1000000) {
    return (num / 1000000).toFixed(2).replace(/\.?0+$/, '') + 'M';
  } else if (num >= 1000) {
    return (num / 1000).toFixed(2).replace(/\.?0+$/, '') + 'k';
  }

  return Math.floor(num).toString();
};

/**
 * Trims an Ethereum address to show first 3 and last 2 characters
 * @param address - Full Ethereum address (e.g., "0x2F5e3684cb1F318ec51b00Edba38d79Ac2c0aA9d")
 * @returns Trimmed address (e.g., "0x2F...A9d")
 * @example formatAddress("0x2F5e3684cb1F318ec51b00Edba38d79Ac2c0aA9d") => "0x2F5...A9d"
 */
export const formatAddress = (address?: string): string => {
  if (!address || address.length < 6) {
    return 'N/A';
  }

  return `${address.slice(0, 5)}...${address.slice(-3)}`;
};

export const getRecurrence = (series?: PredictSeries[]): Recurrence => {
  if (!series || series.length === 0) {
    return Recurrence.NONE;
  }

  const recurrence = series[0]?.recurrence;
  if (!recurrence) {
    return Recurrence.NONE;
  }

  // Map string recurrence to Recurrence enum
  switch (recurrence.toLowerCase()) {
    case 'daily':
      return Recurrence.DAILY;
    case 'weekly':
      return Recurrence.WEEKLY;
    case 'monthly':
      return Recurrence.MONTHLY;
    case 'yearly':
    case 'annually':
      return Recurrence.YEARLY;
    case 'quarterly':
      return Recurrence.QUARTERLY;
    default:
      return Recurrence.NONE;
  }
};

export const formatCents = (dollars: string | number): string => {
  const num = typeof dollars === 'string' ? parseFloat(dollars) : dollars;

  if (isNaN(num)) {
    return '0¢';
  }

  // Convert dollars to cents (multiply by 100) and round to whole cents
  const cents = Math.round(num * 100);

  return `${cents}¢`;
};

/**
 * Formats position size with variable decimal precision based on magnitude
 * @param size - Raw position size value
 * @returns Format varies by size:
 * - Size < 0.01: "X.XXXXXX" (6 decimals)
 * - Size < 1: "X.XXXX" (4 decimals)
 * - Size >= 1: "X.XX" (2 decimals)
 * @example formatPositionSize(0.001234) => "0.001234"
 * @example formatPositionSize(0.5678) => "0.5678"
 * @example formatPositionSize(123.456) => "123.46"
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

export const formatCurrencyValue = (
  value?: number,
  options: { showSign?: boolean } = {},
): string | undefined => {
  if (value === undefined || value === null) {
    return undefined;
  }

  const formatted = formatPrice(Math.abs(value), {
    minimumDecimals: 2,
    maximumDecimals: 2,
  });

  if (!options.showSign) {
    return formatted;
  }

  if (value > 0) {
    return `+${formatted}`;
  }

  if (value < 0) {
    return `-${formatted}`;
  }

  return formatted;
};

/**
 * Shared formatting utilities for Perps components
 */
import { BigNumber } from 'bignumber.js';
import { strings } from '../../../../../locales/i18n';
import { getIntlDateTimeFormatter } from '../../../../util/intl';
import {
  type FiatRangeConfig,
  formatPerpsFiat,
} from '@metamask/perps-controller';

// Decimal formatters moved to controller for cross-platform sharing
export type { FiatRangeConfig };
export {
  PRICE_THRESHOLD,
  formatWithSignificantDigits,
  PRICE_RANGES_MINIMAL_VIEW,
  PRICE_RANGES_UNIVERSAL,
  formatPositionSize,
  formatPnl,
  formatPercentage,
  formatFundingRate,
} from '@metamask/perps-controller';
export { formatPerpsFiat }; // re-export via local import (needed by formatPositiveFiat below)

/**
 * Truncates a number to 2 decimal places without rounding up.
 * Uses BigNumber to avoid IEEE 754 floating-point errors
 * (e.g. `Math.floor(10.29 * 100) / 100` = 10.28).
 */
export const truncateToTwoDecimals = (value: number): number =>
  new BigNumber(value).decimalPlaces(2, BigNumber.ROUND_DOWN).toNumber();

/**
 * Formats a fee value as USD currency with appropriate decimal places
 * @param fee - Raw numeric or string fee value (e.g., 1234.56, not token minimal denomination)
 * @returns Formatted currency string with variable decimals based on configured ranges
 * @example formatPositiveFiat(1234.56) => "$1,234.56"
 * @example formatPositiveFiat(0.005) => "< $0.01"
 * @example formatPositiveFiat(0) => "$0"
 */
export const formatPositiveFiat = (fee: number | string): string => {
  const smallFeeThreshold = 0.01;

  if (BigNumber(fee).isEqualTo(0)) {
    return '$0';
  }
  if (BigNumber(fee).isLessThan(smallFeeThreshold)) {
    return '< $0.01';
  }
  return formatPerpsFiat(fee);
};

/**
 * Default price range configurations
 * Applied in order - first matching condition wins
 */
export const DEFAULT_PRICE_RANGES: FiatRangeConfig[] = [
  {
    // Medium-large numbers (>= 1000)
    condition: (val: number) => Math.abs(val) >= 1000,
    minimumDecimals: 2,
    maximumDecimals: 4,
    threshold: 100,
  },
  {
    // Default range (1 <= val < 1000)
    condition: () => true,
    minimumDecimals: 2,
    maximumDecimals: 4,
    threshold: 0.0001,
  },
];

/**
 * Configuration for large number range formatting
 */
export interface LargeNumberRangeConfig {
  /** The minimum value threshold for this range (inclusive). Use 0 to catch numbers below the lowest suffix threshold */
  threshold: number;
  /** The suffix to use for this range (e.g., 'T', 'B', 'M', 'K', or '' for no suffix) */
  suffix: string;
  /** Number of decimal places for this range */
  decimals: number;
}

/**
 * Default large number range configurations
 * Applied in order from largest to smallest
 */
export const DEFAULT_LARGE_NUMBER_RANGES: LargeNumberRangeConfig[] = [
  {
    threshold: 1000000000000, // >= 1T
    suffix: 'T',
    decimals: 0,
  },
  {
    threshold: 1000000000, // >= 1B
    suffix: 'B',
    decimals: 0,
  },
  {
    threshold: 1000000, // >= 1M
    suffix: 'M',
    decimals: 0,
  },
  {
    threshold: 1000, // >= 1K
    suffix: 'K',
    decimals: 0,
  },
  {
    threshold: 0, // < 1K (all remaining numbers)
    suffix: '',
    decimals: 2,
  },
];

/**
 * Preset for detailed large number formatting with more decimal precision
 * Useful for displaying precise statistics or detailed financial data
 */
export const LARGE_NUMBER_RANGES_DETAILED: LargeNumberRangeConfig[] = [
  {
    threshold: 1000000000000, // >= 1T
    suffix: 'T',
    decimals: 2,
  },
  {
    threshold: 1000000000, // >= 1B
    suffix: 'B',
    decimals: 2,
  },
  {
    threshold: 1000000, // >= 1M
    suffix: 'M',
    decimals: 2,
  },
  {
    threshold: 1000, // >= 1K
    suffix: 'K',
    decimals: 0,
  },
  {
    threshold: 0, // < 1K (all remaining numbers)
    suffix: '',
    decimals: 0,
  },
];

/**
 * Formats large numbers with magnitude suffixes (K, M, B, T)
 * @param value - The number to format
 * @param options - Optional formatting options
 * @param options.decimals - Legacy: Number of decimal places for all suffixed values (overrides range configs)
 * @param options.rawDecimals - Legacy: Number of decimal places for numbers below all thresholds (overrides range config for threshold: 0)
 * @param options.ranges - Custom range configurations for fine-grained control over decimals per range
 * @returns Formatted string with appropriate suffix
 * @example
 * // Using defaults
 * formatLargeNumber(1500000) => "2M"
 * formatLargeNumber(1234) => "1K"
 * formatLargeNumber(999) => "999.00"
 *
 * // Legacy: same decimals for all ranges
 * formatLargeNumber(1500000, { decimals: 1 }) => "1.5M"
 * formatLargeNumber(1234, { decimals: 2 }) => "1.23K"
 *
 * // New: custom decimals per range (including all remaining numbers)
 * formatLargeNumber(1500000, {
 *   ranges: [
 *     { threshold: 1000000000000, suffix: 'T', decimals: 2 },
 *     { threshold: 1000000000, suffix: 'B', decimals: 1 },
 *     { threshold: 1000000, suffix: 'M', decimals: 1 },
 *     { threshold: 1000, suffix: 'K', decimals: 0 },
 *     { threshold: 0, suffix: '', decimals: 4 }, // < 1K (all remaining numbers)
 *   ]
 * }) => "1.5M"
 */
export const formatLargeNumber = (
  value: string | number,
  options?: {
    decimals?: number; // Legacy: applies to all suffixed ranges
    rawDecimals?: number; // Legacy: applies to numbers below all thresholds
    ranges?: LargeNumberRangeConfig[]; // Custom range configurations
  },
): string => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  const ranges = options?.ranges ?? DEFAULT_LARGE_NUMBER_RANGES;

  if (isNaN(num)) {
    return '0';
  }

  const absNum = Math.abs(num);
  const sign = num < 0 ? '-' : '';

  // Check each range in order
  for (const range of ranges) {
    if (absNum >= range.threshold) {
      // Calculate divisor based on threshold (or 1 for no scaling)
      const divisor = range.threshold > 0 ? range.threshold : 1;
      const scaledValue = absNum / divisor;

      // Determine decimals to use
      let decimalPlaces = range.decimals;

      // Legacy support: override with options.decimals for suffixed values
      if (options?.decimals !== undefined && range.suffix !== '') {
        decimalPlaces = options.decimals;
      }

      // Legacy support: override with options.rawDecimals for non-suffixed values
      if (options?.rawDecimals !== undefined && range.suffix === '') {
        decimalPlaces = options.rawDecimals;
      }

      return `${sign}${scaledValue.toFixed(decimalPlaces)}${range.suffix}`;
    }
  }

  // This should never be reached if ranges includes a threshold: 0 entry
  // But keep as fallback for safety
  return num.toFixed(options?.rawDecimals ?? 2);
};

/**
 * Formats volume with appropriate magnitude suffixes
 * @param volume - Raw volume value
 * @param decimals - Number of decimal places to show (optional, auto-determined by default)
 * @returns Format: "$XB" / "$X.XXM" / "$XK" / "$X.XX"
 * @example formatVolume(1234567890) => "$1.23B"
 * @example formatVolume(12345678) => "$12.35M"
 * @example formatVolume(123456) => "$123K"
 */
export const formatVolume = (
  volume: string | number,
  decimals?: number,
): string => {
  const num = typeof volume === 'string' ? parseFloat(volume) : volume;

  // Handle invalid inputs - return fallback display for NaN/Infinity
  if (isNaN(num) || !isFinite(num)) {
    return '$---';
  }

  const absNum = Math.abs(num);

  // Auto-determine decimals based on magnitude if not specified
  let autoDecimals;
  if (decimals === undefined) {
    if (absNum >= 1000000000) {
      // Billions: 2 decimals
      autoDecimals = 2;
    } else if (absNum >= 1000000) {
      // Millions: 2 decimals
      autoDecimals = 2;
    } else if (absNum >= 1000) {
      // Thousands: 0 decimals
      autoDecimals = 0;
    } else {
      // Under 1000: 2 decimals
      autoDecimals = 2;
    }
  } else {
    autoDecimals = decimals;
  }

  const formatted = formatLargeNumber(volume, {
    decimals: autoDecimals,
    rawDecimals: autoDecimals,
  });

  // Handle negative values - ensure dollar sign comes after negative sign
  if (formatted.startsWith('-')) {
    return `-$${formatted.slice(1)}`;
  }

  return `$${formatted}`;
};

/**
 * Formats leverage value with 'x' suffix
 * @param leverage - Raw leverage multiplier value
 * @returns Format: "X.Xx" (1 decimal place with 'x' suffix)
 * @example formatLeverage(5) => "5.0x"
 * @example formatLeverage(10.5) => "10.5x"
 * @example formatLeverage(1) => "1.0x"
 */
export const formatLeverage = (leverage: string | number): string => {
  const num = typeof leverage === 'string' ? parseFloat(leverage) : leverage;

  if (isNaN(num)) {
    return '1x';
  }

  return `${num.toFixed(1)}x`;
};

/**
 * Parses formatted currency strings back to numeric values
 * @param formattedValue - Formatted currency string (handles $, commas, negative values)
 * @returns Raw numeric value
 * @example parseCurrencyString("$1,234.56") => 1234.56
 * @example parseCurrencyString("-$500.00") => -500
 * @example parseCurrencyString("$-123.45") => -123.45
 */
export const parseCurrencyString = (formattedValue: string): number => {
  if (!formattedValue) return 0;

  // Check for negative values (can be -$123.45 or $-123.45)
  const isNegative = formattedValue.includes('-');

  // Remove all non-numeric characters except dots
  // This regex removes currency symbols ($, €, etc.), commas, minus signs, and other formatting
  const cleanedValue = formattedValue
    .replace(/[^0-9.]/g, '') // Remove everything except digits and dots
    .trim();

  // Handle multiple dots by keeping only the last one as decimal separator
  // NOTE: This assumes US format (comma for thousands, dot for decimal)
  // Numbers with dots as thousand separators (e.g., European format) will be parsed incorrectly
  const parts = cleanedValue.split('.');
  const integerPart = parts[0] || '0';
  const decimalPart = parts.length > 1 ? parts[parts.length - 1] : '';

  const finalValue = decimalPart
    ? `${integerPart}.${decimalPart}`
    : integerPart;
  const parsed = parseFloat(finalValue);

  if (isNaN(parsed)) return 0;

  return isNegative ? -parsed : parsed;
};

/**
 * Parses formatted percentage strings back to numeric values
 * @param formattedValue - Formatted percentage string (handles %, +/- signs)
 * @returns Raw numeric percentage value
 * @example parsePercentageString("+2.50%") => 2.5
 * @example parsePercentageString("-10.75%") => -10.75
 * @example parsePercentageString("5%") => 5
 */
export const parsePercentageString = (formattedValue: string): number => {
  if (!formattedValue) return 0;
  const cleanedValue = formattedValue
    .replace(/%/g, '')
    .replace(/\s/g, '')
    .trim();
  const parsed = parseFloat(cleanedValue);
  return isNaN(parsed) ? 0 : parsed;
};

/**
 * Formats a timestamp for transaction detail views with time
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Formatted date string with time (e.g., "July 24, 2025 at 2:30 PM")
 * @example formatTransactionDate(1642492800000) => "January 18, 2022 at 12:00 AM"
 */
export const formatTransactionDate = (timestamp: number): string => {
  const date = new Date(timestamp);
  const dateStr = getIntlDateTimeFormatter('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
  const timeStr = getIntlDateTimeFormatter('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
  return `${dateStr} at ${timeStr}`;
};

/**
 * Formats a timestamp for order cards with time
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Formatted date string with time (e.g., "July 24, 2025 at 2:30 PM")
 * @example formatOrderCardDate(1642492800000) => "Jan 18"
 */
export const formatOrderCardDate = (timestamp: number): string => {
  const date = new Date(timestamp);
  const dateStr = getIntlDateTimeFormatter('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(date);
  const timeStr = getIntlDateTimeFormatter('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
  return `${dateStr} at ${timeStr}`;
};

/**
 * Formats a timestamp for transaction section headers
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Formatted date section string ("Today", "Yesterday", or "Month Day")
 * @example formatDateSection(Date.now()) => "Today"
 */
export const formatDateSection = (timestamp: number): string => {
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  // Check if it's today
  if (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  ) {
    return strings('perps.today');
  }

  // Check if it's yesterday
  if (
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear()
  ) {
    return strings('perps.yesterday');
  }

  const month = getIntlDateTimeFormatter('en-US', {
    month: 'short',
  }).format(new Date(timestamp));
  const day = getIntlDateTimeFormatter('en-US', {
    day: 'numeric',
  }).format(new Date(timestamp));

  return `${month} ${day}`; // 'Jul, 26'
};

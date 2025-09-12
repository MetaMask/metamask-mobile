/**
 * Shared formatting utilities for Perps components
 */
import { formatWithThreshold } from '../../../../util/assets';
import { FUNDING_RATE_CONFIG } from '../constants/perpsConfig';
import {
  getIntlNumberFormatter,
  getIntlDateTimeFormatter,
} from '../../../../util/intl';

/**
 * Configuration for a specific number range formatting
 */
export interface FiatRangeConfig {
  /**
   * The condition to match for this range (e.g., < 0.0001, < 1, >= 1000)
   * Function should return true if this config should be applied
   */
  condition: (value: number) => boolean;
  /** Minimum decimal places for this range */
  minimumDecimals: number;
  /** Maximum decimal places for this range */
  maximumDecimals: number;
  /** Optional threshold for formatWithThreshold (defaults to the range boundary) */
  threshold?: number;
  /** Optional significant digits for this range (overrides decimal places when set) */
  significantDigits?: number;
  /** Optional custom formatting logic for this range */
  customFormat?: (value: number, locale: string, currency: string) => string;
}

/**
 * Default fiat formatting range configurations
 * Applied in order - first matching condition wins
 */
export const DEFAULT_FIAT_RANGES: FiatRangeConfig[] = [
  {
    // Standard fiat formatting (default for backward compatibility)
    condition: () => true,
    minimumDecimals: 2,
    maximumDecimals: 2,
    threshold: 0.01,
  },
];

/**
 * Formats a number to a specific number of significant digits
 * @param value - The numeric value to format
 * @param significantDigits - Number of significant digits to maintain
 * @param minDecimals - Minimum decimal places to show (may add zeros)
 * @param maxDecimals - Maximum decimal places allowed
 * @returns Formatted number with appropriate precision
 */
export function formatWithSignificantDigits(
  value: number,
  significantDigits: number,
  minDecimals?: number,
  maxDecimals?: number,
): { value: number; decimals: number } {
  // Handle special cases
  if (value === 0) {
    return { value: 0, decimals: minDecimals ?? 2 };
  }

  const absValue = Math.abs(value);

  // Use toPrecision for significant digits, then parse back
  const precisionStr = absValue.toPrecision(significantDigits);
  const precisionNum = parseFloat(precisionStr);

  // Determine decimal places from the precision string
  const [, decPart = ''] = precisionStr.split('.');
  let actualDecimals = decPart.length;

  // Apply min/max decimal constraints
  if (minDecimals !== undefined && actualDecimals < minDecimals) {
    actualDecimals = minDecimals; // Will add zeros if needed
  }
  if (maxDecimals !== undefined && actualDecimals > maxDecimals) {
    actualDecimals = maxDecimals;
  }

  // Return the value with sign restored and decimal count
  return {
    value: value < 0 ? -precisionNum : precisionNum,
    decimals: actualDecimals,
  };
}

/**
 * Formats a balance value as USD currency with appropriate decimal places
 * @param balance - Raw numeric balance value (e.g., 1234.56, not token minimal denomination)
 * @param options - Optional formatting options
 * @param options.minimumDecimals - Global minimum decimal places (overrides range configs)
 * @param options.maximumDecimals - Global maximum decimal places (overrides range configs)
 * @param options.significantDigits - Global significant digits (overrides decimal settings when set)
 * @param options.ranges - Custom range configurations (defaults to DEFAULT_FIAT_RANGES)
 * @param options.currency - Currency code (default: 'USD')
 * @param options.locale - Locale for formatting (default: 'en-US')
 * @returns Formatted currency string with variable decimals based on configured ranges
 * @example
 * // Using defaults
 * formatPerpsFiat(1234.56) => "$1,234.56"
 * formatPerpsFiat(0.01) => "$0.01"
 * formatPerpsFiat(50000) => "$50,000.00"
 *
 * // With custom ranges
 * formatPerpsFiat(0.00001, {
 *   ranges: [
 *     { condition: (v) => v < 0.001, minimumDecimals: 6, maximumDecimals: 8 },
 *     { condition: () => true, minimumDecimals: 2, maximumDecimals: 2 }
 *   ]
 * }) => "$0.000010"
 *
 * // With significant digits
 * formatPerpsFiat(1234.56789, { significantDigits: 5 }) => "$1,234.6"
 * formatPerpsFiat(0.0001234, { significantDigits: 3 }) => "$0.000123"
 *
 * // With per-range significant digits
 * formatPerpsFiat(0.0001234, {
 *   ranges: [
 *     { condition: (v) => v < 0.01, significantDigits: 4, minimumDecimals: 6 }
 *   ]
 * }) => "$0.0001234"
 */
export const formatPerpsFiat = (
  balance: string | number,
  options?: {
    minimumDecimals?: number;
    maximumDecimals?: number;
    significantDigits?: number;
    ranges?: FiatRangeConfig[];
    currency?: string;
    locale?: string;
  },
): string => {
  const num = typeof balance === 'string' ? parseFloat(balance) : balance;
  const currency = options?.currency ?? 'USD';
  const locale = options?.locale ?? 'en-US';

  if (isNaN(num)) {
    // Use the formatter to get proper currency symbol and locale formatting
    // Use global settings if provided, otherwise use defaults
    const minDecimals = options?.minimumDecimals ?? 2;
    const maxDecimals = options?.maximumDecimals ?? 2;
    return formatWithThreshold(0, 0, locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: minDecimals,
      maximumFractionDigits: maxDecimals,
    });
  }

  // Use custom ranges or defaults
  const ranges = options?.ranges || DEFAULT_FIAT_RANGES;

  // Find the first matching range configuration
  const rangeConfig = ranges.find((range) => range.condition(num));

  if (!rangeConfig) {
    // Fallback if no range matches (shouldn't happen with proper default config)
    const fallbackMin = options?.minimumDecimals ?? 2;
    const fallbackMax = options?.maximumDecimals ?? 2;
    return formatWithThreshold(num, 0.01, locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: fallbackMin,
      maximumFractionDigits: fallbackMax,
    });
  }

  // Check for significant digits (global or range-specific)
  const sigDigits = options?.significantDigits ?? rangeConfig.significantDigits;

  // If significant digits are specified, use them
  if (sigDigits) {
    // Get min/max decimals (global overrides range, range overrides default)
    const minDecimals = options?.minimumDecimals ?? rangeConfig.minimumDecimals;
    const maxDecimals = options?.maximumDecimals ?? rangeConfig.maximumDecimals;

    // Calculate appropriate formatting based on significant digits
    const { value: formattedValue, decimals } = formatWithSignificantDigits(
      num,
      sigDigits,
      minDecimals,
      maxDecimals,
    );

    // Format with the calculated decimal places
    return formatWithThreshold(
      formattedValue,
      rangeConfig.threshold || 0.01,
      locale,
      {
        style: 'currency',
        currency,
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      },
    );
  }

  // Standard decimal-based formatting (existing logic)
  const minDecimals = options?.minimumDecimals ?? rangeConfig.minimumDecimals;
  const maxDecimals = options?.maximumDecimals ?? rangeConfig.maximumDecimals;

  // Use custom formatting if provided
  if (rangeConfig.customFormat) {
    return rangeConfig.customFormat(num, locale, currency);
  }

  // Use standard formatting with threshold
  return formatWithThreshold(num, rangeConfig.threshold || 0.01, locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: minDecimals,
    maximumFractionDigits: maxDecimals,
  });
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

export const PRICE_RANGES_DETAILED_VIEW: FiatRangeConfig[] = [
  {
    condition: (v) => v >= 1,
    minimumDecimals: 2,
    maximumDecimals: 2,
    threshold: 1,
  },
  {
    condition: (v) => v < 1,
    minimumDecimals: 2,
    maximumDecimals: 7,
    significantDigits: 3,
    threshold: 0.0000001,
  },
];

export const PRICE_RANGES_POSITION_VIEW: FiatRangeConfig[] = [
  {
    condition: (v) => v >= 1,
    minimumDecimals: 2,
    maximumDecimals: 2,
    threshold: 1,
  },
  {
    condition: (v) => v < 1,
    minimumDecimals: 2,
    maximumDecimals: 7,
    significantDigits: 4,
    threshold: 0.0000001,
  },
];

export const PRICE_RANGES_MINIMAL_VIEW: FiatRangeConfig[] = [
  {
    condition: () => true,
    minimumDecimals: 2,
    maximumDecimals: 2,
    threshold: 0.01,
  },
];

/**
 * Formats a price value as USD currency with variable decimal places based on magnitude
 * @param price - Raw numeric price value
 * @param options - Optional formatting options
 * @param options.minimumDecimals - Global minimum decimal places (overrides range configs)
 * @param options.maximumDecimals - Global maximum decimal places (overrides range configs)
 * @param options.ranges - Custom range configurations (defaults to DEFAULT_PRICE_RANGES)
 * @returns USD formatted string with variable decimals based on configured ranges
 * @example
 * // Using defaults
 * formatPrice(0.00001234) => "$0.000012"
 * formatPrice(0.1234) => "$0.1234"
 * formatPrice(1234.5678) => "$1,234.57"
 * formatPrice(50000) => "$50,000"
 *
 * // With custom ranges
 * formatPrice(0.00001, {
 *   ranges: [
 *     { condition: (v) => v < 0.001, minimumDecimals: 8, maximumDecimals: 10 },
 *     { condition: () => true, minimumDecimals: 2, maximumDecimals: 2 }
 *   ]
 * }) => "$0.00001000"
 */
export const formatPrice = (
  price: string | number,
  options?: {
    minimumDecimals?: number;
    maximumDecimals?: number;
  },
): string => {
  // Default to min 2, max 4 decimals for prices
  const minimumDecimals = options?.minimumDecimals ?? 2;
  const maximumDecimals = options?.maximumDecimals ?? 4;
  // Use formatPerpsFiat with price-specific defaults or custom ranges
  return formatPerpsFiat(price, {
    minimumDecimals,
    maximumDecimals,
    ...options,
    ranges: DEFAULT_PRICE_RANGES,
  });
};

/**
 * Formats a PnL (Profit and Loss) value with sign prefix
 * @param pnl - Raw numeric PnL value (positive for profit, negative for loss)
 * @returns Format: "+$X,XXX.XX" or "-$X,XXX.XX" (always shows sign, 2 decimals)
 * @example formatPnl(1234.56) => "+$1,234.56"
 * @example formatPnl(-500) => "-$500.00"
 * @example formatPnl(0) => "+$0.00"
 */
export const formatPnl = (pnl: string | number): string => {
  const num = typeof pnl === 'string' ? parseFloat(pnl) : pnl;

  if (isNaN(num)) {
    return '$0.00';
  }

  const formatted = getIntlNumberFormatter('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(num));

  return num >= 0 ? `+${formatted}` : `-${formatted}`;
};

/**
 * Formats a percentage value with sign prefix
 * @param value - Raw percentage value (e.g., 5.25 for 5.25%, not 0.0525)
 * @param decimals - Number of decimal places to show (default: 2)
 * @returns Format: "+X.XX%" or "-X.XX%" (always shows sign, 2 decimals)
 * @example formatPercentage(5.25) => "+5.25%"
 * @example formatPercentage(-2.75) => "-2.75%"
 * @example formatPercentage(0) => "+0.00%"
 */
export const formatPercentage = (
  value: string | number,
  decimals: number = 2,
): string => {
  const num = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(num)) {
    return '0.00%';
  }

  return `${num >= 0 ? '+' : ''}${num.toFixed(decimals)}%`;
};

/**
 * Formats funding rate for display
 * @param value - Raw funding rate value (decimal, not percentage)
 * @param options - Optional formatting options
 * @param options.showZero - Whether to return zero display value for zero/undefined (default: true)
 * @returns Formatted funding rate as percentage string
 * @example formatFundingRate(0.0005) => "0.0500%"
 * @example formatFundingRate(-0.0001) => "-0.0100%"
 * @example formatFundingRate(undefined) => "0.0000%"
 */
export const formatFundingRate = (
  value?: number | null,
  options?: { showZero?: boolean },
): string => {
  const showZero = options?.showZero ?? true;

  if (value === undefined || value === null) {
    return showZero ? FUNDING_RATE_CONFIG.ZERO_DISPLAY : '';
  }

  const percentage = value * FUNDING_RATE_CONFIG.PERCENTAGE_MULTIPLIER;
  const formatted = percentage.toFixed(FUNDING_RATE_CONFIG.DECIMALS);

  // Check if the result is effectively zero
  if (showZero && parseFloat(formatted) === 0) {
    return FUNDING_RATE_CONFIG.ZERO_DISPLAY;
  }

  return `${formatted}%`;
};

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
  let autoDecimals = decimals;
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
    return 'Today';
  }

  // Check if it's yesterday
  if (
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear()
  ) {
    return 'Yesterday';
  }

  const month = getIntlDateTimeFormatter('en-US', {
    month: 'short',
  }).format(new Date(timestamp));
  const day = getIntlDateTimeFormatter('en-US', {
    day: 'numeric',
  }).format(new Date(timestamp));

  return `${month}, ${day}`; // 'Jul, 26'
};

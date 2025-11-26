/**
 * Shared formatting utilities for Perps components
 */
import { BigNumber } from 'bignumber.js';
import { formatWithThreshold } from '../../../../util/assets';
import {
  FUNDING_RATE_CONFIG,
  PERPS_CONSTANTS,
  DECIMAL_PRECISION_CONFIG,
} from '../constants/perpsConfig';
import {
  getIntlNumberFormatter,
  getIntlDateTimeFormatter,
} from '../../../../util/intl';
import { strings } from '../../../../../locales/i18n';

/**
 * Price threshold constants for PRICE_RANGES_UNIVERSAL
 * These define the boundaries between different formatting ranges
 */
export const PRICE_THRESHOLD = {
  /** Very high values boundary (> $100k) */
  VERY_HIGH: 100_000,
  /** High values boundary (> $10k) */
  HIGH: 10_000,
  /** Large values boundary (> $1k) */
  LARGE: 1_000,
  /** Medium values boundary (> $100) */
  MEDIUM: 100,
  /** Medium-low values boundary (> $10) */
  MEDIUM_LOW: 10,
  /** Low values boundary (>= $0.01) */
  LOW: 0.01,
  /**
   * Very small values threshold (< $0.01)
   * This is the minimum value for formatWithThreshold and should align with
   * the 6 decimal maximum (0.000001 is the smallest representable value)
   */
  VERY_SMALL: 0.000001,
} as const;

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
  /** Optional flag to strip trailing zeros for this range (overrides global stripTrailingZeros option) */
  stripTrailingZeros?: boolean;
  /**
   * Optional flag for fiat-style stripping (only strips .00, preserves meaningful decimals like .10, .40)
   * When true, "$1,250.00" → "$1,250" but "$1,250.10" stays "$1,250.10"
   * When false (default), strips all trailing zeros: "$1,250.10" → "$1,250.1"
   */
  fiatStyleStripping?: boolean;
}

/**
 * Formats a number to a specific number of significant digits
 * Strips trailing zeros unless minDecimals requires them
 * @param value - The numeric value to format
 * @param significantDigits - Number of significant digits to maintain
 * @param minDecimals - Minimum decimal places to show (may add zeros)
 * @param maxDecimals - Maximum decimal places allowed
 * @returns Formatted number with appropriate precision, trailing zeros removed
 */
export function formatWithSignificantDigits(
  value: number,
  significantDigits: number,
  minDecimals?: number,
  maxDecimals?: number,
): { value: number; decimals: number } {
  // Handle special cases
  if (value === 0) {
    // Return zero with no trailing decimals by default (matches stripTrailingZeros behavior)
    // Can be overridden by explicit minDecimals if needed
    return { value: 0, decimals: minDecimals ?? 0 };
  }

  const absValue = Math.abs(value);

  // For numbers >= 1, calculate decimals based on magnitude to achieve target significant figures
  // This ensures consistent precision across different price ranges:
  // Examples with 4 significant figures:
  //   $123,456.78 → $123,456.78 (≥$1000: 2 decimals minimum, 8 sig figs)
  //   $456.12 → $456.12 (≥$10: 2 decimals minimum, 5 sig figs)
  //   $56.123 → $56.123 (≥$10: 2 decimals minimum, 5 sig figs)
  //   $5.123 → $5.123 ($1-$10: 3 decimals = 4 sig figs)
  //   $2.801 → $2.801 ($1-$10: 3 decimals = 4 sig figs)
  //   $1.234 → $1.234 ($1-$10: 3 decimals = 4 sig figs)
  if (absValue >= 1) {
    let targetDecimals: number;

    // Calculate decimals needed based on integer digits to achieve target significant figures
    // For $38.388 with 5 sig figs: 2 integer digits, need 3 decimals (3,8,3,8,8)
    // For $123.45 with 5 sig figs: 3 integer digits, need 2 decimals (1,2,3,4,5)
    const integerDigits = Math.floor(Math.log10(absValue)) + 1;
    const decimalsNeeded = significantDigits - integerDigits;
    targetDecimals = Math.max(decimalsNeeded, 0); // Can't have negative decimals

    // Apply explicit minimum decimals constraint if provided (for special cases)
    if (minDecimals !== undefined && targetDecimals < minDecimals) {
      targetDecimals = minDecimals;
    }

    // Apply maximum decimals constraint if specified
    const finalDecimals =
      maxDecimals !== undefined
        ? Math.min(targetDecimals, maxDecimals)
        : targetDecimals;

    // Round to prevent floating-point artifacts (e.g., 2.820000000000003 → 2.82)
    const roundedValue = Number(value.toFixed(finalDecimals));

    return {
      value: roundedValue,
      decimals: finalDecimals,
    };
  }

  // For numbers < 1, use toPrecision to limit to significantDigits
  // Examples: 0.1234, 0.01234 should show exactly 4 sig figs
  const precisionStr = absValue.toPrecision(significantDigits);
  const precisionNum = parseFloat(precisionStr);

  // Convert to string to count actual decimals after trailing zeros are removed
  const valueStr = precisionNum.toString();
  const [, decPart = ''] = valueStr.split('.');
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
 * Minimal view fiat range configuration
 * Uses fiat-style stripping for clean currency display
 * Strips only .00 to avoid partial decimals like $1,250.1
 */
export const PRICE_RANGES_MINIMAL_VIEW: FiatRangeConfig[] = [
  {
    // Large values (>= $1000): Strip .00 only ($5,000 not $5,000.00, but $5,000.10 stays)
    condition: (val: number) => Math.abs(val) >= PRICE_THRESHOLD.LARGE,
    minimumDecimals: 2,
    maximumDecimals: 2,
    threshold: PRICE_THRESHOLD.LARGE,
    stripTrailingZeros: true,
    fiatStyleStripping: true,
  },
  {
    // Small values (< $1000): Also use fiat-style stripping ($100 not $100.00, but $13.40 stays)
    condition: () => true,
    minimumDecimals: 2,
    maximumDecimals: 2,
    threshold: PRICE_THRESHOLD.LOW,
    stripTrailingZeros: true,
    fiatStyleStripping: true,
  },
];

/**
 * Formats a balance value as USD currency with appropriate decimal places
 * @param balance - Raw numeric balance value (e.g., 1234.56, not token minimal denomination)
 * @param options - Optional formatting options
 * @param options.minimumDecimals - Global minimum decimal places (overrides range configs)
 * @param options.maximumDecimals - Global maximum decimal places (overrides range configs)
 * @param options.significantDigits - Global significant digits (overrides decimal settings when set)
 * @param options.ranges - Custom range configurations (defaults to PRICE_RANGES_MINIMAL_VIEW)
 * @param options.currency - Currency code (default: 'USD')
 * @param options.locale - Locale for formatting (default: 'en-US')
 * @param options.stripTrailingZeros - Strip trailing zeros from output (default: false via PRICE_RANGES_MINIMAL_VIEW). When true, overrides minimumDecimals constraint.
 * @returns Formatted currency string with variable decimals based on configured ranges
 * @example
 * // Using defaults (preserves trailing zeros for fiat)
 * formatPerpsFiat(1234.56) => "$1,234.56"
 * formatPerpsFiat(1250.00) => "$1,250.00"  // Trailing zeros preserved
 * formatPerpsFiat(50000) => "$50,000.00"   // Trailing zeros preserved
 *
 * // Stripping trailing zeros when needed (e.g., for crypto)
 * formatPerpsFiat(1250, { stripTrailingZeros: true }) => "$1,250"
 *
 * // With custom ranges
 * formatPerpsFiat(0.00001, {
 *   ranges: [
 *     { condition: (v) => v < 0.001, minimumDecimals: 6, maximumDecimals: 8 },
 *     { condition: () => true, minimumDecimals: 2, maximumDecimals: 2 }
 *   ]
 * }) => "$0.00001"  // Trailing zero stripped
 *
 * // With significant digits
 * formatPerpsFiat(1234.56789, { significantDigits: 5 }) => "$1,234.6"
 * formatPerpsFiat(0.0001234, { significantDigits: 3 }) => "$0.000123"
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
    stripTrailingZeros?: boolean;
  },
): string => {
  const num = typeof balance === 'string' ? parseFloat(balance) : balance;
  const currency = options?.currency ?? 'USD';
  const locale = options?.locale ?? 'en-US';

  let formatted: string;

  if (isNaN(num)) {
    // Return placeholder for invalid values to avoid confusion with actual $0 values
    return PERPS_CONSTANTS.FALLBACK_PRICE_DISPLAY;
  }

  // Use custom ranges or defaults
  const ranges = options?.ranges || PRICE_RANGES_MINIMAL_VIEW;

  // Find the first matching range configuration
  const rangeConfig = ranges.find((range) => range.condition(num));

  if (!rangeConfig) {
    // Fallback if no range matches (shouldn't happen with proper default config)
    const fallbackMin = options?.minimumDecimals ?? 2;
    const fallbackMax = options?.maximumDecimals ?? 2;
    formatted = formatWithThreshold(num, 0.01, locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: fallbackMin,
      maximumFractionDigits: fallbackMax,
    });
  } else {
    // Check for significant digits (global or range-specific)
    const sigDigits =
      options?.significantDigits ?? rangeConfig.significantDigits;

    // If significant digits are specified, use them
    if (sigDigits) {
      // Get min/max decimals (global overrides range, range overrides default)
      const minDecimals =
        options?.minimumDecimals ?? rangeConfig.minimumDecimals;
      const maxDecimals =
        options?.maximumDecimals ?? rangeConfig.maximumDecimals;

      // Calculate appropriate formatting based on significant digits
      const { value: formattedValue, decimals } = formatWithSignificantDigits(
        num,
        sigDigits,
        minDecimals,
        maxDecimals,
      );

      // Format with the calculated decimal places
      formatted = formatWithThreshold(
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
    } else {
      // Standard decimal-based formatting (existing logic)
      const minDecimals =
        options?.minimumDecimals ?? rangeConfig.minimumDecimals;
      const maxDecimals =
        options?.maximumDecimals ?? rangeConfig.maximumDecimals;

      // Use custom formatting if provided
      if (rangeConfig.customFormat) {
        formatted = rangeConfig.customFormat(num, locale, currency);
      } else {
        // Use standard formatting with threshold
        formatted = formatWithThreshold(
          num,
          rangeConfig.threshold || 0.01,
          locale,
          {
            style: 'currency',
            currency,
            minimumFractionDigits: minDecimals,
            maximumFractionDigits: maxDecimals,
          },
        );
      }
    }
  }

  // Post-process: strip trailing zeros unless explicitly disabled
  // Priority: explicit options.stripTrailingZeros false > rangeConfig > options default > true
  // If options.stripTrailingZeros is explicitly false, skip stripping entirely
  if (options?.stripTrailingZeros === false) {
    return formatted;
  }

  // Otherwise check range config or default to true
  const shouldStrip =
    rangeConfig?.stripTrailingZeros ?? options?.stripTrailingZeros ?? true;

  if (shouldStrip) {
    // Check if fiat-style stripping is enabled (only strips .00)
    const useFiatStyle = rangeConfig?.fiatStyleStripping ?? false;

    if (useFiatStyle) {
      // Fiat-style: Only strip .00 (no meaningful decimals), preserve 2-decimal format
      // Examples: $1,250.00 → $1,250 | $1,000.10 → $1,000.10 | $13.40 → $13.40
      return formatted.replace(/\.00$/, '');
    }
    // Standard: Strip all trailing zeros after decimal point
    // Examples: $1,250.00 → $1,250 | $100.0 → $100 | $10.5 → $10.5 | $1.234 → $1.234
    return formatted.replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
  }

  return formatted;
};

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
 * Universal price range configuration following comprehensive rules from rules-decimals.md
 *
 * Rules:
 * - Max 6 decimals across all ranges (Hyperliquid limit)
 * - Strip trailing zeros by default
 * - Use |v| (absolute value) for conditions
 *
 * Significant digits by range:
 * - > $100,000: 6 sig digs
 * - $100,000 > x > $0.01: 5 sig digs
 * - < $0.01: 4 sig digs
 *
 * Decimal limits by price range:
 * - |v| > 10,000: min 0, max 0 decimals; 5 sig digs (6 if >100k)
 * - |v| > 1,000: min 0, max 1 decimal; 5 sig digs
 * - |v| > 100: min 0, max 2 decimals; 5 sig digs
 * - |v| > 10: min 0, max 4 decimals; 5 sig digs
 * - |v| ≥ 0.01: 5 sig digs, min 2, max 6 decimals
 * - |v| < 0.01: 4 sig digs, min 2, max 6 decimals
 *
 * Examples:
 * - $123,456.78 → $123,457 (>$10k: 0 decimals, 6 sig figs)
 * - $12,345.67 → $12,346 (>$10k: 0 decimals, 5 sig figs)
 * - $1,234.56 → $1,234.6 ($1k-$10k: 1 decimal, 5 sig figs)
 * - $123.456 → $123.46 ($100-$1k: 2 decimals, 5 sig figs)
 * - $12.34567 → $12.346 ($10-$100: 4 decimals, 5 sig figs)
 * - $1.3445555 → $1.3446 (≥$0.01: 5 sig figs)
 * - $0.333333 → $0.33333 (≥$0.01: 5 sig figs)
 * - $0.004236 → $0.004236 (<$0.01: 4 sig figs, max 6 decimals)
 * - $0.0000006 → $0.000001 (<$0.01: 4 sig figs, rounds with max 6 decimals)
 */
export const PRICE_RANGES_UNIVERSAL: FiatRangeConfig[] = [
  {
    // Very high values (> $100,000): No decimals, 6 significant figures
    // Ex: $123,456.78 → $123,457
    condition: (v) => Math.abs(v) > PRICE_THRESHOLD.VERY_HIGH,
    minimumDecimals: 0,
    maximumDecimals: 0,
    significantDigits: 6,
    threshold: PRICE_THRESHOLD.VERY_HIGH,
  },
  {
    // High values ($10,000-$100,000]: No decimals, 5 significant figures
    // Ex: $12,345.67 → $12,346
    condition: (v) => Math.abs(v) > PRICE_THRESHOLD.HIGH,
    minimumDecimals: 0,
    maximumDecimals: 0,
    significantDigits: 5,
    threshold: PRICE_THRESHOLD.HIGH,
  },
  {
    // Large values ($1,000-$10,000]: Max 1 decimal, 5 significant figures
    // Ex: $1,234.56 → $1,234.6
    condition: (v) => Math.abs(v) > PRICE_THRESHOLD.LARGE,
    minimumDecimals: 0,
    maximumDecimals: 1,
    significantDigits: 5,
    threshold: PRICE_THRESHOLD.LARGE,
  },
  {
    // Medium values ($100-$1,000]: Max 2 decimals, 5 significant figures
    // Ex: $123.456 → $123.46
    condition: (v) => Math.abs(v) > PRICE_THRESHOLD.MEDIUM,
    minimumDecimals: 0,
    maximumDecimals: 2,
    significantDigits: 5,
    threshold: PRICE_THRESHOLD.MEDIUM,
  },
  {
    // Medium-low values ($10-$100]: Max 4 decimals, 5 significant figures
    // Ex: $12.34567 → $12.346
    condition: (v) => Math.abs(v) > PRICE_THRESHOLD.MEDIUM_LOW,
    minimumDecimals: 0,
    maximumDecimals: 4,
    significantDigits: 5,
    threshold: PRICE_THRESHOLD.MEDIUM_LOW,
  },
  {
    // Low values ($0.01-$10]: 5 significant figures, min 2 max MAX_PRICE_DECIMALS decimals
    // Ex: $1.3445555 → $1.3446 | $0.333333 → $0.33333
    condition: (v) => Math.abs(v) >= PRICE_THRESHOLD.LOW,
    significantDigits: 5,
    minimumDecimals: 2,
    maximumDecimals: DECIMAL_PRECISION_CONFIG.MAX_PRICE_DECIMALS,
    threshold: PRICE_THRESHOLD.LOW,
  },
  {
    // Very small values (< $0.01): 4 significant figures, min 2 max MAX_PRICE_DECIMALS decimals
    // Ex: $0.004236 → $0.004236 | $0.0000006 → $0.000001
    condition: () => true,
    significantDigits: 4,
    minimumDecimals: 2,
    maximumDecimals: DECIMAL_PRECISION_CONFIG.MAX_PRICE_DECIMALS,
    threshold: PRICE_THRESHOLD.VERY_SMALL,
  },
];

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
    return PERPS_CONSTANTS.ZERO_AMOUNT_DETAILED_DISPLAY;
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
 * Formats position size with variable decimal precision based on magnitude or asset-specific decimals
 * Removes trailing zeros to match task requirements
 * @param size - Raw position size value
 * @param szDecimals - Optional asset-specific decimal precision from Hyperliquid metadata (e.g., BTC=5, ETH=4, DOGE=1)
 * @returns Format varies by size or uses asset-specific decimals, with trailing zeros removed:
 * If szDecimals provided: Uses exact decimals (e.g., 0.00009 BTC with szDecimals=5 => "0.00009")
 * Otherwise falls back to magnitude-based logic:
 * - Size < 0.01: Up to 6 decimals (e.g., "0.00009" not "0.000090")
 * - Size < 1: Up to 4 decimals (e.g., "0.0024" not "0.002400")
 * - Size >= 1: Up to 2 decimals (e.g., "44" not "44.00")
 * @example formatPositionSize(0.00009, 5) => "0.00009" (uses szDecimals)
 * @example formatPositionSize(44.00, 1) => "44" (uses szDecimals, trailing zeros removed)
 * @example formatPositionSize(0.0024) => "0.0024" (no szDecimals, uses magnitude logic)
 * @example formatPositionSize(44.00) => "44" (no szDecimals, uses magnitude logic)
 */
export const formatPositionSize = (
  size: string | number,
  szDecimals?: number,
): string => {
  const num = typeof size === 'string' ? parseFloat(size) : size;

  if (isNaN(num) || num === 0) {
    return '0';
  }

  // Use asset-specific decimals if provided (Hyperliquid metadata)
  if (szDecimals !== undefined) {
    return num.toFixed(szDecimals).replace(/\.?0+$/, '');
  }

  // Fallback: magnitude-based decimal logic for backwards compatibility
  const abs = Math.abs(num);
  let formatted: string;

  if (abs < 0.01) {
    // For very small numbers, use more decimal places
    formatted = num.toFixed(6);
  } else if (abs < 1) {
    // For small numbers, use 4 decimal places
    formatted = num.toFixed(4);
  } else {
    // For normal numbers, use 2 decimal places
    formatted = num.toFixed(2);
  }

  // Remove trailing zeros and unnecessary decimal point
  return formatted.replace(/\.?0+$/, '');
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

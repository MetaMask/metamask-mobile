/**
 * Portable perps decimal formatters.
 *
 * These are the canonical implementations, exported from the controller so
 * extension and any future consumer can import them directly.
 * No mobile-specific imports — safe to sync to Core.
 *
 * Intl.NumberFormat instances are cached via createFormatters (assets-controllers),
 * which uses getCachedNumberFormat internally.
 */
import { createFormatters } from '@metamask/assets-controllers';

import {
  DECIMAL_PRECISION_CONFIG,
  FUNDING_RATE_CONFIG,
  PERPS_CONSTANTS,
} from '../constants/perpsConfig';

// Module-level cached formatters (en-US). createFormatters caches internally.
const _fmt = createFormatters({ locale: 'en-US' });

/**
 * Internal equivalent of the mobile formatWithThreshold utility.
 * Formats a currency value, returning "<$X.XX" for values below threshold.
 *
 * @param amount - The numeric amount to format.
 * @param threshold - The threshold below which the "<" prefix is shown.
 * @param options - Intl formatting options.
 * @param options.currency - ISO 4217 currency code.
 * @param options.minimumFractionDigits - Minimum decimal digits.
 * @param options.maximumFractionDigits - Maximum decimal digits.
 * @returns Formatted currency string.
 */
function _formatWithThreshold(
  amount: number,
  threshold: number,
  options: {
    currency: string;
    minimumFractionDigits: number;
    maximumFractionDigits: number;
  },
): string {
  const formatOpts = {
    minimumFractionDigits: options.minimumFractionDigits,
    maximumFractionDigits: options.maximumFractionDigits,
    currencyDisplay: 'narrowSymbol' as const,
  };
  if (amount === 0) {
    return _fmt.formatCurrency(0, options.currency, formatOpts);
  }
  return Math.abs(amount) < threshold
    ? `<${_fmt.formatCurrency(threshold, options.currency, formatOpts)}`
    : _fmt.formatCurrency(amount, options.currency, formatOpts);
}

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
export type FiatRangeConfig = {
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
};

/**
 * Formats a number to a specific number of significant digits
 * Strips trailing zeros unless minDecimals requires them
 *
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
      maxDecimals === undefined
        ? targetDecimals
        : Math.min(targetDecimals, maxDecimals);

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
    condition: (val) => Math.abs(val) > PRICE_THRESHOLD.VERY_HIGH,
    minimumDecimals: 0,
    maximumDecimals: 0,
    significantDigits: 6,
    threshold: PRICE_THRESHOLD.VERY_HIGH,
  },
  {
    // High values ($10,000-$100,000]: No decimals, 5 significant figures
    // Ex: $12,345.67 → $12,346
    condition: (val) => Math.abs(val) > PRICE_THRESHOLD.HIGH,
    minimumDecimals: 0,
    maximumDecimals: 0,
    significantDigits: 5,
    threshold: PRICE_THRESHOLD.HIGH,
  },
  {
    // Large values ($1,000-$10,000]: Max 1 decimal, 5 significant figures
    // Ex: $1,234.56 → $1,234.6
    condition: (val) => Math.abs(val) > PRICE_THRESHOLD.LARGE,
    minimumDecimals: 0,
    maximumDecimals: 1,
    significantDigits: 5,
    threshold: PRICE_THRESHOLD.LARGE,
  },
  {
    // Medium values ($100-$1,000]: Max 2 decimals, 5 significant figures
    // Ex: $123.456 → $123.46
    condition: (val) => Math.abs(val) > PRICE_THRESHOLD.MEDIUM,
    minimumDecimals: 0,
    maximumDecimals: 2,
    significantDigits: 5,
    threshold: PRICE_THRESHOLD.MEDIUM,
  },
  {
    // Medium-low values ($10-$100]: Max 4 decimals, 5 significant figures
    // Ex: $12.34567 → $12.346
    condition: (val) => Math.abs(val) > PRICE_THRESHOLD.MEDIUM_LOW,
    minimumDecimals: 0,
    maximumDecimals: 4,
    significantDigits: 5,
    threshold: PRICE_THRESHOLD.MEDIUM_LOW,
  },
  {
    // Low values ($0.01-$10]: 5 significant figures, min 2 max MAX_PRICE_DECIMALS decimals
    // Ex: $1.3445555 → $1.3446 | $0.333333 → $0.33333
    condition: (val) => Math.abs(val) >= PRICE_THRESHOLD.LOW,
    significantDigits: 5,
    minimumDecimals: 2,
    maximumDecimals: DECIMAL_PRECISION_CONFIG.MaxPriceDecimals,
    threshold: PRICE_THRESHOLD.LOW,
  },
  {
    // Very small values (< $0.01): 4 significant figures, min 2 max MAX_PRICE_DECIMALS decimals
    // Ex: $0.004236 → $0.004236 | $0.0000006 → $0.000001
    condition: () => true,
    significantDigits: 4,
    minimumDecimals: 2,
    maximumDecimals: DECIMAL_PRECISION_CONFIG.MaxPriceDecimals,
    threshold: PRICE_THRESHOLD.VERY_SMALL,
  },
];

/**
 * Formats a balance value as USD currency with appropriate decimal places
 *
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
  const value = typeof balance === 'string' ? parseFloat(balance) : balance;
  const currency = options?.currency ?? 'USD';

  let formatted: string;

  if (isNaN(value)) {
    // Return placeholder for invalid values to avoid confusion with actual $0 values
    return PERPS_CONSTANTS.FallbackPriceDisplay;
  }

  // Use custom ranges or defaults
  const ranges = options?.ranges ?? PRICE_RANGES_MINIMAL_VIEW;

  // Find the first matching range configuration
  const rangeConfig = ranges.find((range) => range.condition(value));

  if (rangeConfig) {
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
        value,
        sigDigits,
        minDecimals,
        maxDecimals,
      );

      // Format with the calculated decimal places
      formatted = _formatWithThreshold(
        formattedValue,
        rangeConfig.threshold ?? 0.01,
        {
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
        formatted = rangeConfig.customFormat(
          value,
          options?.locale ?? 'en-US',
          currency,
        );
      } else {
        // Use standard formatting with threshold
        formatted = _formatWithThreshold(value, rangeConfig.threshold ?? 0.01, {
          currency,
          minimumFractionDigits: minDecimals,
          maximumFractionDigits: maxDecimals,
        });
      }
    }
  } else {
    // Fallback if no range matches (shouldn't happen with proper default config)
    const fallbackMin = options?.minimumDecimals ?? 2;
    const fallbackMax = options?.maximumDecimals ?? 2;
    formatted = _formatWithThreshold(value, 0.01, {
      currency,
      minimumFractionDigits: fallbackMin,
      maximumFractionDigits: fallbackMax,
    });
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
      return formatted.replace(/\.00$/u, '');
    }
    // Standard: Strip all trailing zeros after decimal point
    // Examples: $1,250.00 → $1,250 | $100.0 → $100 | $10.5 → $10.5 | $1.234 → $1.234
    return formatted.replace(/(\.\d*?)0+$/u, '$1').replace(/\.$/u, '');
  }

  return formatted;
};

/**
 * Formats position size with variable decimal precision based on magnitude or asset-specific decimals
 * Removes trailing zeros to match task requirements
 *
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
  const value = typeof size === 'string' ? parseFloat(size) : size;

  if (isNaN(value) || value === 0) {
    return '0';
  }

  // Use asset-specific decimals if provided (Hyperliquid metadata)
  if (szDecimals !== undefined) {
    return value.toFixed(szDecimals).replace(/\.?0+$/u, '');
  }

  // Fallback: magnitude-based decimal logic for backwards compatibility
  const abs = Math.abs(value);
  let formatted: string;

  if (abs < 0.01) {
    // For very small numbers, use more decimal places
    formatted = value.toFixed(6);
  } else if (abs < 1) {
    // For small numbers, use 4 decimal places
    formatted = value.toFixed(4);
  } else {
    // For normal numbers, use 2 decimal places
    formatted = value.toFixed(2);
  }

  // Remove trailing zeros and unnecessary decimal point
  return formatted.replace(/\.?0+$/u, '');
};

/**
 * Formats a PnL (Profit and Loss) value with sign prefix
 *
 * @param pnl - Raw numeric PnL value (positive for profit, negative for loss)
 * @returns Format: "+$X,XXX.XX" or "-$X,XXX.XX" (always shows sign, 2 decimals)
 * @example formatPnl(1234.56) => "+$1,234.56"
 * @example formatPnl(-500) => "-$500.00"
 * @example formatPnl(0) => "+$0.00"
 */
export const formatPnl = (pnl: string | number): string => {
  const value = typeof pnl === 'string' ? parseFloat(pnl) : pnl;

  if (isNaN(value)) {
    return PERPS_CONSTANTS.ZeroAmountDetailedDisplay;
  }

  const formatted = _fmt.formatCurrency(Math.abs(value), 'USD', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return value >= 0 ? `+${formatted}` : `-${formatted}`;
};

/**
 * Formats a percentage value with sign prefix
 *
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
  const parsed = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(parsed)) {
    return '0.00%';
  }

  return `${parsed >= 0 ? '+' : ''}${parsed.toFixed(decimals)}%`;
};

/**
 * Formats funding rate for display
 *
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
    return showZero ? FUNDING_RATE_CONFIG.ZeroDisplay : '';
  }

  const percentage = value * FUNDING_RATE_CONFIG.PercentageMultiplier;
  const formatted = percentage.toFixed(FUNDING_RATE_CONFIG.Decimals);

  // Check if the result is effectively zero
  if (showZero && parseFloat(formatted) === 0) {
    return FUNDING_RATE_CONFIG.ZeroDisplay;
  }

  return `${formatted}%`;
};

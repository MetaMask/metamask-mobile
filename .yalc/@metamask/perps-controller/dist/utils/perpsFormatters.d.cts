/**
 * Price threshold constants for PRICE_RANGES_UNIVERSAL
 * These define the boundaries between different formatting ranges
 */
export declare const PRICE_THRESHOLD: {
    /** Very high values boundary (> $100k) */
    readonly VERY_HIGH: 100000;
    /** High values boundary (> $10k) */
    readonly HIGH: 10000;
    /** Large values boundary (> $1k) */
    readonly LARGE: 1000;
    /** Medium values boundary (> $100) */
    readonly MEDIUM: 100;
    /** Medium-low values boundary (> $10) */
    readonly MEDIUM_LOW: 10;
    /** Low values boundary (>= $0.01) */
    readonly LOW: 0.01;
    /**
     * Very small values threshold (< $0.01)
     * This is the minimum value for formatWithThreshold and should align with
     * the 6 decimal maximum (0.000001 is the smallest representable value)
     */
    readonly VERY_SMALL: 0.000001;
};
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
export declare function formatWithSignificantDigits(value: number, significantDigits: number, minDecimals?: number, maxDecimals?: number): {
    value: number;
    decimals: number;
};
/**
 * Minimal view fiat range configuration
 * Uses fiat-style stripping for clean currency display
 * Strips only .00 to avoid partial decimals like $1,250.1
 */
export declare const PRICE_RANGES_MINIMAL_VIEW: FiatRangeConfig[];
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
export declare const PRICE_RANGES_UNIVERSAL: FiatRangeConfig[];
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
export declare const formatPerpsFiat: (balance: string | number, options?: {
    minimumDecimals?: number;
    maximumDecimals?: number;
    significantDigits?: number;
    ranges?: FiatRangeConfig[];
    currency?: string;
    locale?: string;
    stripTrailingZeros?: boolean;
}) => string;
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
export declare const formatPositionSize: (size: string | number, szDecimals?: number) => string;
/**
 * Formats a PnL (Profit and Loss) value with sign prefix
 *
 * @param pnl - Raw numeric PnL value (positive for profit, negative for loss)
 * @returns Format: "+$X,XXX.XX" or "-$X,XXX.XX" (always shows sign, 2 decimals)
 * @example formatPnl(1234.56) => "+$1,234.56"
 * @example formatPnl(-500) => "-$500.00"
 * @example formatPnl(0) => "+$0.00"
 */
export declare const formatPnl: (pnl: string | number) => string;
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
export declare const formatPercentage: (value: string | number, decimals?: number) => string;
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
export declare const formatFundingRate: (value?: number | null, options?: {
    showZero?: boolean;
}) => string;
//# sourceMappingURL=perpsFormatters.d.cts.map
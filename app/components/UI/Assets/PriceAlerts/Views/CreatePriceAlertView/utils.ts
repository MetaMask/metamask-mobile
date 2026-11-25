import { trimTrailingZeros } from '../../../../Bridge/utils/trimTrailingZeros';

export const KEYPAD_EMPTY = '0';
export const MIN_KEYPAD_DECIMALS = 2;
export const MAX_KEYPAD_DECIMALS = 15;
export const SIG_FIGS_FRACTIONAL_OFFSET = 5;
export const PERCENT_KEYPAD_DECIMALS = 2;
/**
 * Maximum percent-change threshold allowed when direction is `down`.
 * A spot price cannot fall by more than 100%.
 */
export const MAX_DOWN_PERCENT_THRESHOLD = 100;

/**
 * Max fractional digits the keypad should allow for a given USD price.
 * Mirrors the precision used by {@link toKeypadString} so manual entry and
 * quick-percentage pills stay consistent (e.g. sub-cent SHIB prices).
 * Capped at {@link MAX_KEYPAD_DECIMALS} to prevent excessively long inputs.
 */
export const getKeypadDecimalPlaces = (price: number): number => {
  if (!Number.isFinite(price) || price <= 0) {
    return MIN_KEYPAD_DECIMALS;
  }
  const exponent = Math.floor(Math.log10(price));
  const places =
    exponent >= 0
      ? Math.max(MIN_KEYPAD_DECIMALS, SIG_FIGS_FRACTIONAL_OFFSET - exponent)
      : Math.abs(exponent) + SIG_FIGS_FRACTIONAL_OFFSET;
  return Math.min(places, MAX_KEYPAD_DECIMALS);
};

/**
 * Converts a computed price into a plain decimal string suitable for the keypad.
 * Always preserves 6 significant figures and never produces scientific notation.
 * e.g. 0.3224 * 1.10 → "0.35464", 1.05e-14 → "0.000000000000011".
 * When `decimals` is provided, uses that exact fraction-digit count — perps
 * callers pass the price-display sig-dig count (TAT-4186) so entry and
 * display agree.
 */
export const toKeypadString = (price: number, decimals?: number): string => {
  if (!Number.isFinite(price) || price <= 0) return KEYPAD_EMPTY;

  const decimalPlaces = decimals ?? getKeypadDecimalPlaces(price);
  const str = trimTrailingZeros(price.toFixed(decimalPlaces));

  return str || KEYPAD_EMPTY;
};

/**
 * Groups the integer part of a raw keypad string with thousand separators
 * while leaving the fraction exactly as typed, so an in-progress entry such as
 * "84244." or "84244.50" survives round-tripping through the display.
 */
export const formatKeypadDisplay = (value: string): string => {
  const [integerPart, decimalPart] = value.replace(/,/g, '').split('.');
  const groupedInteger = (integerPart || '0').replace(
    /\B(?=(\d{3})+(?!\d))/g,
    ',',
  );

  return decimalPart === undefined
    ? groupedInteger
    : `${groupedInteger}.${decimalPart}`;
};

/**
 * Converts a percent threshold into a plain decimal string suitable for the
 * keypad. Percent thresholds are always positive with at most 2dp, so this is
 * a straight fixed-precision format (no significant-figure scaling needed).
 */
export const toPercentKeypadString = (value: number): string => {
  if (!Number.isFinite(value) || value <= 0) return KEYPAD_EMPTY;
  const str = trimTrailingZeros(value.toFixed(PERCENT_KEYPAD_DECIMALS));
  return str || KEYPAD_EMPTY;
};

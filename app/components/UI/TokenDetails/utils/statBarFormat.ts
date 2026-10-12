import { getCurrencySymbol } from '../../../../util/number/bigint';
import { getIntlNumberFormatter } from '../../../../util/intl';

/**
 * Formatters for the Token Details V1 stat bar.
 *
 * Every one returns `null` rather than a placeholder string when its input is
 * missing, so the bar renders `STAT_EMPTY_VALUE` for that cell alone. A stat
 * that cannot be computed must never read as a real value — `0%` for an
 * unknown tax would claim the token is fee-free.
 *
 * Compact magnitudes are computed by hand rather than with
 * `Intl.NumberFormat`'s `notation: 'compact'`, which Hermes does not support.
 */

/** Below this, a price needs more than two decimals to say anything. */
const SUB_UNIT_PRICE_THRESHOLD = 1;
const SUB_UNIT_PRICE_DECIMALS = 6;
const STANDARD_PRICE_DECIMALS = 2;

const isUsableNumber = (value: number | null | undefined): value is number =>
  value != null && Number.isFinite(value);

/**
 * Currency symbol for a code, falling back to the uppercased code when no
 * symbol is known so an unmapped currency still reads sensibly.
 */
const resolveCurrencySymbol = (currencyCode: string): string => {
  const lowercased = currencyCode.toLowerCase();
  const symbol = getCurrencySymbol(
    lowercased as Parameters<typeof getCurrencySymbol>[0],
  );
  return symbol === lowercased ? currencyCode.toUpperCase() : symbol;
};

/**
 * Compact magnitude without a currency symbol.
 *
 * @example formatCompactNumber(12_400_000) // '12.4M'
 * @example formatCompactNumber(560_000) // '560.0K'
 */
export const formatCompactNumber = (
  value: number | null | undefined,
): string | null => {
  if (!isUsableNumber(value)) {
    return null;
  }

  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  if (abs >= 1e12) {
    return `${sign}${(abs / 1e12).toFixed(1)}T`;
  }
  if (abs >= 1e9) {
    return `${sign}${(abs / 1e9).toFixed(1)}B`;
  }
  if (abs >= 1e6) {
    return `${sign}${(abs / 1e6).toFixed(1)}M`;
  }
  if (abs >= 1e3) {
    return `${sign}${(abs / 1e3).toFixed(1)}K`;
  }
  return `${sign}${abs.toFixed(0)}`;
};

/**
 * Compact currency amount in the user's selected currency.
 *
 * @example formatCompactFiat(12_400_000, 'USD') // '$12.4M'
 * @example formatCompactFiat(532.5, 'USD') // '$532.50'
 */
export const formatCompactFiat = (
  value: number | null | undefined,
  currencyCode: string,
): string | null => {
  if (!isUsableNumber(value)) {
    return null;
  }

  const symbol = resolveCurrencySymbol(currencyCode);
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  if (abs < 1e3) {
    return `${sign}${symbol}${abs.toFixed(2)}`;
  }

  return `${sign}${symbol}${formatCompactNumber(abs)}`;
};

/**
 * A single price, with enough decimals to stay meaningful for sub-unit tokens.
 *
 * @example formatPrice(0.04312, 'USD', 'en-US') // '$0.043120'
 */
export const formatPrice = (
  value: number | null | undefined,
  currencyCode: string,
  locale: string,
): string | null => {
  if (!isUsableNumber(value)) {
    return null;
  }

  const decimals =
    Math.abs(value) < SUB_UNIT_PRICE_THRESHOLD && value !== 0
      ? SUB_UNIT_PRICE_DECIMALS
      : STANDARD_PRICE_DECIMALS;

  return getIntlNumberFormatter(locale, {
    style: 'currency',
    currency: currencyCode,
    currencyDisplay: 'narrowSymbol',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
};

/**
 * 24h high and low as one cell. Needs both: a range missing an end is not a
 * range, and padding the gap with a dash inside the value would read as data.
 */
export const formatPriceRange = (
  high: number | null | undefined,
  low: number | null | undefined,
  currencyCode: string,
  locale: string,
): string | null => {
  const formattedHigh = formatPrice(high, currencyCode, locale);
  const formattedLow = formatPrice(low, currencyCode, locale);

  if (formattedHigh == null || formattedLow == null) {
    return null;
  }

  return `${formattedHigh} / ${formattedLow}`;
};

/**
 * Percentage with a fixed number of decimals.
 *
 * @example formatPercent(18.42, 1) // '18.4%'
 */
export const formatPercent = (
  value: number | null | undefined,
  decimals: number,
): string | null => {
  if (!isUsableNumber(value)) {
    return null;
  }
  return `${value.toFixed(decimals)}%`;
};

/**
 * Trims a fee to the shortest honest form: whole percentages lose the decimal
 * so a fee-free token reads `0%` rather than `0.0%`.
 */
const formatFee = (value: number): string =>
  Number.isInteger(value) ? `${value}%` : `${value.toFixed(1)}%`;

/**
 * Buy and sell tax as one cell.
 *
 * A null `sell` means the API could not determine it, which is not the same as
 * zero, so the whole cell falls back rather than implying a one-sided fee.
 */
export const formatTaxPair = (
  buy: number | null | undefined,
  sell: number | null | undefined,
): string | null => {
  if (!isUsableNumber(buy) || !isUsableNumber(sell)) {
    return null;
  }
  return `${formatFee(buy)} / ${formatFee(sell)}`;
};

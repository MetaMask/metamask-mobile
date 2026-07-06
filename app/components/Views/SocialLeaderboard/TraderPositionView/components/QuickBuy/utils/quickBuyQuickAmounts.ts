import {
  formatCurrency,
  getCurrencySymbol,
} from '../../../../../../UI/Bridge/utils/currencyUtils';

/** USD anchor set for buy quick-amount pills (Swap Next Figma). */
export const USD_QUICK_BUY_BASE = [500, 1500, 2500, 3500] as const;

/** Sell quick-amount pills as balance percentages; 100 maps to the "Max" label. */
export const SELL_QUICK_PERCENTAGES = [25, 50, 75, 100] as const;

/**
 * Currencies whose pill amounts use larger magnitudes and need compact K/M
 * labels so four pills fit in a single row without truncation.
 */
const COMPACT_PILL_LABEL_CURRENCIES = new Set([
  'BRL',
  'CNY',
  'JPY',
  'INR',
  'KRW',
]);

/** Minimum magnitude before a compact-pill currency switches from full to K/M. */
const COMPACT_PILL_LABEL_THRESHOLD = 1_000;

/**
 * Hand-tuned buy pill amounts per currency. Values are already in that
 * currency's units — no conversion on tap. Currencies not listed here fall
 * back to USD-labeled pills with live USD→user-currency conversion.
 */
const CURRENCIES_WITH_USD_MAGNITUDE = [
  'EUR',
  'GBP',
  'CHF',
  'CAD',
  'AUD',
] as const;
export const CURATED_QUICK_BUY_AMOUNTS: Record<string, readonly number[]> = {
  USD: USD_QUICK_BUY_BASE,
  ...Object.fromEntries(
    CURRENCIES_WITH_USD_MAGNITUDE.map((code) => [code, USD_QUICK_BUY_BASE]),
  ),
  BRL: [2500, 7500, 12500, 17500],
  CNY: [3500, 10000, 17500, 25000],
  JPY: [75000, 200000, 350000, 500000],
  INR: [40000, 125000, 200000, 300000],
  KRW: [700000, 2000000, 3500000, 5000000],
};

/** Intl options for pill labels — no grouping separators so "$3500" fits in-row. */
const PILL_LABEL_CURRENCY_OPTIONS: Intl.NumberFormatOptions = {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
  useGrouping: false,
};

function formatPillCurrency(value: number, currency: string): string {
  return formatCurrency(value, currency, PILL_LABEL_CURRENCY_OPTIONS);
}

function formatCompactMagnitude(value: number): string {
  const abs = Math.abs(value);

  if (abs >= 1_000_000) {
    const compact = abs / 1_000_000;
    const formatted =
      compact % 1 === 0 ? String(compact) : String(Number(compact.toFixed(1)));
    return `${formatted}M`;
  }

  if (abs >= 1_000) {
    const compact = abs / 1_000;
    const formatted =
      compact % 1 === 0 ? String(compact) : String(Number(compact.toFixed(1)));
    return `${formatted}K`;
  }

  return String(abs);
}

/**
 * Pill label for a buy quick-amount. Uses compact K/M notation for
 * high-magnitude currencies (BRL, CNY, JPY, INR, KRW) so labels fit in the
 * pill row. The committed `value` is always the full amount — only display
 * is abbreviated. Hermes does not support `Intl` `notation: 'compact'`.
 */
export function formatQuickBuyPillLabel(
  value: number,
  currency: string,
): string {
  const normalizedCurrency = currency.toUpperCase();
  const shouldUseCompact =
    COMPACT_PILL_LABEL_CURRENCIES.has(normalizedCurrency) &&
    Math.abs(value) >= COMPACT_PILL_LABEL_THRESHOLD;

  if (!shouldUseCompact) {
    return formatPillCurrency(value, normalizedCurrency);
  }

  return `${getCurrencySymbol(normalizedCurrency)}${formatCompactMagnitude(value)}`;
}

export interface BuyQuickAmountOption {
  /** Amount in the user's display currency (committed to `fiatAmount`). */
  value: number;
  /** Pill label — curated currencies use `currentCurrency`; fallback uses USD. */
  label: string;
  /** True when the pill is USD-labeled but the value is converted locally. */
  isUsdFallback: boolean;
}

/**
 * Builds buy-side quick-amount pill options for the user's display currency.
 *
 * @param currentCurrency - User's selected fiat currency code (e.g. `EUR`).
 * @param usdToCurrentRate - Multiplier to convert USD → `currentCurrency`
 * (`conversionRate / usdConversionRate`). When undefined, fallback pills
 * use a 1:1 multiplier so taps still set a numeric amount.
 */
export function getBuyQuickAmounts(
  currentCurrency: string,
  usdToCurrentRate: number | undefined,
): BuyQuickAmountOption[] {
  const normalizedCurrency = currentCurrency.toUpperCase();
  const curated = CURATED_QUICK_BUY_AMOUNTS[normalizedCurrency];

  if (curated) {
    return curated.map((value) => ({
      value,
      label: formatQuickBuyPillLabel(value, normalizedCurrency),
      isUsdFallback: false,
    }));
  }

  const rate =
    usdToCurrentRate !== undefined &&
    Number.isFinite(usdToCurrentRate) &&
    usdToCurrentRate > 0
      ? usdToCurrentRate
      : 1;

  return USD_QUICK_BUY_BASE.map((usdValue) => {
    const value = usdValue * rate;
    return {
      value,
      label: formatPillCurrency(usdValue, 'USD'),
      isUsdFallback: true,
    };
  });
}

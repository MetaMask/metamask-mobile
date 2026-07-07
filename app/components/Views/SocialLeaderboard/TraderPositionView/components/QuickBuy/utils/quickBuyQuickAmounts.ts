import {
  formatCurrency,
  getCurrencySymbol,
} from '../../../../../../UI/Bridge/utils/currencyUtils';

/** USD anchor set for buy quick-amount pills (Swap Next Figma). */
export const USD_QUICK_BUY_BASE = [10, 50, 100, 250] as const;

/** Sell quick-amount pills as balance percentages; 100 maps to the "Max" label. */
export const SELL_QUICK_PERCENTAGES = [25, 50, 75, 100] as const;

const NICE_AMOUNT_MULTIPLIERS = [1, 1.5, 2, 2.5, 5, 10] as const;

/** Fiat codes that display without fractional units (ISO 4217 minor units = 0). */
const ZERO_DECIMAL_CURRENCIES = new Set([
  'BIF',
  'CLP',
  'DJF',
  'GNF',
  'IDR',
  'JPY',
  'KMF',
  'KRW',
  'PYG',
  'RWF',
  'UGX',
  'VND',
  'VUV',
  'XAF',
  'XOF',
  'XPF',
]);

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
  'IDR',
]);

/** Minimum magnitude before a compact-pill currency switches from full to K/M. */
const COMPACT_PILL_LABEL_THRESHOLD = 1_000;

/** Intl options for pill labels — no grouping separators so "$250" fits in-row. */
const PILL_LABEL_CURRENCY_OPTIONS: Intl.NumberFormatOptions = {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
  useGrouping: false,
};

function getCurrencyFractionDigits(currency: string): number {
  return ZERO_DECIMAL_CURRENCIES.has(currency.toUpperCase()) ? 0 : 2;
}

/**
 * Snaps a converted fiat amount to the nearest "nice" value (1/2/5/10 × 10^n)
 * so pill labels stay round across currencies. Label and committed value both
 * use this result.
 */
export function snapToNiceFiatAmount(value: number, currency: string): number {
  if (!Number.isFinite(value) || value <= 0) {
    return value;
  }

  const fractionDigits = getCurrencyFractionDigits(currency);

  if (value < 1) {
    const factor = 10 ** fractionDigits;
    return Math.round(value * factor) / factor;
  }

  const magnitude = 10 ** Math.floor(Math.log10(value));

  let bestDiff = Infinity;
  let bestCandidate = NICE_AMOUNT_MULTIPLIERS[0] * magnitude;

  for (const multiplier of NICE_AMOUNT_MULTIPLIERS) {
    const candidate = multiplier * magnitude;
    const diff = Math.abs(candidate - value);
    if (diff < bestDiff || (diff === bestDiff && candidate > bestCandidate)) {
      bestDiff = diff;
      bestCandidate = candidate;
    }
  }

  let result = bestCandidate;
  if (fractionDigits === 0) {
    result = Math.round(result);
  } else {
    result = Math.round(result * 100) / 100;
  }

  return result;
}

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
 * high-magnitude currencies so labels fit in the pill row. The committed
 * `value` is always the full amount — only display is abbreviated.
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
  /** Pill label in the user's display currency. */
  label: string;
  /** USD anchor tier for analytics (`preset_value`). */
  presetTierUsd: number;
}

/**
 * Builds buy-side quick-amount pill options for the user's display currency.
 *
 * @param currentCurrency - User's selected fiat currency code (e.g. `EUR`).
 * @param usdToCurrentRate - Multiplier to convert USD → `currentCurrency`
 * (`conversionRate / usdConversionRate`). When undefined, uses a 1:1 multiplier.
 */
export function getBuyQuickAmounts(
  currentCurrency: string,
  usdToCurrentRate: number | undefined,
): BuyQuickAmountOption[] {
  const normalizedCurrency = currentCurrency.toUpperCase();
  const rate =
    usdToCurrentRate !== undefined &&
    Number.isFinite(usdToCurrentRate) &&
    usdToCurrentRate > 0
      ? usdToCurrentRate
      : 1;

  return USD_QUICK_BUY_BASE.map((presetTierUsd) => {
    const raw = presetTierUsd * rate;
    const value =
      normalizedCurrency === 'USD'
        ? presetTierUsd
        : snapToNiceFiatAmount(raw, normalizedCurrency);
    return {
      value,
      label: formatQuickBuyPillLabel(value, normalizedCurrency),
      presetTierUsd,
    };
  });
}

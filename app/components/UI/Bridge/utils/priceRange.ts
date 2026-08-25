import I18n, { strings } from '../../../../../locales/i18n';
import { getIntlNumberFormatter } from '../../../../util/intl';
import { formatCurrency } from './currencyUtils';
import { FIAT_INPUT_DECIMALS } from './sourceAmountInputMode';

export const PRICE_RANGE_TOKEN_SIDES = ['source', 'dest'] as const;

export type PriceRangeTokenSide = (typeof PRICE_RANGE_TOKEN_SIDES)[number];

export interface RecurringPriceRange {
  tokenSide: PriceRangeTokenSide;
  currency: string;
  min: string;
  max: string;
}

export const DEFAULT_PRICE_RANGE_TOKEN_SIDE: PriceRangeTokenSide = 'dest';

export const PRICE_RANGE_MIN_PERCENTS = [-1, -5, -10, -25, -50] as const;

export const PRICE_RANGE_MAX_PERCENTS = [1, 5, 10, 25, 50] as const;

export const PRICE_RANGE_MISSING_VALUE = '--';

export function applyPercentToPrice(price: number, percent: number): string {
  const next = price * (1 + percent / 100);

  if (!Number.isFinite(next) || next <= 0) {
    return '';
  }

  return next.toFixed(FIAT_INPUT_DECIMALS);
}

export function parsePriceInput(value: string): number | undefined {
  if (!/^(?:\d+\.?\d*|\.\d+)$/u.test(value)) {
    return undefined;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return undefined;
  }

  return parsed;
}

export function sanitizePriceInput(value: string): string {
  const digitsAndDots = value.replace(/[^\d.]/gu, '');
  const firstDot = digitsAndDots.indexOf('.');

  if (firstDot === -1) {
    return digitsAndDots;
  }

  const fraction = digitsAndDots
    .slice(firstDot + 1)
    .replace(/\./gu, '')
    .slice(0, FIAT_INPUT_DECIMALS);

  return digitsAndDots.slice(0, firstDot + 1) + fraction;
}

export function isValidPriceRange(min: string, max: string): boolean {
  const parsedMin = parsePriceInput(min);
  const parsedMax = parsePriceInput(max);

  return (
    parsedMin !== undefined && parsedMax !== undefined && parsedMin < parsedMax
  );
}

export function isPriceRangeInCurrentCurrency(
  range: RecurringPriceRange | undefined,
  currentCurrency: string,
): range is RecurringPriceRange {
  if (!range?.currency || !currentCurrency) {
    return false;
  }

  return range.currency.toLowerCase() === currentCurrency.toLowerCase();
}

export function matchingPricePercent(
  value: string,
  currentPrice: number | undefined,
  percents: readonly number[],
): number | undefined {
  if (currentPrice === undefined || !Number.isFinite(currentPrice)) {
    return undefined;
  }

  return percents.find(
    (percent) => applyPercentToPrice(currentPrice, percent) === value,
  );
}

export function formatPriceRangeLabel(
  min: string,
  max: string,
  currency: string,
): string {
  return `${formatCurrency(min, currency)} - ${formatCurrency(max, currency)}`;
}

export function formatTokenPrice(
  symbol: string | undefined,
  price: number | undefined,
  currency: string,
): string {
  if (!symbol || price === undefined || !Number.isFinite(price)) {
    return PRICE_RANGE_MISSING_VALUE;
  }

  return strings('bridge.recurring.price_range.token_price', {
    symbol,
    price: formatCurrency(price, currency),
  });
}

function formatExchangeRateAmount(rate: number): string {
  const formatter = getIntlNumberFormatter(I18n.locale, {
    ...(rate > 1
      ? { minimumFractionDigits: 1, maximumFractionDigits: 2 }
      : { minimumSignificantDigits: 2, maximumSignificantDigits: 3 }),
  });

  return formatter.format(rate);
}

export function formatExchangeRate({
  selected,
  sourceSymbol,
  destSymbol,
  quoteRate,
}: {
  selected: PriceRangeTokenSide;
  sourceSymbol?: string;
  destSymbol?: string;
  quoteRate?: number;
}): string {
  if (
    quoteRate === undefined ||
    !Number.isFinite(quoteRate) ||
    quoteRate <= 0 ||
    !sourceSymbol ||
    !destSymbol
  ) {
    return PRICE_RANGE_MISSING_VALUE;
  }

  const rate = selected === 'source' ? quoteRate : 1 / quoteRate;
  const fromSymbol = selected === 'source' ? sourceSymbol : destSymbol;
  const toSymbol = selected === 'source' ? destSymbol : sourceSymbol;

  return strings('bridge.recurring.price_range.exchange_rate_value', {
    from: fromSymbol,
    rate: formatExchangeRateAmount(rate),
    to: toSymbol,
  });
}

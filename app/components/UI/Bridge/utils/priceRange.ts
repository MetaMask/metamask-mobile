import I18n, { strings } from '../../../../../locales/i18n';
import { getIntlNumberFormatter } from '../../../../util/intl';
import { formatCurrency } from './currencyUtils';

export const PRICE_RANGE_TOKEN_SIDES = ['source', 'dest'] as const;

export type PriceRangeTokenSide = (typeof PRICE_RANGE_TOKEN_SIDES)[number];

export interface RecurringPriceRange {
  tokenSide: PriceRangeTokenSide;
  minFiat: string;
  maxFiat: string;
}

export const DEFAULT_PRICE_RANGE_TOKEN_SIDE: PriceRangeTokenSide = 'dest';

export const PRICE_RANGE_MIN_PERCENTS = [-1, -5, -10, -25, -50] as const;

export const PRICE_RANGE_MAX_PERCENTS = [1, 5, 10, 25, 50] as const;

export const PRICE_RANGE_MISSING_VALUE = '--';

export const PRICE_RANGE_MAX_DECIMALS = 2;

export function applyPercentToPrice(price: number, percent: number): string {
  const next = price * (1 + percent / 100);

  if (!Number.isFinite(next) || next <= 0) {
    return '';
  }

  return next.toFixed(PRICE_RANGE_MAX_DECIMALS);
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
    .slice(0, PRICE_RANGE_MAX_DECIMALS);

  return digitsAndDots.slice(0, firstDot + 1) + fraction;
}

export function isValidPriceRange(minFiat: string, maxFiat: string): boolean {
  const min = parsePriceInput(minFiat);
  const max = parsePriceInput(maxFiat);

  return min !== undefined && max !== undefined && min < max;
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
  minFiat: string,
  maxFiat: string,
  currency: string,
): string {
  return `${formatCurrency(minFiat, currency)} - ${formatCurrency(
    maxFiat,
    currency,
  )}`;
}

export function formatTokenFiatPrice(
  symbol: string | undefined,
  fiat: number | undefined,
  currency: string,
): string {
  if (!symbol || fiat === undefined || !Number.isFinite(fiat)) {
    return PRICE_RANGE_MISSING_VALUE;
  }

  return strings('bridge.recurring.price_range.token_fiat', {
    symbol,
    fiat: formatCurrency(fiat, currency),
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

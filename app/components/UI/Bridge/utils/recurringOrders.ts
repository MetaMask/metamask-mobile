import I18n, { strings } from '../../../../../locales/i18n';
import { getIntlDateTimeFormatter } from '../../../../util/intl';
import { fromTokenMinimalUnitString } from '../../../../util/number/bigint';
import type {
  RecurringOrder,
  RecurringPriceRange,
  RecurringSchedule,
} from '../api/recurringOrders.types';
import type { BridgeToken } from '../types';
import { formatTokenBalance } from '.';
import { formatCurrency } from './currencyUtils';
import { formatPriceRangeLabel, PRICE_RANGE_MISSING_VALUE } from './priceRange';
import { convertApiTokenToBridgeToken } from './tokenUtils';

export function getRecurringOrderTokens(order: RecurringOrder): {
  sourceToken: BridgeToken;
  destinationToken: BridgeToken;
} {
  return {
    sourceToken: convertApiTokenToBridgeToken({
      ...order.src.asset,
      iconUrl: order.src.asset.iconUrl ?? undefined,
    }),
    destinationToken: convertApiTokenToBridgeToken({
      ...order.dest.asset,
      iconUrl: order.dest.asset.iconUrl ?? undefined,
    }),
  };
}

export function formatRecurringTokenAmount(
  amount: string,
  decimals: number,
): string {
  return formatTokenBalance(fromTokenMinimalUnitString(amount, decimals));
}

export function getRecurringOrderFilledPercent(order: RecurringOrder): number {
  if (order.schedule.repeatCount <= 0) {
    return 0;
  }

  return Math.round(
    (order.filledSwapsCount / order.schedule.repeatCount) * 100,
  );
}

export function formatRecurringInterval(schedule: RecurringSchedule): string {
  const unitKey =
    schedule.every === 1
      ? `bridge.recurring.unit.${schedule.unit}`
      : `bridge.recurring.unit_plural.${schedule.unit}`;

  return `${schedule.every} ${strings(unitKey)}`;
}

export function formatRecurringOrderDate(timestamp: string): string {
  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return PRICE_RANGE_MISSING_VALUE;
  }

  return getIntlDateTimeFormatter(I18n.locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

export function getUsdToCurrentCurrencyRate({
  currentCurrency,
  conversionRate,
  usdConversionRate,
}: {
  currentCurrency: string;
  conversionRate?: number | null;
  usdConversionRate?: number | null;
}): number | undefined {
  if (currentCurrency.toUpperCase() === 'USD') {
    return 1;
  }

  if (
    !conversionRate ||
    !usdConversionRate ||
    !Number.isFinite(conversionRate) ||
    !Number.isFinite(usdConversionRate)
  ) {
    return undefined;
  }

  return conversionRate / usdConversionRate;
}

function convertUsdBound(
  value: string | undefined,
  usdToCurrentCurrencyRate: number | undefined,
): string {
  if (!value || usdToCurrentCurrencyRate === undefined) {
    return '';
  }

  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return '';
  }

  return String(numericValue * usdToCurrentCurrencyRate);
}

export function formatRecurringPriceRange({
  priceRange,
  currentCurrency,
  usdToCurrentCurrencyRate,
}: {
  priceRange?: RecurringPriceRange;
  currentCurrency: string;
  usdToCurrentCurrencyRate?: number;
}): string {
  if (!priceRange || usdToCurrentCurrencyRate === undefined) {
    return PRICE_RANGE_MISSING_VALUE;
  }

  return formatPriceRangeLabel(
    convertUsdBound(priceRange.min, usdToCurrentCurrencyRate),
    convertUsdBound(priceRange.max, usdToCurrentCurrencyRate),
    currentCurrency,
  );
}

export function formatRecurringExecutionPrice({
  priceUsd,
  currentCurrency,
  usdToCurrentCurrencyRate,
}: {
  priceUsd?: string;
  currentCurrency: string;
  usdToCurrentCurrencyRate?: number;
}): string {
  if (!priceUsd || usdToCurrentCurrencyRate === undefined) {
    return PRICE_RANGE_MISSING_VALUE;
  }

  return formatCurrency(
    Number(priceUsd) * usdToCurrentCurrencyRate,
    currentCurrency,
  );
}

import I18n, { strings } from '../../../../../locales/i18n';
import { getIntlDateTimeFormatter } from '../../../../util/intl';
import { fromTokenMinimalUnitString } from '../../../../util/number/bigint';
import {
  RecurringSwapStatus,
  type RecurringOrder,
  type RecurringPriceRange,
  type RecurringSchedule,
  type RecurringSwap,
} from '../api/recurringOrders.types';
import type { BridgeToken } from '../types';
import { formatTokenBalance } from '.';
import { formatCurrency } from './currencyUtils';
import {
  formatPriceRangeLabel,
  PRICE_RANGE_CURRENCY,
  PRICE_RANGE_MISSING_VALUE,
} from './priceRange';
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

export function isRecurringSwapEligibleForAddFunds(
  swap: RecurringSwap,
  orderedSwaps: readonly RecurringSwap[],
): boolean {
  if (
    swap.status !== RecurringSwapStatus.Skipped ||
    swap.skipReason !== 'insufficient_balance'
  ) {
    return false;
  }

  const swapIndex = orderedSwaps.findIndex(
    ({ swapId }) => swapId === swap.swapId,
  );
  if (swapIndex === -1) {
    return false;
  }

  return !orderedSwaps
    .slice(0, swapIndex)
    .some(({ status }) => status === RecurringSwapStatus.Filled);
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

export function formatRecurringPriceRange({
  priceRange,
}: {
  priceRange?: RecurringPriceRange;
}): string {
  if (!priceRange) {
    return PRICE_RANGE_MISSING_VALUE;
  }

  return formatPriceRangeLabel(
    priceRange.min ?? '',
    priceRange.max ?? '',
    PRICE_RANGE_CURRENCY,
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

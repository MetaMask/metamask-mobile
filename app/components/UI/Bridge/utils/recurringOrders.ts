import { BigNumber } from 'bignumber.js';
import { formatChainIdToCaip } from '@metamask/bridge-controller';
import type { CaipChainId, Hex } from '@metamask/utils';
import I18n, { strings } from '../../../../../locales/i18n';
import { getIntlDateTimeFormatter } from '../../../../util/intl';
import { fromTokenMinimalUnitString } from '../../../../util/number/bigint';
import {
  RecurringSwapState,
  type RecurringOrder,
  type RecurringSchedule,
  type RecurringSwap,
} from '../api/recurringOrders.types';
import type { BridgeToken } from '../types';
import { formatTokenBalance } from '.';
import { formatCurrency } from './currencyUtils';
import {
  formatPriceRangeLabel,
  PRICE_RANGE_MISSING_VALUE,
  type RecurringPriceRange,
} from './priceRange';
import { convertApiTokenToBridgeToken } from './tokenUtils';
import { OrderType } from '../types/advancedOrders';
import { RECURRING_ORDERS_CHAIN_CONFIG } from '../constants/recurringOrders';

/**
 * Resolves the USD value a Recurring Order source amount has to reach on the
 * given chain.
 *
 * @param chainId - Chain the order is placed on, hex or CAIP-2.
 * @returns The chain's own minimum, else the wildcard one, or `undefined` when
 * neither is configured.
 */
export function getRecurringOrderMinAmountUsd(
  chainId: Hex | CaipChainId | undefined,
): number | undefined {
  const chainConfig = chainId
    ? RECURRING_ORDERS_CHAIN_CONFIG[formatChainIdToCaip(chainId)]
    : undefined;

  return (chainConfig ?? RECURRING_ORDERS_CHAIN_CONFIG['*'])?.minAmountUSD;
}

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
    swap.state !== RecurringSwapState.Skipped ||
    swap.skipReason !== 'insufficient_balance'
  ) {
    return false;
  }

  const swapIndex = orderedSwaps.findIndex(({ id }) => id === swap.id);
  if (swapIndex === -1) {
    return false;
  }

  return !orderedSwaps
    .slice(0, swapIndex)
    .some(({ state }) => state === RecurringSwapState.Filled);
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

  return Math.round((order.fillData.count / order.schedule.repeatCount) * 100);
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
  currentCurrency,
  usdToCurrentCurrencyRate,
}: {
  priceRange: RecurringOrder['priceRange'];
  currentCurrency: string;
  usdToCurrentCurrencyRate?: number;
}): string {
  if (
    !priceRange ||
    usdToCurrentCurrencyRate === undefined ||
    !Number.isFinite(usdToCurrentCurrencyRate) ||
    usdToCurrentCurrencyRate <= 0
  ) {
    return PRICE_RANGE_MISSING_VALUE;
  }

  const convertBound = (bound: string | undefined): string => {
    if (!bound) {
      return '';
    }

    const value = new BigNumber(bound);
    if (!value.isFinite() || value.lte(0)) {
      return '';
    }

    return value.multipliedBy(usdToCurrentCurrencyRate).toFixed();
  };

  return formatPriceRangeLabel(
    convertBound(priceRange.min),
    convertBound(priceRange.max),
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

export const getOrderTypeFromDraftPriceRange = (
  priceRange: RecurringPriceRange | undefined,
): OrderType => {
  switch (priceRange?.tokenSide) {
    case 'dest':
      return priceRange.min ? OrderType.BUY_ABOVE : OrderType.BUY_BELOW;
    case 'source':
      return priceRange.max ? OrderType.SELL_BELOW : OrderType.SELL_ABOVE;
    default:
      return OrderType.SELL_ABOVE;
  }
};

import { EthScope } from '@metamask/keyring-api';
import type { CaipChainId } from '@metamask/utils';
import { strings } from '../../../../../locales/i18n';
import AppConstants from '../../../../core/AppConstants';
import { LimitOrderState } from '../api/limitOrders/getLimitOrders/types';

export enum LimitOrderExecutionType {
  BUY = 'buy',
  SELL = 'sell',
}

/**
 * Which way the trigger-price copy reads, e.g. "Buy when 1 LINK is at or
 * below". A buy above market ("buy the pump") and a sell below market (stop
 * loss) read the opposite way from their side's default.
 */
export enum LimitOrderPriceComparisonDirection {
  AT_OR_ABOVE = 'atOrAbove',
  AT_OR_BELOW = 'atOrBelow',
}

/**
 * Everything a comparison direction maps to, so a new reading of it is a new
 * field here rather than another switch. Labels are locale keys, resolved
 * where they render.
 */
export const LIMIT_ORDER_DIRECTION: Record<
  LimitOrderPriceComparisonDirection,
  {
    /**
     * The Bridge API `trigger.threshold` for this direction.
     */
    threshold: 'above' | 'below';
    /**
     * The direction a price reads in once inverted.
     */
    opposite: LimitOrderPriceComparisonDirection;
    /**
     * Sign shown before a trigger price, e.g. "≥ $2,200.00".
     */
    signKey: string;
    /**
     * Comparison in the price input copy, e.g. "is at or above".
     */
    labelKey: string;
  }
> = {
  [LimitOrderPriceComparisonDirection.AT_OR_ABOVE]: {
    threshold: 'above',
    opposite: LimitOrderPriceComparisonDirection.AT_OR_BELOW,
    signKey: 'bridge.limit.trigger_condition_at_or_above',
    labelKey: 'bridge.limit.is_at_or_above',
  },
  [LimitOrderPriceComparisonDirection.AT_OR_BELOW]: {
    threshold: 'below',
    opposite: LimitOrderPriceComparisonDirection.AT_OR_ABOVE,
    signKey: 'bridge.limit.trigger_condition_at_or_below',
    labelKey: 'bridge.limit.is_at_or_below',
  },
};

export const LIMIT_ORDER_BUTTON_PRICE_PRESETS = [5, 10];

/**
 * Maximum number of digits a user can type into the custom percent preset
 * input, which makes 99999 the largest value it can hold.
 */
export const LIMIT_ORDER_CUSTOM_PERCENT_MAX_INPUT_LENGTH = 5;

/**
 * Inclusive percent band around market at which the trigger-price warning is
 * shown. The order may fill immediately when the limit sits this close.
 */
export const LIMIT_ORDER_NEAR_MARKET_PERCENT = 1;

export const LIMIT_ORDER_DEFAULT_SLIPPAGE = String(
  AppConstants.SWAPS.DEFAULT_SLIPPAGE,
);

/**
 * Cost tolerance in % that limit orders start with until the user picks
 * another value, used when the `swapsLimitOrder.defaultPriceTolerance` remote
 * flag is missing or invalid.
 */
export const LIMIT_ORDER_DEFAULT_COST_TOLERANCE = '3';

export const SWAPS_LIMIT_ORDER_EXPIRATION_OPTIONS_MINUTES = [
  10, 60, 1440, 4320, 10080, 43200,
] as const;

/**
 * Delay before the expiration sheet closes after the user picks an option.
 */
export const SWAPS_LIMIT_ORDER_EXPIRATION_CLOSE_DELAY_MS = 250;

export type SwapsLimitOrderExpirationMinutes =
  (typeof SWAPS_LIMIT_ORDER_EXPIRATION_OPTIONS_MINUTES)[number];

export function isSwapsLimitOrderExpirationMinutes(
  value: number,
): value is SwapsLimitOrderExpirationMinutes {
  return SWAPS_LIMIT_ORDER_EXPIRATION_OPTIONS_MINUTES.some(
    (option) => option === value,
  );
}

export const SWAPS_LIMIT_ORDER_DEFAULT_EXPIRATION_MINUTES: SwapsLimitOrderExpirationMinutes = 60;

export const SWAPS_LIMIT_ORDER_EXPIRATION_LABEL: Record<
  SwapsLimitOrderExpirationMinutes,
  { key: string; count: number }
> = {
  10: { key: 'bridge.limit.expiration_option.minutes', count: 10 },
  60: { key: 'bridge.limit.expiration_option.hour', count: 1 },
  1440: { key: 'bridge.limit.expiration_option.day', count: 1 },
  4320: { key: 'bridge.limit.expiration_option.days', count: 3 },
  10080: { key: 'bridge.limit.expiration_option.week', count: 1 },
  43200: { key: 'bridge.limit.expiration_option.month', count: 1 },
};

export const getSwapsLimitOrderExpirationLabel = (
  minutes: SwapsLimitOrderExpirationMinutes,
): string => {
  const { key, count } = SWAPS_LIMIT_ORDER_EXPIRATION_LABEL[minutes];
  return strings(key, { count });
};

export const LIMIT_ORDER_DEFAULT_METAMASK_FEE = 0.875;

export const LIMIT_ORDER_METAMASK_FEE_LEARN_MORE_URL =
  'https://support.metamask.io/trade/metamask-fees/';

export const LIMIT_ORDERS_PAGE_LIMIT = 20;

/**
 * How often the orders list of the selected orders tab is refetched while it
 * is on screen.
 */
export const LIMIT_ORDERS_REFETCH_INTERVAL = 20 * 1000;

/**
 * Refetch interval used instead of `LIMIT_ORDERS_REFETCH_INTERVAL` on low-end
 * hardware over a slow cellular connection.
 */
export const LIMIT_ORDERS_CONSTRAINED_REFETCH_INTERVAL = 60 * 1000;

export const OPEN_LIMIT_ORDER_STATES = [
  LimitOrderState.Open,
  LimitOrderState.Executing,
  LimitOrderState.Submitted,
];
export const HISTORY_LIMIT_ORDER_STATES = [
  LimitOrderState.Filled,
  LimitOrderState.Cancelled,
  LimitOrderState.Expired,
  LimitOrderState.Failed,
];

export const LOAD_MORE_LIMIT_ORDERSSCROLL_THRESHOLD = 200;

/**
 * Per-chain limit order settings, keyed by CAIP-2 chain ID, with
 * '*' as the fallback for chains without an entry of their own.
 */
export const LIMIT_ORDERS_CHAIN_CONFIG: Partial<
  Record<
    CaipChainId | '*',
    {
      minAmountUSD: number;
    }
  >
> = {
  [EthScope.Mainnet]: {
    minAmountUSD: 100,
  },
  '*': {
    minAmountUSD: 10,
  },
};

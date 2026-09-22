import { strings } from '../../../../../locales/i18n';
import AppConstants from '../../../../core/AppConstants';

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

export const LIMIT_ORDER_BUTTON_PRICE_PRESETS = [5, 10];

/**
 * Upper bound for the custom percent offset a user can type into the custom
 * preset input. Values above this are clamped on commit.
 */
export const LIMIT_ORDER_CUSTOM_PERCENT_MAX = 99;

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
 * another value.
 */
export const LIMIT_ORDER_DEFAULT_COST_TOLERANCE = '2';

export const SWAPS_LIMIT_ORDER_EXPIRATION_OPTIONS_MINUTES = [
  10, 60, 1440, 4320, 10080, 43200,
] as const;

export type SwapsLimitOrderExpirationMinutes =
  (typeof SWAPS_LIMIT_ORDER_EXPIRATION_OPTIONS_MINUTES)[number];

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

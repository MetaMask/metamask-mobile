import AppConstants from '../../../../core/AppConstants';
import { strings } from '../../../../../locales/i18n';

export enum LimitOrderExecutionType {
  BUY = 'buy',
  SELL = 'sell',
}

export const LIMIT_ORDER_BUTTON_PRICE_PRESETS = [5, 10];

export const LIMIT_ORDER_DEFAULT_SLIPPAGE = String(
  AppConstants.SWAPS.DEFAULT_SLIPPAGE,
);

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

export enum BridgeOrderType {
  Market = 'market',
  Limit = 'limit',
  Recurring = 'recurring',
}

export enum LimitOrdersTab {
  OpenOrders = 'open-orders',
  History = 'history',
}

export const LIMIT_ORDER_TRIGGER_OFFSETS = [0, -5, -10, -20] as const;

export type LimitOrderTriggerOffset =
  (typeof LIMIT_ORDER_TRIGGER_OFFSETS)[number];

export const LIMIT_ORDER_EXPIRATION_OPTIONS = [
  { value: 'never', labelKey: 'bridge.limit_order.expiration.never' },
  { value: '10m', labelKey: 'bridge.limit_order.expiration.10_minutes' },
  { value: '1h', labelKey: 'bridge.limit_order.expiration.1_hour' },
  { value: '1d', labelKey: 'bridge.limit_order.expiration.1_day' },
  { value: '3d', labelKey: 'bridge.limit_order.expiration.3_days' },
  { value: '1w', labelKey: 'bridge.limit_order.expiration.1_week' },
] as const;

export type LimitOrderExpiration =
  (typeof LIMIT_ORDER_EXPIRATION_OPTIONS)[number]['value'];

export const DEFAULT_LIMIT_ORDER_EXPIRATION: LimitOrderExpiration = '1w';

export type LimitOrderStatus =
  | 'open'
  | 'pending'
  | 'filled'
  | 'cancelled'
  | 'expired';

export interface LimitOrderTokenModel {
  symbol: string;
  iconUrl?: string;
}

export interface LimitOrderRowModel {
  id: string;
  sourceToken: LimitOrderTokenModel;
  destinationToken: LimitOrderTokenModel;
  sourceAmount: string;
  destinationAmount: string;
  triggerPrice: string;
  expiration: string;
  networkName: string;
  status: LimitOrderStatus;
}

export const LimitOrdersSelectorsIDs = {
  CONTAINER: 'limit-orders-view',
  SELECTOR_FORM: 'limit-orders-selector-form',
  TRIGGER_SECTION: 'limit-orders-trigger-section',
  TRIGGER_PRICE: 'limit-orders-trigger-price',
  TRIGGER_PRESET_PREFIX: 'limit-orders-trigger-preset',
  EXPIRATION_ROW: 'limit-orders-expiration-row',
  SLIPPAGE_ROW: 'limit-orders-slippage-row',
  ORDER_TABS: 'limit-orders-tabs',
  OPEN_ORDERS_TAB: 'limit-orders-open-orders-tab',
  HISTORY_TAB: 'limit-orders-history-tab',
  NETWORK_FILTER: 'limit-orders-network-filter',
  OPEN_ORDERS_EMPTY: 'limit-orders-open-orders-empty',
  HISTORY_EMPTY: 'limit-orders-history-empty',
  ORDER_ROW_PREFIX: 'limit-orders-row',
  EXPIRATION_SHEET: 'limit-order-expiration-sheet',
} as const;

export const getTriggerPresetLabel = (offset: LimitOrderTriggerOffset) =>
  offset === 0 ? '0%' : `${offset}%`;

export const calculateLimitTriggerFiat = ({
  quoteRate,
  sourceTokenFiatRate,
  offset,
}: {
  quoteRate: number;
  sourceTokenFiatRate: number;
  offset: LimitOrderTriggerOffset;
}): number => {
  const destinationMarketFiat = sourceTokenFiatRate / quoteRate;
  return destinationMarketFiat * (1 + offset / 100);
};

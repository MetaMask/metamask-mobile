export type OrderDomain = 'swap' | 'perps' | 'predict';

export type OrderStatus =
  | 'open'
  | 'partiallyFilled'
  | 'filled'
  | 'cancelled'
  | 'rejected'
  | 'expired'
  | 'triggered';

export type OrderType =
  | 'limit'
  | 'market'
  | 'stopLoss'
  | 'takeProfit'
  | 'stopLimit'
  | 'recurring'
  | 'prediction';

export type OrderSide = 'buy' | 'sell' | 'long' | 'short' | 'yes' | 'no';

export type CancelType = 'offChain' | 'onChain' | 'none';

export interface OrderInstrument {
  symbol: string;
  name?: string;
  baseAssetSymbol: string;
  quoteAssetSymbol?: string;
  iconUrl?: string;
  baseAssetAddress?: string;
  chainId?: string;
  networkName?: string;
}

export interface OrderItem {
  id: string;
  domain: OrderDomain;
  orderType: OrderType;
  status: OrderStatus;
  side: OrderSide;
  instrument: OrderInstrument;
  size: string;
  formattedSize: string;
  filledSize?: string;
  fillPercentage?: number; // 0 - 100
  price?: string;
  formattedPrice?: string;
  triggerPrice?: string;
  formattedTriggerPrice?: string;
  notionalValueUsd?: string;
  timestamp: number;
  expiresAt?: number;
  canCancel: boolean;
  cancelType: CancelType;
  estimatedCancelFeeUsd?: string;
  canEdit: boolean;
  metadata?: Record<string, unknown>;
}

export interface OrderDetailRow {
  key: string;
  label: string;
  value: string;
  tooltip?: string;
  isSensitive?: boolean;
  isHighlight?: boolean;
  variant?: 'default' | 'error' | 'warning' | 'success';
}

export interface OrderAction {
  id: string;
  label: string;
  isPrimary?: boolean;
  isDestructive?: boolean;
  requiresGas?: boolean;
  onPress: (order: OrderItem) => Promise<void> | void;
}

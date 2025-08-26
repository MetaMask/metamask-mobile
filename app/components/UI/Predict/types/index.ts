/* eslint-disable @typescript-eslint/consistent-type-definitions */
// ESLint override: BaseController requires 'type' for Json compatibility, not 'interface'
import type { TransactionParams } from '@metamask/transaction-controller';

export type ToggleTestnetResult = {
  success: boolean;
  isTestnet: boolean;
  error?: string;
};

export type SwitchProviderResult = {
  success: boolean;
  providerId: string;
  error?: string;
};

export type Side = 'buy' | 'sell';

export type OrderParams = {
  providerId: string;
  marketId: string;
  outcodeId: string;
  side: Side;
  size: number;
};

export type OrderStatus =
  | 'idle'
  | 'approving'
  | 'processing'
  | 'success'
  | 'error';

export type OrderResult = {
  status: OrderStatus;
  message?: string;
};

export type Order = {
  id: string;
  params: OrderParams;
  result: OrderResult;
  transactions: TransactionParams[];
  isOffchainTrade?: boolean;
};

export type MarketOutcome = {
  id: string;
  label: string;
};

export type MarketStatus = 'open' | 'closed' | 'resolved';

export type Market = {
  id: string;
  providerId: string;
  title: string;
  description: string;
  outcomes: MarketOutcome[];
  status: MarketStatus;
};

export type Position = {
  providerId: string;
  marketId: string;
  outcomeId: string;
  size: number;
  price: number;
  conditionId: string;
  icon: string;
  title: string;
  outcome: string;
  cashPnl: number;
  currentValue: number;
  percentPnl: number;
  initialValue: number;
  avgPrice: number;
};

export interface IPredictProvider {
  readonly providerId: string;

  // Connection management
  connect(): Promise<void>;
  disconnect(): Promise<void>;

  // Market data
  getMarkets(): Promise<Market[]>;

  // User positions
  getPositions({
    address,
    limit,
    offset,
  }: {
    address: string;
    limit?: number;
    offset?: number;
  }): Promise<Position[]>;

  // Order management
  prepareOrder(params: OrderParams): Promise<Order>;
  submitOrderTrade?(params: Order): Promise<OrderResult>;

  // ...extend as needed
}

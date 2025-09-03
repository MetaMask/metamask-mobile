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

// note: named to avoid conflict with the DOM `Event` type (could be good to add the prefix to Market type too)
export type PredictEvent = {
  id: string;
  title: string;
  markets: Market[];
};

export type MarketOutcome = {
  id: string;
  label: string;
};

export type MarketStatus = 'open' | 'closed' | 'resolved';

export type MarketCategory =
  | 'trending'
  | 'new'
  | 'sports'
  | 'crypto'
  | 'politics';

export type Market = {
  id: string;
  question: string;
  outcomes: string;
  outcomePrices?: string;
  image: string;
  volume?: string | number;
  providerId?: string;
  title?: string;
  groupItemTitle?: string;
  status?: MarketStatus;
  image_url?: string;
  icon?: string;
};

export type Position = {
  providerId: string;
  conditionId: string;
  icon: string;
  title: string;
  slug: string;
  size: number;
  outcome: string;
  outcomeIndex: number;
  cashPnl: number;
  curPrice: number;
  currentValue: number;
  percentPnl: number;
  initialValue: number;
  avgPrice: number;
  redeemable: boolean;
  negativeRisk: boolean;
  endDate: string;
};

export interface IPredictProvider {
  readonly providerId: string;

  // Connection management
  connect(): Promise<void>;
  disconnect(): Promise<void>;

  // Market data
  getMarkets(params?: { category?: MarketCategory }): Promise<Market[]>;

  // Event data
  getEvents(params?: { category?: MarketCategory }): Promise<PredictEvent[]>;

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

/* eslint-disable @typescript-eslint/consistent-type-definitions */
// ESLint override: BaseController requires 'type' for Json compatibility, not 'interface'
import type {
  TransactionMeta,
  TransactionParams,
} from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import { OrderResponse } from './polymarket';
import { PredictControllerState } from '../controllers/PredictController';

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

export type OrderParams = {
  marketId: string;
  outcomeId: string;
  side: Side;
  amount: number;
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
  series: {
    recurrence: string;
  }[];
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

export enum Side {
  BUY = 'BUY',
  SELL = 'SELL',
}

export interface OrderSummary {
  price: string;
  size: string;
}

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
  neg_risk?: boolean;
  conditionId: string;
  clobTokenIds: string;
  tokenIds: string[];
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

export type PlaceOrderResult = {
  success: boolean;
  error?: string;
  providerId: string;
  txMeta?: TransactionMeta;
};

export type ProcessOrderResult = {
  providerId: string;
  status: OrderStatus;
  response?: OrderResponse;
};

export type BuyOrderParams = {
  marketId: string;
  outcomeId: string;
  amount: number;
};

export type prepareBuyParams = {
  address: string;
  orderParams: BuyOrderParams;
};

export interface IPredictProvider {
  readonly providerId: string;

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

  prepareBuyTransaction({ address, orderParams }: prepareBuyParams): Promise<{
    callData: Hex;
    toAddress: string;
    chainId: number;
  }>;

  processOrder?({
    orderParams,
    address,
    state,
  }: {
    address: string;
    orderParams: OrderParams;
    state: PredictControllerState;
  }): Promise<ProcessOrderResult>;

  // ...extend as needed
}

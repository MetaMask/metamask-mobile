/* eslint-disable @typescript-eslint/consistent-type-definitions */
// ESLint override: BaseController requires 'type' for Json compatibility, not 'interface'
import type { TransactionMeta } from '@metamask/transaction-controller';

export type ToggleTestnetResult = {
  success: boolean;
  isTestnet: boolean;
  error?: string;
};

export enum Side {
  BUY = 'BUY',
  SELL = 'SELL',
}

export interface GetPositionsParams {
  address?: string;
  providerId?: string;
}

export type PredictMarketStatus = 'open' | 'closed' | 'resolved';

export enum Recurrence {
  NONE = 'none',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
  QUARTERLY = 'quarterly',
  ANNUALLY = 'annually',
}

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type OnchainTradeParams = {
  from: string;
  to: string;
  data: string;
  value: string;
  chainId: number;
  txMeta?: TransactionMeta;
};

// This is provider-specific
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type OffchainTradeParams = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
};

export interface OffchainTradeResponse {
  success: boolean;
  response: unknown;
}

export type PredictOrderStatus =
  | 'idle'
  | 'pending'
  | 'filled'
  | 'cancelled'
  | 'error';

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type PredictOrder = {
  id: string;
  providerId: string;
  marketId: string;
  outcomeId: string;
  outcomeTokenId: string;
  isBuy: boolean;
  amount: number;
  price: number;
  status: PredictOrderStatus;
  error?: string;
  timestamp: number;
  lastUpdated: number;
  onchainTradeParams: OnchainTradeParams;
  offchainTradeParams?: OffchainTradeParams;
};

export type PredictMarket = {
  id: string;
  providerId: string;
  slug: string;
  title: string;
  description: string;
  image: string;
  status: 'open' | 'closed' | 'resolved';
  recurrence: Recurrence;
  categories: PredictCategory[];
  outcomes: PredictOutcome[];
};

export type PredictSeries = {
  id: string;
  title: string;
  recurrence: string;
};

export type PredictCategory =
  | 'trending'
  | 'new'
  | 'sports'
  | 'crypto'
  | 'politics';

export type PredictOutcome = {
  id: string;
  marketId: string;
  title: string;
  description: string;
  image: string;
  status: 'open' | 'closed' | 'resolved';
  tokens: PredictOutcomeToken[];
  volume: number;
  groupItemTitle: string;
};

export type PredictOutcomeToken = {
  id: string;
  title: string;
  price: number;
};

export interface PredictActivity {
  id: string;
  providerId: string;
  entry: PredictActivityEntry;
}

export type PredictActivityEntry =
  | PredictActivityBuy
  | PredictActivitySell
  | PredictActivityClaimWinnings;

export interface PredictActivityBuy {
  type: 'buy';
  timestamp: number;
  marketId: string;
  outcomeId: string;
  outcomeTokenId: number;
  amount: number;
  price: number;
}

export interface PredictActivitySell {
  type: 'sell';
  timestamp: number;
  marketId: string;
  outcomeId: string;
  outcomeTokenId: number;
  amount: number;
  price: number;
}

export interface PredictActivityClaimWinnings {
  type: 'claimWinnings';
  timestamp: number;
  // tbd
}

export type PredictPosition = {
  id: string;
  providerId: string;
  marketId: string;
  outcomeId: string;
  outcome: string;
  outcomeTokenId: number;
  title: string;
  icon: string;
  amount: number;
  price: number;
  status: 'open' | 'redeemable' | 'won' | 'lost';
  size: number;
  outcomeIndex: number;
  realizedPnl?: number;
  curPrice: number;
  conditionId: string;
  percentPnl: number;
  cashPnl: number;
  redeemable: boolean;
  initialValue: number;
  avgPrice: number;
  currentValue: number;
  endDate: string;
};

export interface BuyParams {
  providerId: string;
  marketId: string;
  outcomeId: string;
  outcomeTokenId: string;
  amount: number;
}

export type Result<T = void> = {
  success: boolean;
  transactionId?: string;
  error?: string;
  value?: T;
};

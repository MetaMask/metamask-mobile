/* eslint-disable @typescript-eslint/consistent-type-definitions */

import { Hex } from '@metamask/utils';

export enum Side {
  BUY = 'BUY',
  SELL = 'SELL',
}

export enum PredictPriceHistoryInterval {
  ONE_HOUR = '1h',
  SIX_HOUR = '6h',
  ONE_DAY = '1d',
  ONE_WEEK = '1w',
  ONE_MONTH = '1m',
  MAX = 'max',
}

export interface GetPositionsParams {
  address?: string;
  providerId?: string;
}

export enum PredictMarketStatus {
  OPEN = 'open',
  CLOSED = 'closed',
  RESOLVED = 'resolved',
}

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
  transactionId?: string;
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

export enum PredictClaimStatus {
  IDLE = 'idle',
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
  ERROR = 'error',
}

export enum PredictDepositStatus {
  IDLE = 'idle',
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
  ERROR = 'error',
}

export type PredictMarket = {
  id: string;
  providerId: string;
  slug: string;
  title: string;
  description: string;
  endDate?: string;
  image: string;
  status: 'open' | 'closed' | 'resolved';
  recurrence: Recurrence;
  categories: PredictCategory[];
  outcomes: PredictOutcome[];
};

export type PredictSeries = {
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
  providerId: string;
  marketId: string;
  title: string;
  description: string;
  image: string;
  status: 'open' | 'closed' | 'resolved';
  tokens: PredictOutcomeToken[];
  volume: number;
  groupItemTitle: string;
  negRisk?: boolean;
  tickSize?: string;
  resolvedBy?: string;
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
  title?: string;
  outcome?: string;
  icon?: string;
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
  amount: number;
}

export interface PredictPriceHistoryPoint {
  timestamp: number;
  price: number;
}

export interface GetPriceHistoryParams {
  marketId: string;
  providerId?: string;
  fidelity?: number;
  interval?: PredictPriceHistoryInterval;
}

export enum PredictPositionStatus {
  OPEN = 'open',
  REDEEMABLE = 'redeemable',
  WON = 'won',
  LOST = 'lost',
}

export type PredictPosition = {
  id: string;
  providerId: string;
  marketId: string;
  outcomeId: string;
  outcome: string;
  outcomeTokenId: string;
  currentValue: number;
  title: string;
  icon: string;
  amount: number;
  price: number;
  status: PredictPositionStatus;
  size: number;
  outcomeIndex: number;
  realizedPnl?: number;
  percentPnl: number;
  cashPnl: number;
  claimable: boolean;
  initialValue: number;
  avgPrice: number;
  endDate: string;
  negRisk?: boolean;
};

export interface ClaimParams {
  positions: PredictPosition[];
  providerId: string;
}

export interface GetMarketPriceResponse {
  price: number;
}

export type Result<T = void> = {
  success: boolean;
  error?: string;
  response?: T;
};

export interface UnrealizedPnL {
  user: string;
  cashUpnl: number;
  percentUpnl: number;
}

export type PredictClaim = {
  transactionId: string;
  chainId: number;
  status: PredictClaimStatus;
  txParams: {
    to: Hex;
    data: Hex;
    value: Hex;
  };
};

export type PredictDeposit = {
  batchId: string;
  chainId: number;
  status: PredictDepositStatus;
  providerId: string;
};

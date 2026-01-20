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

export enum PredictWithdrawStatus {
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
  category: PredictCategory;
  tags: string[];
  outcomes: PredictOutcome[];
  liquidity: number;
  volume: number;
  game?: PredictMarketGame;
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

// Sports league types
export type PredictSportsLeague = 'nfl';

// Game status
export type PredictGameStatus = 'scheduled' | 'ongoing' | 'ended';

// Team data
export interface PredictSportTeam {
  id: string;
  name: string;
  logo: string;
  abbreviation: string; // e.g., "SEA", "DEN"
  color: string; // Team primary color (hex)
  alias: string; // Team alias (e.g., "Seahawks")
}

// Parsed score data
export interface PredictGameScore {
  away: number;
  home: number;
  raw: string; // Original "away-home" format (e.g., "21-14")
}

export type PredictGamePeriod =
  | 'NS' // Not Started
  | 'Q1' // First Quarter
  | 'End Q1' // End of First Quarter
  | 'Q2' // Second Quarter
  | 'HT' // Halftime
  | 'Q3' // Third Quarter
  | 'End Q3' // End of Third Quarter
  | 'Q4' // Fourth Quarter
  | 'End Q4' // End of Fourth Quarter
  | 'OT' // Overtime
  | 'FT' // Final
  | 'VFT'; // Verified fulltime (when closed=true)

// Game data attached to market
export interface PredictMarketGame {
  id: string;
  startTime: string;
  endTime?: string; // ISO date when game ended, available for ended games
  status: PredictGameStatus;
  league: PredictSportsLeague;
  elapsed: string | null; // Game clock, null if not available
  period: PredictGamePeriod | null; // Current period, null if not available
  score: PredictGameScore | null; // Parsed score with away/home values, null if not available
  homeTeam: PredictSportTeam;
  awayTeam: PredictSportTeam;
  turn?: string; // Team abbreviation with possession
}

// Live update types for WebSocket data
export interface GameUpdate {
  gameId: string;
  score: string;
  elapsed: string;
  period: PredictGamePeriod;
  status: PredictGameStatus;
  turn?: string;
}

export interface PriceUpdate {
  tokenId: string;
  price: number;
  bestBid: number;
  bestAsk: number;
}

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
  resolutionStatus?: string;
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

export enum PredictActivityType {
  BUY = 'BUY',
  SELL = 'SELL',
  CLAIM = 'CLAIM',
}

export interface PredictActivityItem {
  id: string;
  type: PredictActivityType;
  marketTitle: string;
  detail: string;
  amountUsd: number;
  icon?: string;
  outcome?: string;
  percentChange?: number;
  providerId?: string;
  priceImpactPercentage?: number;
  metamaskFeeUsd?: number;
  providerFeeUsd?: number;
  totalUsd?: number;
  netPnlUsd?: number;
  totalNetPnlUsd?: number;
  entry: PredictActivityEntry;
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
  startTs?: number;
  endTs?: number;
}

/**
 * Parameters for fetching prices from CLOB /prices endpoint
 */
export interface GetPriceParams {
  providerId: string;
  queries: PriceQuery[];
}

export interface PriceQuery {
  marketId: string;
  outcomeId: string;
  outcomeTokenId: string;
}

export interface GetPriceResponse {
  providerId: string;
  results: PriceResult[];
}

export interface PriceResult {
  marketId: string;
  outcomeId: string;
  outcomeTokenId: string;
  entry: PriceEntry;
}

export interface PriceEntry {
  buy: number;
  sell: number;
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
  optimistic?: boolean;
};

export type PredictBalance = {
  balance: number;
  validUntil: number;
};

export interface ClaimParams {
  providerId: string;
}

export interface GetMarketPriceResponse {
  price: number;
}

export type Result<T = void> =
  | {
      success: true;
      response: T;
      error?: never;
    }
  | {
      success: false;
      error: string;
      response?: never;
    };

export interface UnrealizedPnL {
  user: string;
  cashUpnl: number;
  percentUpnl: number;
}

export type PredictClaim = {
  batchId: string;
  chainId: number;
  status: PredictClaimStatus;
};

export type PredictDeposit = {
  batchId: string;
  chainId: number;
  status: PredictDepositStatus;
  providerId: string;
};

export type PredictWithdraw = {
  chainId: number;
  status: PredictWithdrawStatus;
  providerId: string;
  predictAddress: Hex;
  transactionId: string;
  amount: number;
};

export type PredictAccountMeta = {
  isOnboarded: boolean;
};

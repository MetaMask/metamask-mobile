import type { BridgeAssetV2 } from '@metamask/bridge-controller';
import type { CaipChainId } from '@metamask/utils';
import type { RecurringIntervalUnit } from '../utils/recurringSchedule';

export enum RecurringOrderStatus {
  Open = 'open',
  Completed = 'completed',
  Cancelled = 'cancelled',
  Expired = 'expired',
}

export enum RecurringSwapStatus {
  Filled = 'filled',
  Skipped = 'skipped',
  Failed = 'failed',
}

export type RecurringSwapSkipReason =
  | 'not_enough_gas'
  | 'out_of_price_range'
  | 'insufficient_balance'
  | 'no_quotes_available'
  | 'needs_smart_account'
  | 'execution_failed';

export interface RecurringSwap {
  swapId: string;
  orderId: string;
  status: RecurringSwapStatus;
  skipReason?: RecurringSwapSkipReason;
  src: { amount: string };
  dest: { amount: string; minAmount?: string };
  requestId?: string;
  txHash?: string;
  scheduledAt: string;
  executedAt?: string;
}

export interface RecurringSchedule {
  every: number;
  unit: RecurringIntervalUnit;
  repeatCount: number;
}

export interface RecurringPriceRange {
  tokenSide: 'source' | 'dest';
  currency: 'USD';
  min?: string;
  max?: string;
}

export interface RecurringOrder {
  orderId: string;
  status: RecurringOrderStatus;
  src: {
    amount: string;
    asset: BridgeAssetV2;
    walletAddress: string;
  };
  dest: {
    asset: BridgeAssetV2;
    walletAddress: string;
  };
  srcFilled: { amount: string };
  destFilled: { amount: string };
  srcTotal: { amount: string };
  filledSwapsCount: number;
  schedule: RecurringSchedule;
  priceRange?: RecurringPriceRange;
  slippage?: number;
  gasIncluded: boolean;
  gasIncluded7702: boolean;
  createdAt: string;
  startsAt: string;
  endsAt: string;
  expiresAt: string;
  averageExecutionPriceUsd?: string;
}

export interface GetRecurringOrdersQuery {
  walletAddress: string;
  status?: RecurringOrderStatus[];
  chainId?: CaipChainId;
  limit?: number;
  cursor?: string;
}

export interface GetRecurringOrdersResponse {
  orders: RecurringOrder[];
  nextCursor?: string;
}

export interface GetRecurringSwapsQuery {
  limit?: number;
  cursor?: string;
}

export interface GetRecurringSwapsResponse {
  swaps: RecurringSwap[];
  nextCursor?: string;
}

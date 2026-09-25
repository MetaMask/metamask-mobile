import type { Infer } from '@metamask/superstruct';
import type { CaipChainId } from '@metamask/utils';
import type { LimitOrderSchema } from './schema';

/**
 * Where an order is in its lifecycle, as the API reports it in `state`.
 */
export enum LimitOrderState {
  Open = 'OPEN',
  Executing = 'EXECUTING',
  Submitted = 'SUBMITTED',
  Filled = 'FILLED',
  Cancelled = 'CANCELLED',
  Expired = 'EXPIRED',
  Failed = 'FAILED',
}

/**
 * A limit order, as listed by `GET /v2/orders/limit`.
 */
export type LimitOrder = Infer<typeof LimitOrderSchema>;

export interface GetLimitOrdersQuery {
  walletAddress: string;
  /**
   * Only return orders in one of these states. Omit for every state.
   */
  states?: LimitOrderState[];
  chainId?: CaipChainId;
  limit?: number;
  cursor?: string;
}

export interface GetLimitOrdersResponse {
  orders: LimitOrder[];
  nextCursor?: string;
}

import type { BridgeAssetV2 } from '@metamask/bridge-controller';
import type { CaipChainId } from '@metamask/utils';

export enum LimitOrderStatus {
  Open = 'open',
  Filled = 'filled',
  Cancelled = 'cancelled',
  Expired = 'expired',
  Failed = 'failed',
}

export interface LimitOrder {
  orderId: string;
  clientOrderId: string;
  status: LimitOrderStatus;
  src: {
    amount: string;
    asset: BridgeAssetV2;
    walletAddress: string;
  };
  dest: {
    /** The amount actually received; only set once the order has filled. */
    amount?: string;
    asset: BridgeAssetV2;
    walletAddress: string;
  };
  /** The trigger price, expressed as `dest` per unit of `src`. */
  limitPrice: string;
  /**
   * How far below the expected `dest` amount the order will still accept,
   * expressed as a percent (e.g. `2` for 2%).
   */
  costTolerance: number;
  createdAt: string;
  expiresAt: string;
  filledAt?: string;
  cancelledAt?: string;
  failedAt?: string;
  failureReason?: string;
  txHash?: string;
}

export interface GetLimitOrdersQuery {
  walletAddress: string;
  status?: LimitOrderStatus[];
  chainId?: CaipChainId;
  limit?: number;
  cursor?: string;
}

export interface GetLimitOrdersResponse {
  orders: LimitOrder[];
  nextCursor?: string;
}

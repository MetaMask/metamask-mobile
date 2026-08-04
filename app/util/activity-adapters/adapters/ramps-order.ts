/**
 * Maps native RampsController orders into the shared `ActivityListItem` shape.
 * Parallel to `mapRampOrder` for legacy FiatOrder — no conversion between the
 * two order types.
 */
import type { RampsOrder } from '@metamask/ramps-controller';
import type { ActivityListItem } from '../types';
import {
  getRampsOrderCreatedAt,
  getRampsOrderTransactionHash,
  mapRampsOrderStatus,
  mapRampsOrderType,
  toRampsOrderCaipChainId,
  toRampsOrderToken,
} from './ramps-order-helpers';

export interface MapRampsOrderArgs {
  order: RampsOrder;
}

/**
 * Returns `null` for orders that should not surface in the activity feed or
 * cannot be normalized safely.
 */
export function mapRampsOrder({
  order,
}: MapRampsOrderArgs): ActivityListItem | null {
  if (order.excludeFromPurchases) {
    return null;
  }

  const type = mapRampsOrderType(order.orderType);
  if (!type) {
    return null;
  }

  const chainId = toRampsOrderCaipChainId(order);
  if (!chainId) {
    return null;
  }

  const isSell = type === 'sell';
  const transactionHash = getRampsOrderTransactionHash(order);
  // Prefer on-chain hash; fall back to canonical RampsOrder.id (not
  // providerOrderId) for stable row identity before a tx lands.
  const hash = transactionHash || order.id;
  if (!hash) {
    return null;
  }

  return {
    type,
    chainId,
    status: mapRampsOrderStatus(order.status),
    timestamp: getRampsOrderCreatedAt(order),
    hash,
    raw: { type: 'rampOrder', data: order },
    data: {
      from: order.walletAddress,
      token: toRampsOrderToken(order, isSell ? 'out' : 'in'),
    },
  };
}

/**
 * Maps fiat Ramp orders into the shared `ActivityListItem` shape for the
 * unified Activity list. Lives in mobile until shared
 * `@metamask/activity-adapters` publishes an equivalent.
 */
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import type { FiatOrder } from '../../../reducers/fiatOrders/types';
import type { ActivityListItem } from '../types';
import {
  getRampOrderTransactionHash,
  mapRampOrderStatus,
  mapRampOrderType,
  toRampOrderCaipChainId,
  toRampOrderToken,
} from './ramp-order-helpers';

export interface MapRampOrderArgs {
  order: FiatOrder;
}

/**
 * Returns `null` for orders that should not surface in the activity feed or
 * cannot be normalized safely.
 */
export function mapRampOrder({
  order,
}: MapRampOrderArgs): ActivityListItem | null {
  if (order.excludeFromPurchases) {
    return null;
  }

  const type = mapRampOrderType(order.orderType);
  if (!type) {
    return null;
  }

  const chainId = toRampOrderCaipChainId(order.network);
  if (!chainId) {
    return null;
  }

  const isSell = type === 'sell';
  const transactionHash = getRampOrderTransactionHash(order, type);
  // Some Ramp orders exist before an on-chain tx hash is available. Use the
  // order id for stable row identity, but those entries cannot dedup against an
  // eventual EVM API copy until the real tx hash lands.
  const hash = transactionHash || order.id;

  return {
    type,
    chainId,
    status: mapRampOrderStatus(order.state),
    timestamp: order.createdAt,
    hash,
    raw: { type: 'rampOrder', data: order },
    data: {
      from: order.account,
      token: toRampOrderToken(order, isSell ? 'out' : 'in'),
    },
  };
}

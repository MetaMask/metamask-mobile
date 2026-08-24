/**
 * Maps fiat Ramp orders into the shared `ActivityListItem` shape for the
 * unified Activity list. Lives in mobile until shared
 * `@metamask/activity-adapters` publishes an equivalent.
 */
import type { CaipChainId } from '@metamask/utils';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import type { FiatOrder } from '../../../reducers/fiatOrders/types';
import type { ActivityListItem } from '../types';
import {
  caipChainIdFromAssetId,
  getRampOrderTransactionHash,
  mapRampOrderStatus,
  mapRampOrderType,
  toRampOrderCaipChainId,
  toRampOrderToken,
} from './ramp-order-helpers';

export interface MapRampOrderArgs {
  order: FiatOrder;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : undefined;
}

/**
 * Resolves CAIP-2 for a legacy FiatOrder. Falls through an unparseable
 * network name string (e.g. `"ethereum"`) to cryptoCurrency metadata.
 */
function toFiatOrderCaipChainId(order: FiatOrder): CaipChainId | null {
  const fromNetwork = toRampOrderCaipChainId(order.network);
  if (fromNetwork) {
    return fromNetwork;
  }

  const cryptoCurrency = asRecord(asRecord(order.data)?.cryptoCurrency);
  const chainId = cryptoCurrency?.chainId;
  if (typeof chainId === 'string') {
    const fromChain = toRampOrderCaipChainId(chainId);
    if (fromChain) {
      return fromChain;
    }
  }

  const assetId = cryptoCurrency?.assetId;
  return typeof assetId === 'string' ? caipChainIdFromAssetId(assetId) : null;
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

  const chainId = toFiatOrderCaipChainId(order);
  if (!chainId) {
    return null;
  }

  const isSell = type === 'sell';
  const transactionHash = getRampOrderTransactionHash(order, type);
  // Some Ramp orders exist before an on-chain tx hash is available (or only
  // have a placeholder like DUMMY_TX_ID). Use the order id for stable row
  // identity so Activity hash-dedup does not collapse distinct orders.
  const hash = transactionHash || order.id;
  const timestamp =
    typeof order.createdAt === 'number'
      ? order.createdAt
      : new Date(order.createdAt).getTime();

  return {
    type,
    chainId,
    status: mapRampOrderStatus(order.state),
    timestamp: Number.isFinite(timestamp) ? timestamp : 0,
    hash,
    raw: { type: 'rampOrder', data: order },
    data: {
      from: order.account,
      token: toRampOrderToken(order, isSell ? 'out' : 'in'),
    },
  };
}

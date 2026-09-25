import type { LimitOrder } from '../../api/limitOrders/getLimitOrders/types';
import type { BridgeToken } from '../../types';
import { convertApiTokenToBridgeToken } from '../tokenUtils';

/**
 * Resolves the source and destination `BridgeToken`s for a limit order, for
 * use with components (avatars, symbols) that expect that shape.
 *
 * @param order - The limit order.
 * @returns The order's source and destination tokens.
 */
export function getLimitOrderTokens(order: LimitOrder): {
  sourceToken: BridgeToken;
  destinationToken: BridgeToken;
} {
  return {
    sourceToken: convertApiTokenToBridgeToken({
      ...order.src.asset,
      iconUrl: order.src.asset.iconUrl ?? undefined,
    }),
    destinationToken: convertApiTokenToBridgeToken({
      ...order.dest.asset,
      iconUrl: order.dest.asset.iconUrl ?? undefined,
    }),
  };
}

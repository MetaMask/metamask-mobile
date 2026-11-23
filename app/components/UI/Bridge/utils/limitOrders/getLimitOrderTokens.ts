import type { LimitOrderAsset } from '../../api/limitOrders/create/schema';
import type { LimitOrder } from '../../api/limitOrders/getLimitOrders/types';
import type { BridgeToken } from '../../types';
import { convertApiTokenToBridgeToken } from '../tokenUtils';

const toBridgeToken = ({
  assetId,
  name,
  symbol,
  decimals,
  iconUrl,
}: LimitOrderAsset): BridgeToken =>
  convertApiTokenToBridgeToken({ assetId, name, symbol, decimals, iconUrl });

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
    sourceToken: toBridgeToken(order.src.asset),
    destinationToken: toBridgeToken(order.dest.asset),
  };
}

import { type Order, type Position } from '@metamask/perps-controller';
import {
  buildDisplayOrdersWithSyntheticTpsl,
  shouldDisplayOrderInMarketDetailsOrders,
} from '../utils/orderUtils';

export interface NormalizeMarketDetailsOrdersParams {
  orders: Order[];
  existingPosition?: Position;
}

/**
 * Normalizes orders for Perps Market Details > Orders section.
 *
 * Current implementation preserves HyperLiquid-backed behavior by composing the
 * existing order utility helpers. This creates a seam for future protocol
 * strategy-based normalization without changing view-level logic.
 */
export const normalizeMarketDetailsOrders = ({
  orders,
  existingPosition,
}: NormalizeMarketDetailsOrdersParams): Order[] => {
  const ordersWithSyntheticTpsl = buildDisplayOrdersWithSyntheticTpsl(orders);

  return ordersWithSyntheticTpsl.filter((order) =>
    shouldDisplayOrderInMarketDetailsOrders(order, existingPosition),
  );
};

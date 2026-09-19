import type { RampsOrder } from '@metamask/ramps-controller';
import type { FiatOrder } from '../../../../reducers/fiatOrders/types';
import {
  getRampOrderTransactionHash,
  mapRampOrderType,
} from '../../../../util/activity-adapters/adapters/ramp-order-helpers';
import { getRampsOrderTransactionHash } from '../../../../util/activity-adapters/adapters/ramps-order-helpers';
import { equalsIgnoreCase } from '../../../../util/string';

function matchesLegacyOrder(order: FiatOrder, identifier: string) {
  if (equalsIgnoreCase(order.id, identifier)) {
    return true;
  }

  const kind = mapRampOrderType(order.orderType);
  if (kind) {
    return equalsIgnoreCase(
      getRampOrderTransactionHash(order, kind),
      identifier,
    );
  }

  return (
    equalsIgnoreCase(getRampOrderTransactionHash(order, 'buy'), identifier) ||
    equalsIgnoreCase(getRampOrderTransactionHash(order, 'sell'), identifier)
  );
}

function matchesRampsOrder(order: RampsOrder, identifier: string) {
  if (equalsIgnoreCase(order.id, identifier)) {
    return true;
  }
  if (equalsIgnoreCase(order.providerOrderId, identifier)) {
    return true;
  }
  return equalsIgnoreCase(getRampsOrderTransactionHash(order), identifier);
}

export function findRampOrder(
  identifier: string | undefined,
  {
    legacyOrders,
    orders,
    getOrderById,
  }: {
    legacyOrders: FiatOrder[];
    orders: RampsOrder[];
    getOrderById?: (id: string) => RampsOrder | undefined;
  },
) {
  if (!identifier) {
    return undefined;
  }

  const byId = getOrderById?.(identifier);
  if (byId) {
    return byId;
  }

  return (
    orders.find((order) => matchesRampsOrder(order, identifier)) ??
    legacyOrders.find((order) => matchesLegacyOrder(order, identifier))
  );
}

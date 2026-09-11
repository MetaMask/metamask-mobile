import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import type { RampsOrder } from '@metamask/ramps-controller';
import { getOrders } from '../../../../reducers/fiatOrders';
import type { FiatOrder } from '../../../../reducers/fiatOrders/types';
import { useRampsOrders } from '../../../UI/Ramp/hooks/useRampsOrders';

function indexRampOrders(
  legacyOrders: FiatOrder[],
  v2Orders: RampsOrder[],
): Map<string, FiatOrder | RampsOrder> {
  const byId = new Map<string, FiatOrder | RampsOrder>();

  for (const order of legacyOrders) {
    byId.set(order.id.toLowerCase(), order);
  }

  for (const order of v2Orders) {
    byId.set(order.id.toLowerCase(), order);
    if (order.providerOrderId) {
      byId.set(order.providerOrderId.toLowerCase(), order);
    }
  }

  return byId;
}

export function useRampOrderLookup() {
  const legacyOrders = useSelector(getOrders);
  const { orders: v2Orders } = useRampsOrders();

  return useMemo(() => {
    const ordersById = indexRampOrders(legacyOrders, v2Orders);

    return (
      identifier: string | undefined,
    ): FiatOrder | RampsOrder | undefined => {
      if (!identifier) {
        return undefined;
      }
      return ordersById.get(identifier.toLowerCase());
    };
  }, [legacyOrders, v2Orders]);
}

export function useRampOrderById(
  orderId: string | undefined,
): FiatOrder | RampsOrder | undefined {
  const findRampOrder = useRampOrderLookup();
  return useMemo(() => findRampOrder(orderId), [findRampOrder, orderId]);
}

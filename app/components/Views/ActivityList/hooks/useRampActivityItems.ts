/**
 * Maps stored fiat Ramp orders into the shared `ActivityListItem` shape for the
 * unified Activity list. Merges legacy Redux orders with v2 RampsController
 * orders, matching the Orders list behavior.
 */
import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import type { RampsOrder } from '@metamask/ramps-controller';
import { getOrders } from '../../../../reducers/fiatOrders';
import type { FiatOrder } from '../../../../reducers/fiatOrders/types';
import { useRampsOrders } from '../../../UI/Ramp/hooks/useRampsOrders';
import { mergeDisplayOrders } from '../../../UI/Ramp/utils/displayOrder';
import { rampsOrderToFiatOrder } from '../../../UI/Ramp/orderProcessor/unifiedOrderProcessor';
import {
  mapRampOrder,
  type ActivityListItem,
} from '../../../../util/activity-adapters';

function getRampsOrderId(order: RampsOrder): string {
  return order.id ?? order.providerOrderId;
}

function findV2Order(
  v2Orders: RampsOrder[],
  displayId: string,
): RampsOrder | undefined {
  return v2Orders.find(
    (order) =>
      getRampsOrderId(order) === displayId ||
      order.providerOrderId === displayId,
  );
}

function toMergedFiatOrders(
  legacyOrders: FiatOrder[],
  v2Orders: RampsOrder[],
): FiatOrder[] {
  const displayOrders = mergeDisplayOrders(legacyOrders, v2Orders);
  const legacyById = new Map(legacyOrders.map((order) => [order.id, order]));

  const mergedOrders: FiatOrder[] = [];

  for (const displayOrder of displayOrders) {
    if (displayOrder.source === 'legacy') {
      const legacyOrder = legacyById.get(displayOrder.id);
      if (legacyOrder) {
        mergedOrders.push(legacyOrder);
      }
      continue;
    }

    const v2Order = findV2Order(v2Orders, displayOrder.id);
    if (v2Order) {
      mergedOrders.push(rampsOrderToFiatOrder(v2Order));
    }
  }

  return mergedOrders;
}

export function useRampActivityItems(): ActivityListItem[] {
  const legacyOrders = useSelector(getOrders);
  const { orders: v2Orders } = useRampsOrders();

  const mergedOrders = useMemo(
    () => toMergedFiatOrders(legacyOrders, v2Orders),
    [legacyOrders, v2Orders],
  );

  return useMemo(() => {
    const result: ActivityListItem[] = [];
    for (const order of mergedOrders) {
      const item = mapRampOrder({ order });
      if (item) {
        result.push(item);
      }
    }
    return result;
  }, [mergedOrders]);
}

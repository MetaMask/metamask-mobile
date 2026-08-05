/**
 * Maps ramp orders into the shared `ActivityListItem` shape for the unified
 * Activity list. Merges legacy Redux FiatOrder[] with v2 RampsController
 * RampsOrder[] via mergeDisplayOrders, then maps each source natively —
 * no RampsOrder → FiatOrder conversion.
 */
import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import type { RampsOrder } from '@metamask/ramps-controller';
import { getOrders } from '../../../../reducers/fiatOrders';
import type { FiatOrder } from '../../../../reducers/fiatOrders/types';
import { useRampsOrders } from '../../../UI/Ramp/hooks/useRampsOrders';
import { mergeDisplayOrders } from '../../../UI/Ramp/utils/displayOrder';
import {
  mapRampOrder,
  mapRampsOrder,
  type ActivityListItem,
} from '../../../../util/activity-adapters';

function findV2Order(
  v2Orders: RampsOrder[],
  displayId: string,
): RampsOrder | undefined {
  return v2Orders.find(
    (order) => order.providerOrderId === displayId || order.id === displayId,
  );
}

export function useRampActivityItems(): ActivityListItem[] {
  const legacyOrders = useSelector(getOrders);
  const { orders: v2Orders } = useRampsOrders();

  return useMemo(() => {
    const displayOrders = mergeDisplayOrders(legacyOrders, v2Orders);
    const legacyById = new Map(
      legacyOrders.map((order: FiatOrder) => [order.id, order]),
    );
    const result: ActivityListItem[] = [];

    for (const displayOrder of displayOrders) {
      if (displayOrder.source === 'legacy') {
        const legacyOrder = legacyById.get(displayOrder.id);
        if (!legacyOrder) {
          continue;
        }
        const item = mapRampOrder({ order: legacyOrder });
        if (item) {
          result.push(item);
        }
        continue;
      }

      const v2Order = findV2Order(v2Orders, displayOrder.id);
      if (!v2Order) {
        continue;
      }
      const item = mapRampsOrder({ order: v2Order });
      if (item) {
        result.push(item);
      }
    }

    return result;
  }, [legacyOrders, v2Orders]);
}

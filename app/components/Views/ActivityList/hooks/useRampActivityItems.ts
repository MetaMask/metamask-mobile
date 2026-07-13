/**
 * Maps stored fiat Ramp orders into the shared `ActivityListItem` shape for the
 * unified Activity list. Source of truth is the fiatOrders redux reducer.
 */
import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { getOrders } from '../../../../reducers/fiatOrders';
import {
  mapRampOrder,
  type ActivityListItem,
} from '../../../../util/activity-adapters';

export function useRampActivityItems(): ActivityListItem[] {
  const orders = useSelector(getOrders);

  return useMemo(() => {
    const result: ActivityListItem[] = [];
    for (const order of orders) {
      const item = mapRampOrder({ order });
      if (item) {
        result.push(item);
      }
    }
    return result;
  }, [orders]);
}

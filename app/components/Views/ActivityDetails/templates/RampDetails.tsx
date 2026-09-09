import React from 'react';
import {
  isRampFiatOrder,
  isRampRampsOrder,
  type ActivityListItem,
} from '../../../../util/activity-adapters';
import { useRampsDetailsOrder } from '../hooks/useRampsDetailsOrder';
import { RampFiatOrderDetails } from './RampFiatOrderDetails';
import { RampRampsOrderDetails } from './RampRampsOrderDetails';

export type RampActivityListItem = ActivityListItem & {
  type: 'buy' | 'sell' | 'rampBuy' | 'rampSell';
};

/**
 * Dispatches to FiatOrder or RampsOrder details. Branch only on data shape —
 * not provider / navigation target.
 */
export function RampDetails({
  item,
}: Readonly<{ item: RampActivityListItem }>) {
  const order = useRampsDetailsOrder(item.hash);

  if (!order) {
    return null;
  }

  if (isRampRampsOrder(order)) {
    return <RampRampsOrderDetails item={item} order={order} />;
  }

  if (isRampFiatOrder(order)) {
    return <RampFiatOrderDetails item={item} order={order} />;
  }

  return null;
}

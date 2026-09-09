import React from 'react';
import {
  isRampFiatOrder,
  isRampRampsOrder,
  type ActivityListItem,
} from '../../../../util/activity-adapters';
import { useRampsDetailsOrder } from './Ramps/useRampsDetailsOrder';
import { DefaultDetails } from './DefaultDetails';
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
    return <DefaultDetails item={item} />;
  }

  if (isRampRampsOrder(order)) {
    return <RampRampsOrderDetails order={order} />;
  }

  if (isRampFiatOrder(order)) {
    return <RampFiatOrderDetails order={order} />;
  }

  return null;
}

import React from 'react';
import type { FiatOrder } from '../../../../reducers/fiatOrders/types';
import type { RampsOrder } from '@metamask/ramps-controller';
import {
  isRampFiatOrder,
  isRampRampsOrder,
  type ActivityListItem,
} from '../../../../util/activity-adapters';
import {
  RampFiatOrderDetails,
  type RampFiatActivityListItem,
} from './RampFiatOrderDetails';
import {
  RampRampsOrderDetails,
  type RampRampsActivityListItem,
} from './RampRampsOrderDetails';

export type RampActivityListItem = ActivityListItem & {
  type: 'buy' | 'sell';
  raw: { type: 'rampOrder'; data: FiatOrder | RampsOrder };
};

export function isRampActivityListItem(
  item: ActivityListItem,
): item is RampActivityListItem {
  return item.raw?.type === 'rampOrder';
}

/**
 * Dispatches to FiatOrder or RampsOrder details. Branch only on data shape —
 * not provider / navigation target.
 */
export function RampDetails({
  item,
}: Readonly<{ item: RampActivityListItem }>) {
  const { data } = item.raw;

  if (isRampRampsOrder(data)) {
    return <RampRampsOrderDetails item={item as RampRampsActivityListItem} />;
  }

  if (isRampFiatOrder(data)) {
    return <RampFiatOrderDetails item={item as RampFiatActivityListItem} />;
  }

  return null;
}

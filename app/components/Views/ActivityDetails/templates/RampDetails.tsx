import React from 'react';
import type { FiatOrder } from '../../../../reducers/fiatOrders/types';
import type { RampsOrder } from '@metamask/ramps-controller';
import {
  isRampFiatOrder,
  isRampRampsOrder,
  isRampActivityListRow,
  type ActivityListItem,
} from '../../../../util/activity-adapters';
/* eslint-disable import-x/no-restricted-paths -- TODO(ADR-0020): shared ramp order lookup with ActivityList hook */
import { useRampOrderById } from '../../ActivityList/hooks/useRampOrderLookup';
/* eslint-enable import-x/no-restricted-paths */
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
};

export function isRampActivityListItem(
  item: ActivityListItem,
): item is RampActivityListItem {
  return isRampActivityListRow(item);
}

function RampOrderDetails({
  item,
  order,
}: Readonly<{
  item: RampActivityListItem;
  order: FiatOrder | RampsOrder;
}>) {
  if (isRampRampsOrder(order)) {
    return (
      <RampRampsOrderDetails
        item={item as RampRampsActivityListItem}
        order={order}
      />
    );
  }

  if (isRampFiatOrder(order)) {
    return (
      <RampFiatOrderDetails
        item={item as RampFiatActivityListItem}
        order={order}
      />
    );
  }

  return null;
}

/**
 * Dispatches to FiatOrder or RampsOrder details. Branch only on data shape —
 * not provider / navigation target.
 */
export function RampDetails({
  item,
}: Readonly<{ item: RampActivityListItem }>) {
  const order = useRampOrderById(item.hash);

  if (!order) {
    return null;
  }

  return <RampOrderDetails item={item} order={order} />;
}

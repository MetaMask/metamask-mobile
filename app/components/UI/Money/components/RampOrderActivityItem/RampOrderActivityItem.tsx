import React, { useMemo } from 'react';
import type { RampsOrder } from '@metamask/ramps-controller';
import { rampOrderActivityDisplayInfo } from '../../utils/rampOrderActivityDisplayInfo';
import ActivityRowView from '../MoneyActivityItem/ActivityRowView';

export interface RampOrderActivityItemProps {
  order: RampsOrder;
}

const RampOrderActivityItem = ({ order }: RampOrderActivityItemProps) => {
  const display = useMemo(() => rampOrderActivityDisplayInfo(order), [order]);

  return (
    <ActivityRowView
      id={order.providerOrderId}
      display={display}
      showNetworkBadge={false}
    />
  );
};

export default RampOrderActivityItem;

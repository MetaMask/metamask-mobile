import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import type { RampsOrder } from '@metamask/ramps-controller';
import { getOrders } from '../../../../../reducers/fiatOrders';
import type { FiatOrder } from '../../../../../reducers/fiatOrders/types';
import { useRampsOrders } from '../../../../UI/Ramp/hooks/useRampsOrders';
import {
  getRampOrderTransactionHash,
  mapRampOrderType,
} from '../../../../../util/activity-adapters/adapters/ramp-order-helpers';
import { getRampsOrderTransactionHash } from '../../../../../util/activity-adapters/adapters/ramps-order-helpers';

function matchesLegacyOrder(order: FiatOrder, identifier: string) {
  if (order.id.toLowerCase() === identifier) {
    return true;
  }

  const kind = mapRampOrderType(order.orderType);
  if (kind) {
    return (
      getRampOrderTransactionHash(order, kind)?.toLowerCase() === identifier
    );
  }

  return (
    getRampOrderTransactionHash(order, 'buy')?.toLowerCase() === identifier ||
    getRampOrderTransactionHash(order, 'sell')?.toLowerCase() === identifier
  );
}

function matchesRampsOrder(order: RampsOrder, identifier: string) {
  if (order.id?.toLowerCase() === identifier) {
    return true;
  }
  if (order.providerOrderId?.toLowerCase() === identifier) {
    return true;
  }
  return getRampsOrderTransactionHash(order)?.toLowerCase() === identifier;
}

export function useRampsDetailsOrder(txIdentifier: string | undefined) {
  const legacyOrders = useSelector(getOrders);
  const { orders, getOrderById } = useRampsOrders();

  return useMemo(() => {
    if (!txIdentifier) {
      return undefined;
    }

    const identifier = txIdentifier.toLowerCase();
    const byId = getOrderById(txIdentifier);
    if (byId) {
      return byId;
    }

    return (
      orders.find((order) => matchesRampsOrder(order, identifier)) ??
      legacyOrders.find((order) => matchesLegacyOrder(order, identifier))
    );
  }, [getOrderById, legacyOrders, orders, txIdentifier]);
}

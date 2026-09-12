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
import { equalsIgnoreCase } from '../../../../../util/string';

function matchesLegacyOrder(order: FiatOrder, identifier: string) {
  if (equalsIgnoreCase(order.id, identifier)) {
    return true;
  }

  const kind = mapRampOrderType(order.orderType);
  if (kind) {
    return equalsIgnoreCase(
      getRampOrderTransactionHash(order, kind),
      identifier,
    );
  }

  return (
    equalsIgnoreCase(getRampOrderTransactionHash(order, 'buy'), identifier) ||
    equalsIgnoreCase(getRampOrderTransactionHash(order, 'sell'), identifier)
  );
}

function matchesRampsOrder(order: RampsOrder, identifier: string) {
  if (equalsIgnoreCase(order.id, identifier)) {
    return true;
  }
  if (equalsIgnoreCase(order.providerOrderId, identifier)) {
    return true;
  }
  return equalsIgnoreCase(getRampsOrderTransactionHash(order), identifier);
}

export function useRampsDetailsOrder(txIdentifier: string | undefined) {
  const legacyOrders = useSelector(getOrders);
  const { orders, getOrderById } = useRampsOrders();

  return useMemo(() => {
    if (!txIdentifier) {
      return undefined;
    }

    const byId = getOrderById(txIdentifier);
    if (byId) {
      return byId;
    }

    return (
      orders.find((order) => matchesRampsOrder(order, txIdentifier)) ??
      legacyOrders.find((order) => matchesLegacyOrder(order, txIdentifier))
    );
  }, [getOrderById, legacyOrders, orders, txIdentifier]);
}

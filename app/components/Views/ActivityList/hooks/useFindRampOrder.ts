import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { getOrders } from '../../../../reducers/fiatOrders';
import { useRampsOrders } from '../../../UI/Ramp/hooks/useRampsOrders';
import { findRampOrder } from './findRampOrder';

export { findRampOrder } from './findRampOrder';

export function useFindRampOrder() {
  const legacyOrders = useSelector(getOrders);
  const { orders, getOrderById } = useRampsOrders();

  return useCallback(
    (identifier: string | undefined) =>
      findRampOrder(identifier, { legacyOrders, orders, getOrderById }),
    [getOrderById, legacyOrders, orders],
  );
}

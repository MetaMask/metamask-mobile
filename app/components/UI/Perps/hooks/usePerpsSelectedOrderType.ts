import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import type { OrderType } from '@metamask/perps-controller';
import Engine from '../../../../core/Engine';
import { selectPerpsSelectedOrderType } from '../selectors/perpsController';

export interface UsePerpsSelectedOrderTypeReturn {
  /** Market-agnostic order type from shared controller state. */
  selectedOrderType: OrderType;
  /** Persist the selected order type on the shared PerpsController state. */
  setSelectedOrderType: (orderType: OrderType) => void;
}

/**
 * Read and update the persisted market-agnostic order type.
 *
 * Lives on `PerpsController.selectedOrderType` so switching from limit on BTC
 * to ETH keeps the limit configuration across markets and app restarts.
 */
export const usePerpsSelectedOrderType =
  (): UsePerpsSelectedOrderTypeReturn => {
    const selectedOrderType = useSelector(selectPerpsSelectedOrderType);

    const setSelectedOrderType = useCallback((orderType: OrderType) => {
      Engine.context.PerpsController.setSelectedOrderType(orderType);
    }, []);

    return { selectedOrderType, setSelectedOrderType };
  };

import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import type { RampsOrder } from '@metamask/ramps-controller';
import { extractOrderCode } from '../utils/extractOrderCode';
import Engine from '../../../../core/Engine';
import {
  selectRampsOrdersForSelectedAccountGroup,
  selectRampsOrdersForSelectedAccountGroupOrMoneyAccount,
} from '../../../../selectors/rampsController';

export interface AddPrecreatedOrderParams {
  orderId: string;
  providerCode: string;
  walletAddress: string;
  chainId?: string;
}

export interface UseRampsOrdersResult {
  orders: RampsOrder[];
  getOrderById: (providerOrderId: string) => RampsOrder | undefined;
  addOrder: (order: RampsOrder) => void;
  addPrecreatedOrder: (params: AddPrecreatedOrderParams) => void;
  removeOrder: (providerOrderId: string) => void;
  refreshOrder: (
    providerCode: string,
    orderCode: string,
    wallet: string,
  ) => Promise<RampsOrder>;
  getOrderFromCallback: (
    providerCode: string,
    callbackUrl: string,
    wallet: string,
  ) => Promise<RampsOrder>;
}

export interface UseRampsOrdersConfig {
  includeMoneyAccountOrdersInLookup?: boolean;
}

export function useRampsOrders(
  config: UseRampsOrdersConfig = {},
): UseRampsOrdersResult {
  const orders = useSelector(selectRampsOrdersForSelectedAccountGroup);
  const lookupOrders = useSelector(
    config.includeMoneyAccountOrdersInLookup
      ? selectRampsOrdersForSelectedAccountGroupOrMoneyAccount
      : selectRampsOrdersForSelectedAccountGroup,
  );

  const getOrderById = useCallback(
    (providerOrderId: string) => {
      const orderCode = extractOrderCode(providerOrderId);
      return lookupOrders.find((o) => o.providerOrderId === orderCode);
    },
    [lookupOrders],
  );

  const addOrder = useCallback(
    (order: RampsOrder) => Engine.context.RampsController.addOrder(order),
    [],
  );

  const addPrecreatedOrder = useCallback(
    (params: AddPrecreatedOrderParams) =>
      Engine.context.RampsController.addPrecreatedOrder(params),
    [],
  );

  const removeOrder = useCallback(
    (providerOrderId: string) =>
      Engine.context.RampsController.removeOrder(providerOrderId),
    [],
  );

  const refreshOrder = useCallback(
    (providerCode: string, orderCode: string, wallet: string) =>
      Engine.context.RampsController.getOrder(providerCode, orderCode, wallet),
    [],
  );

  const getOrderFromCallback = useCallback(
    (providerCode: string, callbackUrl: string, wallet: string) =>
      Engine.context.RampsController.getOrderFromCallback(
        providerCode,
        callbackUrl,
        wallet,
      ),
    [],
  );

  return {
    orders,
    getOrderById,
    addOrder,
    addPrecreatedOrder,
    removeOrder,
    refreshOrder,
    getOrderFromCallback,
  };
}

export default useRampsOrders;

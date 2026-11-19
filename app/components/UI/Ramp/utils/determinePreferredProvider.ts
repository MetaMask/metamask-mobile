import { Order } from '@consensys/on-ramp-sdk';
import { type RampsOrder, RampsOrderStatus } from '@metamask/ramps-controller';
import type { FiatOrder } from '../../../../reducers/fiatOrders/types';
import {
  FIAT_ORDER_PROVIDERS,
  FIAT_ORDER_STATES,
} from '../../../../constants/on-ramp';

/**
 * Minimal representation of a completed order used for provider selection
 * and "previously used" logic. Both FiatOrder and RampsOrder map into this.
 */
export interface CompletedOrderInfo {
  providerId: string;
  completedAt: number;
}

export function completedOrdersFromFiatOrders(
  orders: FiatOrder[],
): CompletedOrderInfo[] {
  return orders
    .filter((order) => order.state === FIAT_ORDER_STATES.COMPLETED)
    .reduce<CompletedOrderInfo[]>((acc, order) => {
      let providerId: string | undefined;

      if (
        order.provider === FIAT_ORDER_PROVIDERS.AGGREGATOR ||
        order.provider === FIAT_ORDER_PROVIDERS.RAMPS_V2
      ) {
        const orderData =
          order.provider === FIAT_ORDER_PROVIDERS.RAMPS_V2
            ? (order.data as RampsOrder)
            : (order.data as Order);
        providerId = orderData?.provider?.id;
      } else if (
        order.provider === FIAT_ORDER_PROVIDERS.DEPOSIT ||
        order.provider === FIAT_ORDER_PROVIDERS.TRANSAK
      ) {
        providerId = 'TRANSAK';
      } else {
        providerId = order.provider;
      }

      if (providerId) {
        acc.push({ providerId, completedAt: order.createdAt });
      }
      return acc;
    }, []);
}

export function completedOrdersFromRampsOrders(
  orders: RampsOrder[],
): CompletedOrderInfo[] {
  return orders
    .filter((order) => order.status === RampsOrderStatus.Completed)
    .reduce<CompletedOrderInfo[]>((acc, order) => {
      const providerId = order.provider?.id;
      if (providerId) {
        acc.push({ providerId, completedAt: order.createdAt });
      }
      return acc;
    }, []);
}

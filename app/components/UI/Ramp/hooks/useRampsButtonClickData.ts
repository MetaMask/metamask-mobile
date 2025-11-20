import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Order } from '@consensys/on-ramp-sdk';
import {
  getOrders,
  getRampRoutingDecision,
  UnifiedRampRoutingType,
} from '../../../../reducers/fiatOrders';
import {
  FIAT_ORDER_PROVIDERS,
  FIAT_ORDER_STATES,
} from '../../../../constants/on-ramp';

export enum RampsButtonClickDataRampRouting {
  DEPOSIT = 'DEPOSIT',
  AGGREGATOR_BUY = 'AGGREGATOR BUY',
  AGGREGATOR_SELL = 'AGGREGATOR SELL',
  UNSUPPORTED = 'UNSUPPORTED',
  ERROR = 'ERROR',
}

export interface RampsButtonClickData {
  ramp_routing?: RampsButtonClickDataRampRouting;
  is_authenticated?: boolean;
  preferred_provider?: string;
  order_count: number;
}

export interface UseRampsButtonClickDataOptions {
  isAuthenticated?: boolean;
}

export function useRampsButtonClickData(
  rampType: 'DEPOSIT' | 'SELL' | 'BUY' | 'UNIFIED BUY',
  options?: UseRampsButtonClickDataOptions,
): RampsButtonClickData {
  const orders = useSelector(getOrders);
  const rampRoutingDecision = useSelector(getRampRoutingDecision);
  const isAuthenticated = options?.isAuthenticated;

  const data = useMemo(() => {
    const orderCount = orders.length;

    // Get preferred provider from last completed order (matching useRampsSmartRouting pattern)
    const completedOrders = orders.filter(
      (order) => order.state === FIAT_ORDER_STATES.COMPLETED,
    );

    let preferredProvider: string | undefined;
    if (completedOrders.length > 0) {
      const [lastCompletedOrder] = completedOrders.sort(
        (a, b) => b.createdAt - a.createdAt,
      );

      if (lastCompletedOrder.provider === FIAT_ORDER_PROVIDERS.AGGREGATOR) {
        const orderData = lastCompletedOrder.data as Order;
        preferredProvider = orderData?.provider?.id;
      } else if (
        lastCompletedOrder.provider === FIAT_ORDER_PROVIDERS.DEPOSIT ||
        lastCompletedOrder.provider === FIAT_ORDER_PROVIDERS.TRANSAK
      ) {
        preferredProvider = 'TRANSAK';
      } else {
        preferredProvider = lastCompletedOrder.provider;
      }
    }

    let rampRouting: RampsButtonClickDataRampRouting | undefined;
    if (rampRoutingDecision) {
      if (rampRoutingDecision === UnifiedRampRoutingType.AGGREGATOR) {
        rampRouting =
          rampType === 'SELL'
            ? RampsButtonClickDataRampRouting.AGGREGATOR_SELL
            : RampsButtonClickDataRampRouting.AGGREGATOR_BUY;
      } else {
        rampRouting =
          rampRoutingDecision as unknown as RampsButtonClickDataRampRouting;
      }
    }

    return {
      ramp_routing: rampRouting,
      is_authenticated: isAuthenticated,
      preferred_provider: preferredProvider,
      order_count: orderCount,
    };
  }, [orders, rampRoutingDecision, rampType, isAuthenticated]);

  return data;
}

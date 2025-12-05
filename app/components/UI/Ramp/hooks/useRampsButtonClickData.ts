import { useEffect, useMemo, useState } from 'react';
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
import { getProviderToken } from '../Deposit/utils/ProviderTokenVault';

export interface RampsButtonClickData {
  ramp_routing?: UnifiedRampRoutingType;
  is_authenticated?: boolean;
  preferred_provider?: string;
  order_count: number;
}

export function useRampsButtonClickData(): RampsButtonClickData {
  const orders = useSelector(getOrders);
  const rampRoutingDecision = useSelector(getRampRoutingDecision);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;

    const checkAuthentication = async () => {
      try {
        const tokenResponse = await getProviderToken();
        if (isMounted) {
          setIsAuthenticated(
            tokenResponse.success && !!tokenResponse.token?.accessToken,
          );
        }
      } catch (error) {
        if (isMounted) {
          setIsAuthenticated(false);
        }
      }
    };

    checkAuthentication();

    return () => {
      isMounted = false;
    };
  }, []);

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

    return {
      ramp_routing: rampRoutingDecision ?? undefined,
      is_authenticated: isAuthenticated,
      preferred_provider: preferredProvider,
      order_count: orderCount,
    };
  }, [orders, rampRoutingDecision, isAuthenticated]);

  return data;
}

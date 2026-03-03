import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  getOrders,
  getRampRoutingDecision,
  UnifiedRampRoutingType,
} from '../../../../reducers/fiatOrders';
import { selectRampsOrders } from '../../../../selectors/rampsController';
import { getProviderToken } from '../Deposit/utils/ProviderTokenVault';
import {
  completedOrdersFromFiatOrders,
  completedOrdersFromRampsOrders,
} from '../utils/determinePreferredProvider';

export interface RampsButtonClickData {
  ramp_routing?: UnifiedRampRoutingType;
  is_authenticated?: boolean;
  preferred_provider?: string;
  order_count: number;
}

export function useRampsButtonClickData(): RampsButtonClickData {
  const orders = useSelector(getOrders);
  const controllerOrders = useSelector(selectRampsOrders);
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
    const orderCount = orders.length + controllerOrders.length;

    const completedOrders = [
      ...completedOrdersFromFiatOrders(orders),
      ...completedOrdersFromRampsOrders(controllerOrders),
    ];

    let preferredProvider: string | undefined;
    if (completedOrders.length > 0) {
      const [mostRecent] = [...completedOrders].sort(
        (a, b) => b.completedAt - a.completedAt,
      );
      preferredProvider = mostRecent.providerId;
    }

    return {
      ramp_routing: rampRoutingDecision ?? undefined,
      is_authenticated: isAuthenticated,
      preferred_provider: preferredProvider,
      order_count: orderCount,
    };
  }, [orders, controllerOrders, rampRoutingDecision, isAuthenticated]);

  return data;
}

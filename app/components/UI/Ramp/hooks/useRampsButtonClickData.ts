import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { getOrders } from '../../../../reducers/fiatOrders';
import { selectRampsOrdersForSelectedAccountGroup } from '../../../../selectors/rampsController';
import { getProviderToken } from '../utils/ProviderTokenVault';
import {
  completedOrdersFromFiatOrders,
  completedOrdersFromRampsOrders,
} from '../utils/determinePreferredProvider';

export interface RampsButtonClickData {
  is_authenticated?: boolean;
  preferred_provider?: string;
  order_count: number;
}

export function useRampsButtonClickData(): RampsButtonClickData {
  const orders = useSelector(getOrders);
  const controllerOrders = useSelector(
    selectRampsOrdersForSelectedAccountGroup,
  );
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
      is_authenticated: isAuthenticated,
      preferred_provider: preferredProvider,
      order_count: orderCount,
    };
  }, [orders, controllerOrders, isAuthenticated]);

  return data;
}

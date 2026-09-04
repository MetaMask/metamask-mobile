import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import type { Order, Position } from '@metamask/perps-controller';
import { hasRecentPerpsAction } from '../utils/perpsActivityStorage';
import { getPreloadedData } from './stream/hasCachedPerpsData';

/** Every source here is synchronous so the answer exists during render. */
export const evaluateIsActivePerpsTrader = (): boolean => {
  const positions = getPreloadedData<Position[]>('cachedPositions');
  if (positions && positions.length > 0) {
    return true;
  }

  const orders = getPreloadedData<Order[]>('cachedOrders');
  if (orders && orders.length > 0) {
    return true;
  }

  return hasRecentPerpsAction();
};

/**
 * Whether the user has an open position, a resting order, or a perp action
 * inside the recency window.
 *
 * Captured at first render rather than awaited: wallet home picks its section
 * order from this, so a late answer would reorder the page under the user.
 * Refreshed on focus so it lands during a navigation transition instead.
 */
export const useIsActivePerpsTrader = (): boolean => {
  const [isActivePerpsTrader, setIsActivePerpsTrader] = useState(
    evaluateIsActivePerpsTrader,
  );

  useFocusEffect(
    useCallback(() => {
      setIsActivePerpsTrader(evaluateIsActivePerpsTrader());
    }, []),
  );

  return isActivePerpsTrader;
};

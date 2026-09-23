import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import type { Order, Position } from '@metamask/perps-controller';
import { getStreamManagerInstance } from '../providers/PerpsStreamManager';
import { selectPerpsSelectedAccountAddress } from '../selectors/selectedAccountAddress';
import { hasRecentPerpsAction } from '../utils/perpsActivityStorage';
import { getPreloadedData } from './stream/hasCachedPerpsData';

const readPerpsTraderEligibility = (): boolean | null => {
  const stream = getStreamManagerInstance();
  const positionsSnapshot = stream.positions.getSnapshot();
  const ordersSnapshot = stream.orders.getSnapshot();
  const positions =
    positionsSnapshot ?? getPreloadedData<Position[]>('cachedPositions');
  const orders = ordersSnapshot ?? getPreloadedData<Order[]>('cachedOrders');

  if (positions && positions.length > 0) {
    return true;
  }

  if (orders && orders.length > 0) {
    return true;
  }

  if (hasRecentPerpsAction()) {
    return true;
  }

  const positionsSettled = positionsSnapshot !== null || positions !== null;
  const ordersSettled = ordersSnapshot !== null || orders !== null;
  if (!positionsSettled || !ordersSettled) {
    return null;
  }

  return false;
};

/** Every source here is synchronous so the answer exists during render. */
export const evaluateIsActivePerpsTrader = (): boolean =>
  readPerpsTraderEligibility() === true;

/**
 * Whether the selected account has an open position, a resting order, or a
 * perp action inside the recency window.
 *
 * Captured at first render rather than awaited: wallet home picks its section
 * order from this, so a late answer would reorder the page under the user.
 * Refreshed on focus and when the selected account changes. A cleared stream
 * keeps the previous answer until that account's positions and orders load.
 */
export const useIsActivePerpsTrader = (): boolean => {
  const selectedAddress = useSelector(selectPerpsSelectedAccountAddress);
  const [isActivePerpsTrader, setIsActivePerpsTrader] = useState(
    evaluateIsActivePerpsTrader,
  );
  const hasFocusedOnce = useRef(false);
  const previousAddress = useRef(selectedAddress);

  const watchUntilSettled = useCallback(() => {
    const settled = readPerpsTraderEligibility();
    if (settled !== null) {
      setIsActivePerpsTrader(settled);
      return undefined;
    }

    const stream = getStreamManagerInstance();
    let didSettle = false;
    let unsubscribePositions = () => undefined;
    let unsubscribeOrders = () => undefined;

    const applyIfSettled = () => {
      if (didSettle) {
        return;
      }
      const next = readPerpsTraderEligibility();
      if (next === null) {
        return;
      }
      didSettle = true;
      setIsActivePerpsTrader(next);
      unsubscribePositions();
      unsubscribeOrders();
    };

    unsubscribePositions = stream.positions.subscribe({
      callback: applyIfSettled,
      throttleMs: 0,
    });
    unsubscribeOrders = stream.orders.subscribe({
      callback: applyIfSettled,
      throttleMs: 0,
    });
    applyIfSettled();

    return () => {
      didSettle = true;
      unsubscribePositions();
      unsubscribeOrders();
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!hasFocusedOnce.current) {
        hasFocusedOnce.current = true;
        const settled = readPerpsTraderEligibility();
        if (settled !== null) {
          setIsActivePerpsTrader(settled);
        }
        return undefined;
      }

      return watchUntilSettled();
    }, [watchUntilSettled]),
  );

  useEffect(() => {
    const previous = previousAddress.current;
    previousAddress.current = selectedAddress;
    if (previous === selectedAddress || previous === undefined) {
      return undefined;
    }

    return watchUntilSettled();
  }, [selectedAddress, watchUntilSettled]);

  return isActivePerpsTrader;
};

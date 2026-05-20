import { useEffect, useRef, useState } from 'react';
import Engine from '../../../../core/Engine';
import type { OrderbookData } from '../../Charts/LivelineChart/LivelineChart.types';
import type { OrderbookSnapshot } from '../types';

export interface UsePredictOrderbookOptions {
  enabled?: boolean;
}

export interface UsePredictOrderbookResult {
  orderbook: OrderbookData | null;
  loading: boolean;
}

const toLivelineOrderbook = (snapshot: OrderbookSnapshot): OrderbookData => ({
  bids: snapshot.bids.map(({ price, size }) => [price, size]),
  asks: snapshot.asks.map(({ price, size }) => [price, size]),
});

/**
 * Hook for subscribing to real-time orderbook (depth) updates for a single
 * outcome token via the Predict controller. The snapshot received from the
 * controller is already sorted (bids desc, asks asc) and is mapped to the
 * tuple shape consumed by `LivelineChart`'s `orderbook` prop.
 *
 * @param tokenId - The outcome token ID; pass undefined or empty string to skip subscribing
 * @param options - Configuration options (enabled: boolean)
 * @returns Latest orderbook tuple data and loading flag
 */
export function usePredictOrderbook(
  tokenId?: string,
  options: UsePredictOrderbookOptions = {},
): UsePredictOrderbookResult {
  const { enabled = true } = options;

  const [orderbook, setOrderbook] = useState<OrderbookData | null>(null);
  const [loading, setLoading] = useState(true);

  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    // Reset state when token changes to avoid stale data from previous
    // subscriptions.
    setOrderbook(null);
    setLoading(true);

    if (!tokenId || !enabled) {
      setLoading(false);
      return;
    }

    const { PredictController } = Engine.context;
    const unsubscribe = PredictController.subscribeToOrderbook(
      tokenId,
      (snapshot) => {
        if (!isMountedRef.current) return;
        setOrderbook(toLivelineOrderbook(snapshot));
        setLoading(false);
      },
    );

    return () => {
      isMountedRef.current = false;
      unsubscribe();
    };
  }, [tokenId, enabled]);

  return {
    orderbook,
    loading,
  };
}

import { useCallback, useEffect, useRef, useState } from 'react';
import Engine from '../../../../core/Engine';
import { PredictMarket } from '../types';

export interface UsePredictMarketOptions {
  id?: string | number;
  providerId?: string;
  enabled?: boolean;
}

export interface UsePredictMarketResult {
  market: PredictMarket | null;
  isFetching: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch detailed Predict market information
 */
export const usePredictMarket = (
  options: UsePredictMarketOptions = {},
): UsePredictMarketResult => {
  const { id, providerId, enabled = true } = options;
  const [market, setMarket] = useState<PredictMarket | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isMountedRef = useRef(true);
  useEffect(
    () => () => {
      isMountedRef.current = false;
    },
    [],
  );

  useEffect(() => {
    if (!enabled && isMountedRef.current) {
      setMarket(null);
      setError(null);
      setIsFetching(false);
    }
  }, [enabled]);

  const fetchMarket = useCallback(async () => {
    if (!enabled) {
      return;
    }

    const marketId = id !== undefined && id !== null ? String(id) : '';
    if (!marketId) {
      if (isMountedRef.current) {
        setMarket(null);
        setError(null);
        setIsFetching(false);
      }
      return;
    }

    if (isMountedRef.current) {
      setIsFetching(true);
      setError(null);
    }

    try {
      if (!Engine || !Engine.context) {
        throw new Error('Engine not initialized');
      }

      const controller = Engine.context.PredictController;
      if (!controller) {
        throw new Error('Predict controller not available');
      }

      const marketData = await controller.getMarket({
        marketId,
        providerId,
      });

      if (isMountedRef.current) {
        setMarket(marketData ?? null);
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to fetch market';

      if (isMountedRef.current) {
        setError(errorMessage);
        setMarket(null);
      }
    } finally {
      if (isMountedRef.current) {
        setIsFetching(false);
      }
    }
  }, [enabled, id, providerId]);

  useEffect(() => {
    fetchMarket();
  }, [fetchMarket]);

  return {
    market,
    isFetching,
    error,
    refetch: fetchMarket,
  };
};

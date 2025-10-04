import { useCallback, useEffect, useRef, useState } from 'react';
import Engine from '../../../../core/Engine';
import { UnrealizedPnL } from '../types';

export interface UseUnrealizedPnLOptions {
  address?: string;
  providerId?: string;
  enabled?: boolean;
}

export interface UseUnrealizedPnLResult {
  unrealizedPnL: UnrealizedPnL | null;
  isFetching: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch unrealized P&L information
 */
export const useUnrealizedPnL = (
  options: UseUnrealizedPnLOptions = {},
): UseUnrealizedPnLResult => {
  const { address, providerId, enabled = true } = options;
  const [unrealizedPnL, setUnrealizedPnL] = useState<UnrealizedPnL | null>(
    null,
  );
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
      setUnrealizedPnL(null);
      setError(null);
      setIsFetching(false);
    }
  }, [enabled]);

  const fetchUnrealizedPnL = useCallback(async () => {
    if (!enabled || !isMountedRef.current) {
      return;
    }

    setIsFetching(true);
    setError(null);

    try {
      if (!Engine || !Engine.context) {
        throw new Error('Engine not initialized');
      }

      const controller = Engine.context.PredictController;
      if (!controller) {
        throw new Error('Predict controller not available');
      }

      const unrealizedPnLData = await controller.getUnrealizedPnL({
        address,
        providerId,
      });

      if (isMountedRef.current) {
        setUnrealizedPnL(unrealizedPnLData ?? null);
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to fetch unrealized P&L';

      if (isMountedRef.current) {
        setError(errorMessage);
        setUnrealizedPnL(null);
      }
    } finally {
      if (isMountedRef.current) {
        setIsFetching(false);
      }
    }
  }, [enabled, address, providerId]);

  useEffect(() => {
    if (enabled) {
      fetchUnrealizedPnL();
    }
  }, [enabled, address, providerId, fetchUnrealizedPnL]);

  return {
    unrealizedPnL,
    isFetching,
    error,
    refetch: fetchUnrealizedPnL,
  };
};

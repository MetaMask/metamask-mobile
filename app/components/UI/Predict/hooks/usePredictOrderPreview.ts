import { useCallback, useEffect, useRef, useState } from 'react';
import { OrderPreview, PreviewOrderParams } from '../providers/types';
import { usePredictTrading } from './usePredictTrading';

interface OrderPreviewResult {
  preview?: OrderPreview | null;
  isCalculating: boolean;
  error: string | null;
}

export function usePredictOrderPreview(
  params: PreviewOrderParams & { autoRefreshTimeout?: number },
): OrderPreviewResult {
  const [preview, setPreview] = useState<OrderPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCalculating, setIsCalculating] = useState<boolean>(false);

  const currentOperationRef = useRef<number>(0);
  const isMountedRef = useRef<boolean>(true);

  const { previewOrder } = usePredictTrading();

  // Destructure params for stable dependencies
  const {
    providerId,
    marketId,
    outcomeId,
    outcomeTokenId,
    side,
    size,
    autoRefreshTimeout,
  } = params;

  const calculatePreview = useCallback(async () => {
    const operationId = ++currentOperationRef.current;

    if (!isMountedRef.current) return;

    if (!size || size <= 0) {
      if (operationId === currentOperationRef.current) {
        setPreview(null);
        setIsCalculating(false);
      }
      return;
    }

    setIsCalculating(true);

    try {
      const p = await previewOrder({
        providerId,
        marketId,
        outcomeId,
        outcomeTokenId,
        side,
        size,
      });
      if (operationId === currentOperationRef.current && isMountedRef.current) {
        setPreview(p);
        setError(null);
      }
    } catch (err) {
      console.error('Failed to preview order:', err);
      if (operationId === currentOperationRef.current && isMountedRef.current) {
        setError(err instanceof Error ? err.message : String(err));
      }
    } finally {
      if (operationId === currentOperationRef.current && isMountedRef.current) {
        setIsCalculating(false);
      }
    }
  }, [
    size,
    previewOrder,
    providerId,
    marketId,
    outcomeId,
    outcomeTokenId,
    side,
  ]);

  const calculatePreviewRef = useRef(calculatePreview);
  calculatePreviewRef.current = calculatePreview;

  useEffect(
    () => () => {
      isMountedRef.current = false;
    },
    [],
  );

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      calculatePreviewRef.current();
    }, 100);

    return () => clearTimeout(debounceTimer);
  }, [providerId, marketId, outcomeId, outcomeTokenId, side, size]);

  useEffect(() => {
    if (!autoRefreshTimeout) return undefined;

    const refreshTimer = setInterval(() => {
      calculatePreviewRef.current();
    }, autoRefreshTimeout);

    return () => clearInterval(refreshTimer);
  }, [
    providerId,
    marketId,
    outcomeId,
    outcomeTokenId,
    side,
    size,
    autoRefreshTimeout,
  ]);

  return {
    preview,
    isCalculating,
    error,
  };
}

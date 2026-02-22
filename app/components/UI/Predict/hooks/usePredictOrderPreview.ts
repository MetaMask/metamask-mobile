import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Logger from '../../../../util/Logger';
import { OrderPreview, PreviewOrderParams } from '../providers/types';
import { usePredictTrading } from './usePredictTrading';
import { ensureError, parseErrorMessage } from '../utils/predictErrorHandler';
import { PREDICT_CONSTANTS, PREDICT_ERROR_CODES } from '../constants/errors';

interface OrderPreviewResult {
  preview?: OrderPreview | null;
  isCalculating: boolean;
  isLoading: boolean;
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
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);

  const { previewOrder } = usePredictTrading();

  const isLoading = useMemo(() => preview === null && !error, [preview, error]);

  // Destructure params for stable dependencies
  const {
    providerId,
    marketId,
    outcomeId,
    outcomeTokenId,
    side,
    size,
    autoRefreshTimeout,
    positionId,
  } = params;

  // Define ref before using it in scheduleNextRefresh
  const calculatePreviewRef = useRef<(() => Promise<void>) | null>(null);

  const scheduleNextRefresh = useCallback(() => {
    if (!autoRefreshTimeout || !isMountedRef.current) return;

    // Clear any existing timer
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
    }

    // Schedule next refresh after the timeout
    refreshTimerRef.current = setTimeout(() => {
      calculatePreviewRef.current?.();
    }, autoRefreshTimeout);
  }, [autoRefreshTimeout]);

  const scheduleNextRefreshRef = useRef(scheduleNextRefresh);
  scheduleNextRefreshRef.current = scheduleNextRefresh;

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
        positionId,
      });
      if (operationId === currentOperationRef.current && isMountedRef.current) {
        setPreview(p);
        setError(null);
        // Schedule next refresh after successful response
        scheduleNextRefreshRef.current();
      }
    } catch (err) {
      console.error('Failed to preview order:', err);

      // Log error with order preview context (no sensitive amounts)
      Logger.error(ensureError(err), {
        tags: {
          feature: PREDICT_CONSTANTS.FEATURE_NAME,
          component: 'usePredictOrderPreview',
        },
        context: {
          name: 'usePredictOrderPreview',
          data: {
            method: 'calculatePreview',
            action: 'order_preview',
            operation: 'order_management',
            providerId,
            side,
            marketId,
            outcomeId,
          },
        },
      });

      if (operationId === currentOperationRef.current && isMountedRef.current) {
        const parsedErrorMessage = parseErrorMessage({
          error: err,
          defaultCode: PREDICT_ERROR_CODES.PREVIEW_FAILED,
        });
        setError(parsedErrorMessage);
        // Schedule next refresh after error response
        scheduleNextRefreshRef.current();
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
    positionId,
  ]);

  calculatePreviewRef.current = calculatePreview;

  useEffect(
    () => () => {
      isMountedRef.current = false;
      // Clear refresh timer on unmount
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    // Clear any pending refresh timer when parameters change
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }

    const debounceTimer = setTimeout(() => {
      calculatePreviewRef.current?.();
    }, 100);

    return () => clearTimeout(debounceTimer);
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
    isLoading,
    isCalculating,
    error,
  };
}

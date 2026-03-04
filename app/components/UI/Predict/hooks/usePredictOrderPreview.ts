import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { OrderPreview, PreviewOrderParams } from '../types';
import { predictQueries } from '../queries';

interface OrderPreviewResult {
  preview?: OrderPreview | null;
  isCalculating: boolean;
  isLoading: boolean;
  error: string | null;
}

/**
 * Wraps useQuery with debounced params and custom loading semantics.
 * Debouncing prevents excessive API calls during rapid input; custom
 * isLoading/isCalculating flags are used by all 3 consumers for skeleton/inline states.
 */
export function usePredictOrderPreview(
  params: PreviewOrderParams & { autoRefreshTimeout?: number },
): OrderPreviewResult {
  const {
    marketId,
    outcomeId,
    outcomeTokenId,
    side,
    size,
    autoRefreshTimeout,
    positionId,
  } = params;

  // Debounce param changes by 100ms to avoid rapid recalculations
  const [debouncedParams, setDebouncedParams] = useState({
    marketId,
    outcomeId,
    outcomeTokenId,
    side,
    size,
    positionId,
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedParams({
        marketId,
        outcomeId,
        outcomeTokenId,
        side,
        size,
        positionId,
      });
    }, 100);
    return () => clearTimeout(timer);
  }, [marketId, outcomeId, outcomeTokenId, side, size, positionId]);

  const hasValidSize = !!debouncedParams.size && debouncedParams.size > 0;

  const query = useQuery({
    ...predictQueries.orderPreview.options(debouncedParams),
    enabled: hasValidSize,
    refetchInterval:
      hasValidSize && autoRefreshTimeout ? autoRefreshTimeout : false,
  });

  const preview = query.data ?? null;
  const error = query.error?.message ?? null;
  const isLoading = preview === null && !error;
  const isCalculating = query.isFetching;

  return {
    preview,
    isLoading,
    isCalculating,
    error,
  };
}

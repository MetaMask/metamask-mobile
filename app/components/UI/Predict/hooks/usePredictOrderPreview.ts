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
 * This hook wraps useQuery rather than returning the raw query result because
 * the debouncing and custom loading logic are tightly coupled to the query.
 *
 * Debouncing (100ms): Query params like `size` change rapidly during user
 * input (e.g., keypad in PredictBuyPreview). The debounce prevents excessive
 * API calls. Moving this to consumers would duplicate the same debounce logic
 * across all 3 call sites (PredictBuyPreview, PredictSellPreview,
 * PredictPositionDetail).
 *
 * Custom `isLoading`: Represents "no preview data yet" (preview === null
 * && !error), which differs from React Query's `isLoading` (first fetch in
 * progress). Consumers use this to show skeleton placeholders, and the
 * semantic distinction matters when the query is disabled (size === 0).
 *
 * `isCalculating`: Maps to `isFetching` for showing inline loading
 * indicators during refetches without hiding already-displayed data.
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

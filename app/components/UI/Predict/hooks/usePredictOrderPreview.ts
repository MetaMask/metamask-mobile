import { useCallback, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { OrderPreview, PreviewOrderParams } from '../types';
import { predictQueries } from '../queries';
import { parseErrorMessage, ensureError } from '../utils/predictErrorHandler';
import { PREDICT_ERROR_CODES, PREDICT_CONSTANTS } from '../constants/errors';
import Logger from '../../../../util/Logger';

interface OrderPreviewResult {
  preview?: OrderPreview | null;
  isCalculating: boolean;
  isLoading: boolean;
  error: string | null;
  /** Re-fetches the live book and resolves with the fresh preview, or null when the fetch fails. */
  refetchPreview: () => Promise<OrderPreview | null>;
}

/**
 * Wraps useQuery with debounced params and custom loading semantics.
 * Debouncing prevents excessive API calls during rapid input; custom
 * isLoading/isCalculating flags are used by all 3 consumers for skeleton/inline states.
 */
export function usePredictOrderPreview(
  params: PreviewOrderParams & {
    autoRefreshTimeout?: number;
  },
): OrderPreviewResult {
  // Destructure params for stable dependencies
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

  const [stickyError, setStickyError] = useState<string | null>(null);

  const preview = hasValidSize ? (query.data ?? null) : null;
  const parsedError = query.error
    ? parseErrorMessage({
        error: query.error,
        defaultCode: PREDICT_ERROR_CODES.PREVIEW_FAILED,
      })
    : null;
  const isLoading = preview === null && !parsedError && !stickyError;
  const isCalculating = query.isFetching;

  useEffect(() => {
    if (parsedError) {
      setStickyError(parsedError);
    } else if (query.isSuccess) {
      setStickyError(null);
    }
  }, [parsedError, query.isSuccess]);

  useEffect(() => {
    setStickyError(null);
  }, [debouncedParams.size]);

  useEffect(() => {
    if (!query.error) return;

    Logger.error(ensureError(query.error), {
      tags: {
        feature: PREDICT_CONSTANTS.FEATURE_NAME,
        component: 'usePredictOrderPreview',
      },
      context: {
        name: 'usePredictOrderPreview',
        data: {
          method: 'previewOrder',
          action: 'order_preview',
          operation: 'order_management',
          side: debouncedParams.side,
          marketId: debouncedParams.marketId,
          outcomeId: debouncedParams.outcomeId,
        },
      },
    });
  }, [
    query.error,
    debouncedParams.side,
    debouncedParams.marketId,
    debouncedParams.outcomeId,
  ]);

  const { refetch } = query;

  /**
   * Explicitly re-fetches the live book and resolves with the fresh preview.
   * Used by the retry flow to confirm a fresh quote before re-submitting an
   * order. Resolves null when the re-fetch fails — a failed fetch keeps the
   * previous data on the query result, which must never be mistaken for a
   * fresh quote.
   */
  const refetchPreview = useCallback(async (): Promise<OrderPreview | null> => {
    const result = await refetch();
    if (result.isError) {
      return null;
    }
    return result.data ?? null;
  }, [refetch]);

  return {
    preview,
    isLoading,
    isCalculating,
    error: stickyError,
    refetchPreview,
  };
}

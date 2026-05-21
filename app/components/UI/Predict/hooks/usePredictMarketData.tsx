/* eslint-disable react/prop-types */

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useState,
  useRef,
} from 'react';
import Engine from '../../../../core/Engine';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import Logger from '../../../../util/Logger';
import { PREDICT_CONSTANTS } from '../constants/errors';
import { ensureError } from '../utils/predictErrorHandler';
import { PredictCategory, PredictMarket } from '../types';
import { filterStandaloneMarkets } from '../utils/feed';
import { getVisiblePredictMarkets } from '../utils/marketStaleness';

export interface UsePredictMarketDataOptions {
  category?: PredictCategory;
  pageSize?: number;
  customQueryParams?: string;
  refine?: (markets: PredictMarket[]) => PredictMarket[];
  /** When false, skips fetches (e.g. Predict feature off while section stays mounted). */
  enabled?: boolean;
}

export interface UsePredictMarketDataResult {
  marketData: PredictMarket[];
  isFetching: boolean;
  isFetchingMore: boolean;
  error: string | null;
  hasMore: boolean;
  refetch: () => Promise<void>;
  fetchMore: () => Promise<void>;
}

/**
 * Hook to fetch and manage market data for a specific category with infinite scroll
 * @returns Market data, loading states, and pagination controls
 */
export const usePredictMarketData = (
  options: UsePredictMarketDataOptions = {},
): UsePredictMarketDataResult => {
  const {
    category = 'trending',
    pageSize = 20,
    customQueryParams,
    refine,
    enabled = true,
  } = options;
  const [marketData, setMarketData] = useState<PredictMarket[]>([]);
  const [isLoading, setIsLoading] = useState(enabled);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const nextCursorRef = useRef<string | null>(null);
  const prevEnabledRef = useRef(enabled);

  /**
   * When `enabled` goes from false → true (e.g. All Sports pill), avoid one painted frame
   * with empty data and `isFetching` still false from the disabled path before `useEffect` fetch runs.
   */
  useLayoutEffect(() => {
    if (enabled && !prevEnabledRef.current) {
      setIsLoading(true);
    }
    prevEnabledRef.current = enabled;
  }, [enabled]);

  const fetchMarketData = useCallback(
    async (isLoadMore = false) => {
      if (!enabled) {
        setIsLoading(false);
        setIsLoadingMore(false);
        if (!isLoadMore) {
          setMarketData([]);
        }
        return;
      }
      try {
        if (isLoadMore) {
          setIsLoadingMore(true);
        } else {
          setIsLoading(true);
          nextCursorRef.current = null;
        }
        setError(null);

        const afterCursor = isLoadMore ? nextCursorRef.current : null;

        if (isLoadMore && !afterCursor) {
          setHasMore(false);
          return;
        }

        DevLogger.log(
          'Fetching market data for category:',
          category,
          'hasAfterCursor:',
          Boolean(afterCursor),
          'limit:',
          pageSize,
        );

        let retryCount = 0;
        const maxRetries = 3;
        const baseDelay = 1000;

        while (retryCount < maxRetries) {
          try {
            if (!Engine || !Engine.context) {
              throw new Error('Engine not initialized');
            }

            const controller = Engine.context.PredictController;
            if (!controller) {
              throw new Error('Predict controller not available');
            }

            const { markets, nextCursor } = await controller.getMarkets({
              category,
              limit: pageSize,
              afterCursor,
              customQueryParams,
            });
            if (!markets || !Array.isArray(markets)) {
              if (isLoadMore) {
                setHasMore(false);
              } else {
                setMarketData([]);
              }
              nextCursorRef.current = null;
              return;
            }

            DevLogger.log('Market data received:', {
              marketCount: markets.length,
              hasNextCursor: Boolean(nextCursor),
            });

            nextCursorRef.current = nextCursor;
            setHasMore(Boolean(nextCursor));
            const visibleMarkets = getVisiblePredictMarkets(
              filterStandaloneMarkets(markets),
            );

            if (isLoadMore) {
              setMarketData((prevData) => {
                // Use a Set to efficiently deduplicate by ID
                const existingIds = new Set(prevData.map((event) => event.id));
                const newEvents = visibleMarkets.filter(
                  (event) => !existingIds.has(event.id),
                );
                const accumulated = [...prevData, ...newEvents];
                return refine ? refine(accumulated) : accumulated;
              });
            } else {
              // Replace data for initial load or refresh
              setMarketData(refine ? refine(visibleMarkets) : visibleMarkets);
            }

            // Success - break out of retry loop
            break;
          } catch (engineError) {
            retryCount++;
            if (retryCount >= maxRetries) {
              throw engineError;
            }

            // Exponential backoff with jitter
            const delay =
              baseDelay * Math.pow(2, retryCount - 1) + Math.random() * 1000;
            DevLogger.log(
              `Engine not ready, retrying in ${Math.round(
                delay,
              )}ms (attempt ${retryCount}/${maxRetries})`,
            );
            await new Promise((resolve) => setTimeout(resolve, delay));
          }
        }
      } catch (err) {
        DevLogger.log('Error fetching market data:', err);
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to fetch market data';
        setError(errorMessage);

        // Capture exception with market data loading context
        Logger.error(ensureError(err), {
          tags: {
            feature: PREDICT_CONSTANTS.FEATURE_NAME,
            component: 'usePredictMarketData',
          },
          context: {
            name: 'usePredictMarketData',
            data: {
              method: 'loadMarketData',
              action: 'market_data_load',
              operation: 'data_fetching',
              category,
              hasAfterCursor: Boolean(nextCursorRef.current),
              pageSize,
              isLoadMore,
            },
          },
        });

        if (!isLoadMore) {
          setMarketData([]);
        }
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [category, pageSize, customQueryParams, refine, enabled],
  );

  const loadMore = useCallback(async () => {
    if (!enabled || isLoadingMore || !hasMore) return;
    await fetchMarketData(true);
  }, [enabled, fetchMarketData, isLoadingMore, hasMore]);

  const refetch = useCallback(async () => {
    if (!enabled) return;
    await fetchMarketData(false);
  }, [enabled, fetchMarketData]);

  // Reset pagination when category or custom query params change
  useEffect(() => {
    nextCursorRef.current = null;
    setHasMore(true);
    setMarketData([]);
    if (!enabled) {
      setIsLoading(false);
      setIsLoadingMore(false);
      setError(null);
      return;
    }
    fetchMarketData(false);
  }, [category, customQueryParams, fetchMarketData, enabled]);

  return {
    marketData,
    isFetching: isLoading,
    isFetchingMore: isLoadingMore,
    error,
    hasMore,
    refetch,
    fetchMore: loadMore,
  };
};

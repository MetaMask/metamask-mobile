/* eslint-disable react/prop-types */

import { useCallback, useEffect, useState, useRef } from 'react';
import Engine from '../../../../core/Engine';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import { MarketCategory, PredictEvent } from '../types';

export interface UsePredictMarketDataOptions {
  category?: MarketCategory;
  pageSize?: number;
}

export interface UsePredictMarketDataResult {
  marketData: PredictEvent[];
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
  const { category = 'trending', pageSize = 20 } = options;
  const [marketData, setMarketData] = useState<PredictEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [currentOffset, setCurrentOffset] = useState(0);

  const currentCategoryRef = useRef(category);
  const currentOffsetRef = useRef(currentOffset);

  useEffect(() => {
    currentCategoryRef.current = category;
  }, [category]);

  useEffect(() => {
    currentOffsetRef.current = currentOffset;
  }, [currentOffset]);

  const fetchMarketData = useCallback(
    async (isLoadMore = false) => {
      try {
        if (isLoadMore) {
          setIsLoadingMore(true);
        } else {
          setIsLoading(true);
          setCurrentOffset(0);
          currentOffsetRef.current = 0;
        }
        setError(null);

        const offset = isLoadMore ? currentOffsetRef.current : 0;

        DevLogger.log(
          'Fetching market data for category:',
          category,
          'offset:',
          offset,
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

            await controller.initializeProviders();
            const markets = await controller.getEvents({
              category,
              limit: pageSize,
              offset,
            });
            DevLogger.log('Market data received:', markets);

            if (!markets || !Array.isArray(markets)) {
              if (isLoadMore) {
                setHasMore(false);
              } else {
                setMarketData([]);
              }
              return;
            }

            const hasMoreData = markets.length === pageSize;
            setHasMore(hasMoreData);

            if (isLoadMore) {
              setMarketData((prevData) => {
                // Use a Map to efficiently deduplicate by ID
                const existingIds = new Set(prevData.map((event) => event.id));
                const newEvents = markets.filter(
                  (event) => !existingIds.has(event.id),
                );
                return [...prevData, ...newEvents];
              });
              setCurrentOffset((prev) => prev + pageSize);
              currentOffsetRef.current += pageSize;
            } else {
              // Replace data for initial load or refresh
              setMarketData(markets);
              setCurrentOffset(pageSize);
              currentOffsetRef.current = pageSize;
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

        if (!isLoadMore) {
          setMarketData([]);
        }
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [category, pageSize],
  );

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;
    await fetchMarketData(true);
  }, [fetchMarketData, isLoadingMore, hasMore]);

  const refetch = useCallback(async () => {
    await fetchMarketData(false);
  }, [fetchMarketData]);

  // Reset pagination when category changes
  useEffect(() => {
    setCurrentOffset(0);
    currentOffsetRef.current = 0;
    setHasMore(true);
    setMarketData([]);
    fetchMarketData(false);
  }, [category, fetchMarketData]);

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

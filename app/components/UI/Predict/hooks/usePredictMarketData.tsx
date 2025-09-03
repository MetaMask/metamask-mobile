/* eslint-disable react/prop-types */

import { useCallback, useEffect, useState } from 'react';
import type { MarketCategory, PredictEvent } from '../types';
import Engine from '../../../../core/Engine';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';

export interface UsePredictMarketDataOptions {
  category?: MarketCategory;
}

/**
 * Hook to fetch and manage market data for a specific category
 * @returns Market data, loading state, and error state
 */
export const usePredictMarketData = (
  options: UsePredictMarketDataOptions = {},
) => {
  const { category = 'trending' } = options;
  const [marketData, setMarketData] = useState<PredictEvent[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMarketData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      DevLogger.log('Fetching market data for category:', category);
      const controller = Engine.context.PredictController;
      await controller.initializeProviders();
      const markets = await controller.getEvents({ category });
      DevLogger.log('Market data received:', markets);

      if (!markets) {
        setMarketData(null);
      } else {
        setMarketData(markets);
      }
    } catch (err) {
      DevLogger.log('Error fetching market data:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to fetch market data',
      );
      setMarketData(null);
    } finally {
      setIsLoading(false);
    }
  }, [category]);

  useEffect(() => {
    fetchMarketData();
  }, [fetchMarketData]);

  return {
    marketData,
    isLoading,
    error,
    refetch: fetchMarketData,
  };
};

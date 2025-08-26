/* eslint-disable react/prop-types */

import { useCallback, useEffect, useState } from 'react';
import type { Market } from '../types';
import Engine from '../../../../core/Engine';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';

/**
 * Hook to fetch and manage market data for a specific asset
 * @returns Market data, loading state, and error state
 */
export const usePredictMarketData = () => {
  const [marketData, setMarketData] = useState<Market[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMarketData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      DevLogger.log('Fetching market data');
      const controller = Engine.context.PredictController;
      await controller.initializeProviders();
      const markets = await controller.getMarkets();
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
  }, []);

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

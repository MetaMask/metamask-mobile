import { useCallback, useEffect, useState } from 'react';
import type { MarketInfo } from '../controllers/types';
import { usePerpsTrading } from './usePerpsTrading';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';

/**
 * Hook to fetch and manage market data for a specific asset
 * @param asset - The asset symbol to fetch market data for
 * @returns Market data, loading state, and error state
 */
export const usePerpsMarketData = (asset: string) => {
  const { getMarkets } = usePerpsTrading();
  const [marketData, setMarketData] = useState<MarketInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMarketData = useCallback(async () => {
    if (!asset) {
      setMarketData(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const markets = await getMarkets({ symbols: [asset] });
      const assetMarket = markets.find((market) => market.name === asset);

      if (!assetMarket) {
        setError(`Asset ${asset} is not tradable`);
        setMarketData(null);
      } else {
        setMarketData(assetMarket);
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
  }, [getMarkets, asset]);

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

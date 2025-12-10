import { useCallback, useEffect, useState } from 'react';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';
import type { MarketInfo } from '../controllers/types';
import usePerpsToasts from './usePerpsToasts';
import { usePerpsTrading } from './usePerpsTrading';

export interface UsePerpsMarketDataParams {
  /** Asset symbol to fetch market data for */
  asset: string;
  /** Whether to show error toast notifications (default: false) */
  showErrorToast?: boolean;
}

/**
 * Hook to fetch and manage market data for a specific asset
 * @param params - Asset symbol (string) or configuration object
 * @returns Market data, loading state, and error state
 *
 * @example
 * // Simple usage (legacy, no toast)
 * const { marketData, isLoading, error } = usePerpsMarketData('BTC');
 *
 * @example
 * // With error toast notifications
 * const { marketData, isLoading, error } = usePerpsMarketData({
 *   asset: 'BTC',
 *   showErrorToast: true,
 * });
 */
export const usePerpsMarketData = (
  params: string | UsePerpsMarketDataParams,
) => {
  // Support both legacy string and new object params
  const asset = typeof params === 'string' ? params : params.asset;
  const showErrorToast =
    typeof params === 'string' ? false : (params.showErrorToast ?? false);
  const { getMarkets } = usePerpsTrading();
  const [marketData, setMarketData] = useState<MarketInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Always call hook (Rules of Hooks requirement)
  const { showToast, PerpsToastOptions } = usePerpsToasts();

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

      if (assetMarket === undefined) {
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

  // Show error toast if enabled (only for persistent failures, not initial load)
  useEffect(() => {
    if (showErrorToast && error && !isLoading) {
      showToast(
        PerpsToastOptions.dataFetching.market.error.marketDataUnavailable(
          asset,
        ),
      );
    }
  }, [showErrorToast, error, isLoading, asset, showToast, PerpsToastOptions]);

  return {
    marketData,
    isLoading,
    error,
    refetch: fetchMarketData,
  };
};

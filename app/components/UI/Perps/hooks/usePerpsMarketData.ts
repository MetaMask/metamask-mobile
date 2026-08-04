import { useCallback, useEffect, useState } from 'react';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';
import { type MarketInfo, wait } from '@metamask/perps-controller';
import { MARKET_DATA_FETCH_RETRY_CONFIG } from '../constants/perpsConfig';
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
  // Distinguishes "the market list says this asset is not tradable" from "the
  // market list could not be fetched". Only the former may be shown to the
  // user as a tradability verdict.
  const [isAssetUntradable, setIsAssetUntradable] = useState(false);

  // Always call hook (Rules of Hooks requirement)
  const { showToast, PerpsToastOptions } = usePerpsToasts();

  const fetchMarketData = useCallback(async () => {
    if (!asset) {
      setMarketData(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    // `getMarkets` throws while the Perps connection is still initialising —
    // after unlocking, or during a reconnect. That says nothing about whether
    // the asset is tradable, so retry across the initialisation window rather
    // than reporting a failure the user cannot act on (TAT-3645).
    for (
      let attempt = 0;
      attempt <= MARKET_DATA_FETCH_RETRY_CONFIG.MaxRetries;
      attempt++
    ) {
      try {
        const markets = await getMarkets({ symbols: [asset] });
        const assetMarket = markets.find((market) => market.name === asset);

        // The market list came back, so its contents are a real verdict on
        // whether this asset can be traded.
        setIsAssetUntradable(assetMarket === undefined);
        setError(
          assetMarket === undefined ? `Asset ${asset} is not tradable` : null,
        );
        setMarketData(assetMarket ?? null);
        setIsLoading(false);
        return;
      } catch (err) {
        if (attempt < MARKET_DATA_FETCH_RETRY_CONFIG.MaxRetries) {
          await wait(MARKET_DATA_FETCH_RETRY_CONFIG.RetryDelayMs);
          continue;
        }

        DevLogger.log('Error fetching market data:', err);
        // Never a tradability verdict: the market list was never retrieved.
        setIsAssetUntradable(false);
        setError(
          err instanceof Error ? err.message : 'Failed to fetch market data',
        );
        setMarketData(null);
        setIsLoading(false);
      }
    }
  }, [getMarkets, asset]);

  useEffect(() => {
    fetchMarketData();
  }, [fetchMarketData]);

  // Show the "not tradable" toast only when the market list actually came back
  // without this asset. A failed fetch is transient and must not be reported as
  // a tradability verdict (TAT-3645).
  useEffect(() => {
    if (showErrorToast && isAssetUntradable && !isLoading) {
      showToast(
        PerpsToastOptions.dataFetching.market.error.marketDataUnavailable(
          asset,
        ),
      );
    }
  }, [
    showErrorToast,
    isAssetUntradable,
    isLoading,
    asset,
    showToast,
    PerpsToastOptions,
  ]);

  return {
    marketData,
    isLoading,
    error,
    refetch: fetchMarketData,
  };
};

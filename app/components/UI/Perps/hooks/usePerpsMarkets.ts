import { useState, useEffect, useCallback, useMemo } from 'react';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';
import Engine from '../../../../core/Engine';
import type { PerpsMarketData } from '../controllers/types';
import { useLivePrices } from './stream';

export interface UsePerpsMarketsResult {
  /**
   * Transformed market data ready for UI consumption
   */
  markets: PerpsMarketData[];
  /**
   * Loading state for initial data fetch
   */
  isLoading: boolean;
  /**
   * Error state with error message
   */
  error: string | null;
  /**
   * Refresh function to manually refetch data
   */
  refresh: () => Promise<void>;
  /**
   * Indicates if data is being refreshed
   */
  isRefreshing: boolean;
}

export interface UsePerpsMarketsOptions {
  /**
   * Enable automatic polling for live updates
   * @default false
   */
  enablePolling?: boolean;
  /**
   * Polling interval in milliseconds
   * @default 60000 (1 minute)
   */
  pollingInterval?: number;
  /**
   * Skip initial data fetch on mount
   * @default false
   */
  skipInitialFetch?: boolean;
  /**
   * Enable real-time price updates via WebSocket
   * @default false
   */
  enableLivePrices?: boolean;
  /**
   * Debounce interval for live price updates in milliseconds
   * @default 5000 (5 seconds)
   */
  livePriceDebounceMs?: number;
}

/**
 * Custom hook to fetch and manage Perps market data from the active provider
 * Uses the PerpsController to get data from the currently active protocol
 * (HyperLiquid, GMX, dYdX, etc.)
 */
export const usePerpsMarkets = (
  options: UsePerpsMarketsOptions = {},
): UsePerpsMarketsResult => {
  const {
    enablePolling = false,
    pollingInterval = 60000, // 1 minute default
    skipInitialFetch = false,
    enableLivePrices = false,
    livePriceDebounceMs = 5000, // 5 seconds default for market list
  } = options;

  const [markets, setMarkets] = useState<PerpsMarketData[]>([]);
  const [isLoading, setIsLoading] = useState(!skipInitialFetch);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Extract symbols from markets for live price subscription
  const marketSymbols = useMemo(
    () => markets.map((market) => market.symbol),
    [markets],
  );

  // Conditionally subscribe to live prices if enabled
  const livePrices = useLivePrices({
    symbols: enableLivePrices ? marketSymbols : [],
    throttleMs: livePriceDebounceMs,
  });

  const fetchMarketData = useCallback(
    async (isRefresh = false): Promise<void> => {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      try {
        DevLogger.log('Perps: Fetching market data from active provider...');

        // Get the active provider via PerpsController
        const controller = Engine.context.PerpsController;
        const provider = controller.getActiveProvider();

        // Get markets with price data directly from the provider
        const marketDataWithPrices = await provider.getMarketDataWithPrices();

        setMarkets(marketDataWithPrices);

        DevLogger.log(
          'Perps: Successfully fetched and transformed market data',
          {
            marketCount: marketDataWithPrices.length,
            livePricesEnabled: enableLivePrices,
            ...(enableLivePrices && { livePriceDebounceMs }),
          },
        );
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Unknown error occurred';
        setError(errorMessage);
        DevLogger.log('Perps: Failed to fetch market data', err);

        // Keep existing data on error to prevent UI flash
        setMarkets((currentMarkets) => {
          if (currentMarkets.length === 0) {
            return [];
          }
          return currentMarkets;
        });
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [enableLivePrices, livePriceDebounceMs],
  );

  const refresh = useCallback(
    (): Promise<void> => fetchMarketData(true),
    [fetchMarketData],
  );

  // Initial data fetch
  useEffect(() => {
    if (!skipInitialFetch) {
      fetchMarketData();
    }
  }, [fetchMarketData, skipInitialFetch]);

  // Polling effect
  useEffect(() => {
    if (!enablePolling) return;

    const intervalId = setInterval(() => {
      fetchMarketData(true);
    }, pollingInterval);

    return () => clearInterval(intervalId);
  }, [enablePolling, pollingInterval, fetchMarketData]);

  // Merge live prices into market data if live prices are enabled
  const marketsWithLivePrices = useMemo(() => {
    if (!enableLivePrices || Object.keys(livePrices).length === 0) {
      // Live prices not enabled or no live prices yet, return markets as-is
      return markets;
    }

    // Update market data with live prices
    return markets.map((market) => {
      const livePrice = livePrices[market.symbol];
      if (livePrice) {
        // Create updated market with live price data
        // Note: PerpsMarketData uses formatted strings, so we need to format the live prices
        const currentPrice = parseFloat(livePrice.price);
        const updatedMarket: PerpsMarketData = {
          ...market,
          // Update price with live data (formatted with consistent precision)
          // Match the original format: $50,000.00 (2 decimal places with commas)
          price: `$${currentPrice.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`,
        };

        // Update 24h change percentage if available
        if (livePrice.percentChange24h) {
          const changePercent = parseFloat(livePrice.percentChange24h);

          // Format change24hPercent WITH percentage sign (as per type definition comment)
          // This matches the format expected in PerpsMarketRowItem.test.tsx
          updatedMarket.change24hPercent = `${
            changePercent >= 0 ? '+' : ''
          }${changePercent.toFixed(2)}%`;

          // Calculate dollar change if we have both old and new price
          // This is approximate since we don't have the exact 24h ago price
          const priceChange =
            (currentPrice * changePercent) / (100 + changePercent);
          updatedMarket.change24h = `${priceChange >= 0 ? '+' : ''}$${Math.abs(
            priceChange,
          ).toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`;
        }

        // Update volume if available
        if (livePrice.volume24h) {
          // Format volume in millions/billions
          const volume = livePrice.volume24h;
          if (volume >= 1e9) {
            updatedMarket.volume = `$${(volume / 1e9).toFixed(1)}B`;
          } else if (volume >= 1e6) {
            updatedMarket.volume = `$${(volume / 1e6).toFixed(1)}M`;
          } else {
            updatedMarket.volume = `$${volume.toLocaleString()}`;
          }
        }

        return updatedMarket;
      }
      return market;
    });
  }, [markets, livePrices, enableLivePrices]);

  return {
    markets: enableLivePrices ? marketsWithLivePrices : markets,
    isLoading,
    error,
    refresh,
    isRefreshing,
  };
};

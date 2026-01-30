import { useCallback, useEffect, useMemo, useState } from 'react';
import Engine from '../../../../core/Engine';
import { CandlePeriod, TimeDuration } from '../constants/chartConfig';
import type { PriceUpdate } from '../controllers/types';
import {
  formatFundingRate,
  formatLargeNumber,
  formatPerpsFiat,
  LARGE_NUMBER_RANGES_DETAILED,
  PRICE_RANGES_UNIVERSAL,
} from '../utils/formatUtils';
import { calculate24hHighLow } from '../utils/marketUtils';
import { usePerpsLiveCandles } from './stream/usePerpsLiveCandles';

interface MarketStats {
  high24h: string;
  low24h: string;
  volume24h: string;
  openInterest: string;
  fundingRate: string;
  currentPrice?: number;
  isLoading: boolean;
}

interface MarketDataUpdate {
  funding?: number;
  openInterest?: number;
  volume24h?: number;
}

/**
 * Hook to fetch and manage comprehensive market statistics
 */
export interface UsePerpsMarketStatsReturn extends MarketStats {
  refresh: () => Promise<void>;
}

export const usePerpsMarketStats = (
  symbol: string,
): UsePerpsMarketStatsReturn => {
  const [marketData, setMarketData] = useState<MarketDataUpdate>({});
  const [initialPrice, setInitialPrice] = useState<number | undefined>();

  // Get candlestick data for 24h high/low calculation via WebSocket streaming
  const { candleData } = usePerpsLiveCandles({
    symbol,
    interval: CandlePeriod.ONE_HOUR, // Use 1h candles for 24h calculation
    duration: TimeDuration.ONE_DAY,
    throttleMs: 1000,
  });

  // Subscribe to market data updates (funding, open interest, volume)
  // Note: We still subscribe to prices but only extract market metadata, not price itself
  useEffect(() => {
    if (!symbol) return;

    let unsubscribe: (() => void) | undefined;
    const findSymbol = (update: PriceUpdate) => update.symbol === symbol;

    const callback = (updates: PriceUpdate[]) => {
      const update = updates.find(findSymbol);
      if (update) {
        // Only extract market data, ignore price changes to prevent re-renders
        setMarketData((prev) => {
          // Check if market data actually changed
          if (
            prev.funding === update.funding &&
            prev.openInterest === update.openInterest &&
            prev.volume24h === update.volume24h
          ) {
            return prev; // Return same reference if no change
          }

          return {
            funding: update.funding,
            openInterest: update.openInterest,
            volume24h: update.volume24h,
          };
        });

        // Store initial price only once for high/low calculation fallback
        if (!initialPrice && update.price) {
          setInitialPrice(Number.parseFloat(update.price));
        }
      }
    };

    const subscribeToMarketData = async () => {
      try {
        // Subscribe to enhanced price updates that include market data
        unsubscribe = Engine.context.PerpsController.subscribeToPrices({
          symbols: [symbol],
          includeMarketData: true,
          callback,
        });
      } catch (error) {
        console.error('Error subscribing to market data:', error);
      }
    };

    subscribeToMarketData();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [symbol, initialPrice]);

  // Calculate all statistics
  const stats = useMemo<MarketStats>(() => {
    const { high, low } = calculate24hHighLow(candleData);
    const fallbackPrice = initialPrice || 0;

    return {
      // 24h high/low from candlestick data, with fallback estimates (4 sig figs)
      high24h:
        high > 0
          ? formatPerpsFiat(high, { ranges: PRICE_RANGES_UNIVERSAL })
          : formatPerpsFiat(fallbackPrice, {
              ranges: PRICE_RANGES_UNIVERSAL,
            }),
      low24h:
        low > 0
          ? formatPerpsFiat(low, { ranges: PRICE_RANGES_UNIVERSAL })
          : formatPerpsFiat(fallbackPrice, {
              ranges: PRICE_RANGES_UNIVERSAL,
            }),
      volume24h: marketData.volume24h
        ? `$${formatLargeNumber(marketData.volume24h, {
            ranges: LARGE_NUMBER_RANGES_DETAILED,
          })}`
        : '$0.00',
      openInterest: marketData.openInterest
        ? `$${formatLargeNumber(marketData.openInterest, {
            ranges: LARGE_NUMBER_RANGES_DETAILED,
          })}`
        : '$0.00',
      fundingRate: formatFundingRate(marketData.funding),
      currentPrice: fallbackPrice,
      isLoading: !candleData,
    };
  }, [candleData, marketData, initialPrice]);

  // Refresh function - no-op since WebSocket provides real-time updates
  const refresh = useCallback(async () => {
    // WebSocket streaming automatically provides real-time updates
    // No manual refresh needed - data is always current
  }, []);

  // Memoize the final return object to prevent unnecessary re-renders
  return useMemo(
    () => ({
      ...stats,
      refresh,
    }),
    [stats, refresh],
  );
};

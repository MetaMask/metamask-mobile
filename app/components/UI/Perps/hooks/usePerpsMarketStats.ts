import { useEffect, useState, useMemo, useCallback } from 'react';
import Engine from '../../../../core/Engine';
import { usePerpsPositionData } from './usePerpsPositionData';
import type { PriceUpdate } from '../controllers/types';
import { formatPrice, formatLargeNumber } from '../utils/formatUtils';
import { calculate24hHighLow } from '../utils/marketUtils';
import { CandlePeriod, TimeDuration } from '../constants/chartConfig';

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

  // Get candlestick data for 24h high/low calculation
  const { candleData, refreshCandleData } = usePerpsPositionData({
    coin: symbol,
    selectedInterval: CandlePeriod.ONE_HOUR, // Use 1h candles for 24h calculation
    selectedDuration: TimeDuration.ONE_DAY,
  });

  // Subscribe to market data updates (funding, open interest, volume)
  // Note: We still subscribe to prices but only extract market metadata, not price itself
  useEffect(() => {
    if (!symbol) return;

    let unsubscribe: (() => void) | undefined;

    const subscribeToMarketData = async () => {
      try {
        // Subscribe to enhanced price updates that include market data
        unsubscribe = Engine.context.PerpsController.subscribeToPrices({
          symbols: [symbol],
          includeMarketData: true,
          callback: (updates: PriceUpdate[]) => {
            const update = updates.find((u) => u.coin === symbol);
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
                setInitialPrice(parseFloat(update.price));
              }
            }
          },
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
      // 24h high/low from candlestick data, with fallback estimates
      high24h:
        high > 0
          ? formatPrice(high, { minimumDecimals: 2, maximumDecimals: 2 })
          : formatPrice(fallbackPrice, {
              minimumDecimals: 2,
              maximumDecimals: 2,
            }),
      low24h:
        low > 0
          ? formatPrice(low, { minimumDecimals: 2, maximumDecimals: 2 })
          : formatPrice(fallbackPrice, {
              minimumDecimals: 2,
              maximumDecimals: 2,
            }),
      volume24h: marketData.volume24h
        ? `$${formatLargeNumber(marketData.volume24h)}`
        : '$0.00',
      openInterest: marketData.openInterest
        ? `$${formatLargeNumber(marketData.openInterest)}`
        : '$0.00',
      fundingRate: marketData.funding
        ? `${(marketData.funding * 100).toFixed(4)}%`
        : '0.0000%',
      currentPrice: fallbackPrice,
      isLoading: !candleData,
    };
  }, [candleData, marketData, initialPrice]);

  // Refresh function to reload market data
  const refresh = useCallback(async () => {
    // Refresh candle data for updated 24h high/low
    await refreshCandleData();
    // Market data (funding, volume, etc.) will update via WebSocket subscriptions
  }, [refreshCandleData]);

  return {
    ...stats,
    refresh,
  };
};

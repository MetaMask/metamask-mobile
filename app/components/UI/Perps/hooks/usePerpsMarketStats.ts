import { useEffect, useState, useMemo, useCallback } from 'react';
import Engine from '../../../../core/Engine';
import { usePerpsPositionData } from './usePerpsPositionData';
import type { PriceUpdate } from '../controllers/types';
import { formatPrice, formatLargeNumber } from '../utils/formatUtils';
import {
  calculateFundingCountdown,
  calculate24hHighLow,
} from '../utils/marketUtils';
import { CandlePeriod, TimeDuration } from '../constants/chartConfig';

interface MarketStats {
  high24h: string;
  low24h: string;
  volume24h: string;
  openInterest: string;
  fundingRate: string;
  fundingCountdown: string;
  currentPrice: number;
  priceChange24h: number;
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
  const [fundingCountdown, setFundingCountdown] = useState('00:00:00');
  const [currentPriceData, setCurrentPriceData] = useState<
    PriceUpdate | undefined
  >();

  // Get candlestick data for 24h high/low calculation
  const { candleData, refreshCandleData } = usePerpsPositionData({
    coin: symbol,
    selectedInterval: CandlePeriod.ONE_HOUR, // Use 1h candles for 24h calculation
    selectedDuration: TimeDuration.ONE_DAY,
  });

  // Subscribe to market data updates (funding, open interest, volume)
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
              // Set both price data and market data from the same update
              setCurrentPriceData(update);
              setMarketData({
                funding: update.funding,
                openInterest: update.openInterest,
                volume24h: update.volume24h,
              });
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
  }, [symbol]);

  // Update funding countdown every second
  useEffect(() => {
    const updateCountdown = () => {
      setFundingCountdown(calculateFundingCountdown());
    };

    updateCountdown(); // Initial update
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, []);

  // Calculate all statistics
  const stats = useMemo<MarketStats>(() => {
    const currentPrice = parseFloat(currentPriceData?.price || '0');
    const priceChange24h = parseFloat(
      currentPriceData?.percentChange24h || '0',
    );
    const { high, low } = calculate24hHighLow(candleData);

    return {
      // 24h high/low from candlestick data, with fallback estimates
      high24h: high > 0 ? formatPrice(high) : formatPrice(currentPrice),
      low24h: low > 0 ? formatPrice(low) : formatPrice(currentPrice),
      volume24h: marketData.volume24h
        ? formatLargeNumber(marketData.volume24h)
        : '$0.00',
      openInterest: marketData.openInterest
        ? formatLargeNumber(marketData.openInterest)
        : '$0.00',
      fundingRate: marketData.funding
        ? `${(marketData.funding * 100).toFixed(4)}%`
        : '0.0000%',
      fundingCountdown,
      currentPrice,
      priceChange24h,
      isLoading: !currentPriceData || !candleData,
    };
  }, [currentPriceData, candleData, marketData, fundingCountdown]);

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

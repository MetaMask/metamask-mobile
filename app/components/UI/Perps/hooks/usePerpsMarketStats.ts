import { useEffect, useState, useMemo } from 'react';
import Engine from '../../../../core/Engine';
import { usePerpsPrices } from './usePerpsPrices';
import { usePerpsPositionData } from './usePerpsPositionData';
import type { PriceUpdate } from '../controllers/types';
import type { CandleData, CandleStick } from '../types';
import { formatPrice, formatLargeNumber } from '../utils/formatUtils';

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
 * Calculate the time until the next funding period
 * HyperLiquid has 8-hour funding periods at 00:00, 08:00, and 16:00 UTC
 */
const calculateFundingCountdown = (): string => {
  const now = new Date();
  const utcHour = now.getUTCHours();
  const utcMinutes = now.getUTCMinutes();
  const utcSeconds = now.getUTCSeconds();

  // Determine next funding hour (0, 8, or 16)
  let nextFundingHour: number;
  if (utcHour < 8) {
    nextFundingHour = 8;
  } else if (utcHour < 16) {
    nextFundingHour = 16;
  } else {
    nextFundingHour = 24; // Next day at 00:00
  }

  // Calculate time until next funding
  const hoursUntil = nextFundingHour - utcHour - 1;
  const minutesUntil = 59 - utcMinutes;
  const secondsUntil = 59 - utcSeconds;

  // Handle case where we're at 16:xx and next is 00:00
  const adjustedHours = hoursUntil < 0 ? hoursUntil + 24 : hoursUntil;

  // Format as HH:MM:SS
  const hours = String(adjustedHours).padStart(2, '0');
  const minutes = String(minutesUntil).padStart(2, '0');
  const seconds = String(secondsUntil).padStart(2, '0');

  return `${hours}:${minutes}:${seconds}`;
};

/**
 * Calculate 24h high and low from candlestick data
 */
const calculate24hHighLow = (
  candleData: CandleData | null,
): { high: number; low: number } => {
  if (!candleData?.candles || candleData.candles.length === 0) {
    return { high: 0, low: 0 };
  }

  // Get candles from last 24 hours
  const now = Date.now();
  const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000;

  let last24hCandles = candleData.candles.filter(
    (candle: CandleStick) => candle.time >= twentyFourHoursAgo,
  );

  if (last24hCandles.length === 0) {
    // If no 24h data, use all available candles
    last24hCandles = [...candleData.candles];
  }

  const highs = last24hCandles.map((candle: CandleStick) =>
    parseFloat(candle.high),
  );
  const lows = last24hCandles.map((candle: CandleStick) =>
    parseFloat(candle.low),
  );

  return {
    high: Math.max(...highs),
    low: Math.min(...lows),
  };
};

/**
 * Hook to fetch and manage comprehensive market statistics
 */
export const usePerpsMarketStats = (symbol: string): MarketStats => {
  const [marketData, setMarketData] = useState<MarketDataUpdate>({});
  const [fundingCountdown, setFundingCountdown] = useState('00:00:00');

  // Get real-time price data
  const priceData = usePerpsPrices([symbol], true);
  const currentPriceData = priceData[symbol];

  // Get candlestick data for 24h high/low calculation
  const { candleData } = usePerpsPositionData({
    coin: symbol,
    selectedInterval: '1h', // Use 1h candles for 24h calculation
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
              // Extract market data from the update
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
      high24h: high > 0 ? formatPrice(high) : formatPrice(currentPrice * 1.02), // Fallback to estimate
      low24h: low > 0 ? formatPrice(low) : formatPrice(currentPrice * 0.98), // Fallback to estimate
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

  return stats;
};

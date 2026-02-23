import { useMemo, useState, useEffect } from 'react';
import { usePerpsMarketForAsset } from '../../Perps/hooks/usePerpsMarketForAsset';
import { usePerpsLiveCandles } from '../../Perps/hooks/stream/usePerpsLiveCandles';
import { CandlePeriod, TimeDuration } from '../../Perps/constants/chartConfig';
import PerpsConnectionManager from '../../Perps/services/PerpsConnectionManager';
import type {
  TokenPrice,
  TimePeriod,
} from '../../../hooks/useTokenHistoricalPrices';

/**
 * Maps spot chart time periods to appropriate perps candle intervals.
 * Goal: Show 50-100 candles for good chart density on mobile screens.
 */
const TIME_PERIOD_TO_CANDLE_CONFIG: Record<
  TimePeriod,
  { interval: CandlePeriod; duration: TimeDuration }
> = {
  '1d': {
    interval: CandlePeriod.FifteenMinutes,
    duration: TimeDuration.OneDay,
  }, // 96 candles
  '7d': { interval: CandlePeriod.TwoHours, duration: TimeDuration.OneWeek }, // 84 candles
  '1w': { interval: CandlePeriod.TwoHours, duration: TimeDuration.OneWeek }, // 84 candles
  '1m': { interval: CandlePeriod.EightHours, duration: TimeDuration.OneMonth }, // 90 candles
  '3m': { interval: CandlePeriod.OneDay, duration: TimeDuration.YearToDate }, // ~90 candles (3 months worth)
  '1y': { interval: CandlePeriod.OneWeek, duration: TimeDuration.Max }, // ~52 candles
  '3y': { interval: CandlePeriod.OneWeek, duration: TimeDuration.Max }, // Use max available
  all: { interval: CandlePeriod.OneWeek, duration: TimeDuration.Max }, // Use max available
};

export interface UsePerpsChartDataOptions {
  /** Token symbol (e.g., 'ETH', 'BTC') */
  symbol: string | undefined;
  /** Selected time period for the chart */
  timePeriod: TimePeriod;
  /** Whether perps data fetching is enabled */
  enabled?: boolean;
}

export interface UsePerpsChartDataResult {
  /** Whether a perps market exists for this token */
  hasPerpsMarket: boolean;
  /** Whether perps market check is loading */
  isMarketLoading: boolean;
  /** Price data in TokenPrice format for the chart */
  prices: TokenPrice[];
  /** Whether candle data is loading */
  isLoading: boolean;
  /** Current/latest price from perps data */
  currentPrice: number;
  /** Price difference from first to last candle */
  priceDiff: number;
  /** Compare price (first price in the range) */
  comparePrice: number;
  /** Whether this is real-time data (for UI indicator) */
  isRealtime: boolean;
  /** Error if any */
  error: Error | null;
}

/**
 * Hook that fetches and transforms perps candle data for use in the spot price chart.
 *
 * Features:
 * - Checks if token has a perps market using usePerpsMarketForAsset
 * - Fetches real-time candle data using usePerpsLiveCandles
 * - Transforms OHLCV candles to TokenPrice format (close prices)
 * - Maps spot chart time periods to appropriate perps intervals
 *
 */
export const usePerpsChartData = ({
  symbol,
  timePeriod,
  enabled = true,
}: UsePerpsChartDataOptions): UsePerpsChartDataResult => {
  // Check if perps WebSocket is connected
  // We poll this because connection state can change
  const [isPerpsConnected, setIsPerpsConnected] = useState(() => {
    const state = PerpsConnectionManager.getConnectionState();
    return state.isConnected && state.isInitialized;
  });

  // Check if token has a perps market (uses readOnly mode, doesn't need WebSocket)
  const {
    hasPerpsMarket: hasMarket,
    isLoading: isMarketLoading,
    error: marketError,
  } = usePerpsMarketForAsset(enabled ? symbol : undefined);

  // Trigger perps connection when we detect a perps market
  // This establishes the WebSocket connection in the background
  useEffect(() => {
    if (hasMarket && enabled) {
      const state = PerpsConnectionManager.getConnectionState();
      if (!state.isConnected && !state.isConnecting) {
        // Trigger connection in background (non-blocking)
        PerpsConnectionManager.connect().catch(() => {
          // Connection failed, will fall back to API data
        });
      }
    }
  }, [hasMarket, enabled]);

  useEffect(() => {
    // Poll connection state every 500ms
    const checkConnection = () => {
      const state = PerpsConnectionManager.getConnectionState();
      const connected = state.isConnected && state.isInitialized;
      setIsPerpsConnected(connected);
    };

    // Check immediately
    checkConnection();

    const interval = setInterval(checkConnection, 500);
    return () => clearInterval(interval);
  }, []);

  // Get candle configuration for the selected time period
  const candleConfig = TIME_PERIOD_TO_CANDLE_CONFIG[timePeriod] ?? {
    interval: CandlePeriod.OneHour,
    duration: TimeDuration.OneDay,
  };

  // Only fetch live candle data when:
  // 1. Perps WebSocket is connected
  // 2. Token has a perps market
  // 3. Feature is enabled
  const shouldFetchCandles = isPerpsConnected && hasMarket && enabled;

  // Fetch live candle data when perps market is available and connected
  const {
    candleData,
    isLoading: isCandlesLoading,
    error: candlesError,
  } = usePerpsLiveCandles({
    symbol: shouldFetchCandles ? (symbol?.toUpperCase() ?? '') : '',
    interval: candleConfig.interval,
    duration: candleConfig.duration,
    throttleMs: 1000,
  });

  // Transform candle data to TokenPrice format
  const { prices, currentPrice, priceDiff, comparePrice } = useMemo(() => {
    if (!candleData?.candles?.length) {
      return {
        prices: [] as TokenPrice[],
        currentPrice: 0,
        priceDiff: 0,
        comparePrice: 0,
      };
    }

    // Convert candles to TokenPrice format: [timestamp, close_price]
    const tokenPrices: TokenPrice[] = candleData.candles.map((candle) => [
      String(candle.time),
      parseFloat(candle.close),
    ]);

    // Calculate price metrics
    const firstPrice = tokenPrices.length > 0 ? tokenPrices[0][1] : 0;
    const lastPrice =
      tokenPrices.length > 0 ? tokenPrices[tokenPrices.length - 1][1] : 0;
    const diff = lastPrice - firstPrice;

    return {
      prices: tokenPrices,
      currentPrice: lastPrice,
      priceDiff: diff,
      comparePrice: firstPrice,
    };
  }, [candleData]);

  // Combine loading states
  // Only show loading if we're actually trying to fetch candles (perps connected)
  const isLoading = isMarketLoading || (shouldFetchCandles && isCandlesLoading);

  // Combine errors
  const error = marketError ? new Error(marketError) : candlesError;

  return {
    // Only report hasPerpsMarket if perps is actually connected and usable
    hasPerpsMarket: isPerpsConnected && hasMarket,
    isMarketLoading,
    prices,
    isLoading,
    currentPrice,
    priceDiff,
    comparePrice,
    isRealtime: isPerpsConnected && hasMarket && prices.length > 0,
    error,
  };
};

export default usePerpsChartData;

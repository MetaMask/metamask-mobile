import { useCallback, useEffect, useState, useMemo } from 'react';
import Engine from '../../../../core/Engine';
import type { PriceUpdate } from '../controllers/types';
import type { CandleData, CandleStick } from '../types';
import {
  calculateCandleCount,
  TimeDuration,
  CandlePeriod,
} from '../constants/chartConfig';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';

interface UsePerpsPositionDataProps {
  coin: string;
  selectedDuration: TimeDuration;
  selectedInterval: CandlePeriod;
}

export const usePerpsPositionData = ({
  coin,
  selectedDuration,
  selectedInterval,
}: UsePerpsPositionDataProps) => {
  const [candleData, setCandleData] = useState<CandleData | null>(null);
  const [priceData, setPriceData] = useState<PriceUpdate | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [liveCandle, setLiveCandle] = useState<CandleStick | null>(null);

  // Helper function to get the current candle's start time based on interval
  const getCurrentCandleStartTime = useCallback(
    (interval: CandlePeriod): number => {
      const now = Date.now();
      const intervalMs = (() => {
        switch (interval) {
          case CandlePeriod.ONE_MINUTE:
            return 60 * 1000;
          case CandlePeriod.THREE_MINUTES:
            return 3 * 60 * 1000;
          case CandlePeriod.FIVE_MINUTES:
            return 5 * 60 * 1000;
          case CandlePeriod.FIFTEEN_MINUTES:
            return 15 * 60 * 1000;
          case CandlePeriod.THIRTY_MINUTES:
            return 30 * 60 * 1000;
          case CandlePeriod.ONE_HOUR:
            return 60 * 60 * 1000;
          case CandlePeriod.TWO_HOURS:
            return 2 * 60 * 60 * 1000;
          case CandlePeriod.FOUR_HOURS:
            return 4 * 60 * 60 * 1000;
          default:
            return 60 * 60 * 1000;
        }
      })();

      // Round down to the nearest interval boundary
      return Math.floor(now / intervalMs) * intervalMs;
    },
    [],
  );

  const fetchHistoricalCandles = useCallback(async () => {
    const baseCandleCount = calculateCandleCount(
      selectedDuration,
      selectedInterval,
    );

    DevLogger.log(
      `Fetching ${baseCandleCount} candles for ${selectedDuration} with ${selectedInterval} period`,
    );

    const historicalData =
      await Engine.context.PerpsController.fetchHistoricalCandles(
        coin,
        selectedInterval,
        baseCandleCount,
      );

    return historicalData;
  }, [coin, selectedDuration, selectedInterval]);

  const subscribeToPriceUpdates = useCallback(() => {
    try {
      const unsubscribe = Engine.context.PerpsController.subscribeToPrices({
        symbols: [coin],
        callback: (priceUpdates) => {
          const update = priceUpdates.find((p) => p.coin === coin);
          if (update) {
            setPriceData(update);
          }
        },
      });
      return unsubscribe;
    } catch (err) {
      console.error('Error subscribing to price updates:', err);
      return () => {
        // Empty cleanup function on error
      };
    }
  }, [coin]);

  // Load historical candles
  useEffect(() => {
    setIsLoadingHistory(true);
    const loadHistoricalData = async () => {
      try {
        const historicalData = await fetchHistoricalCandles();
        setCandleData(historicalData);
      } catch (err) {
        console.error('Error loading historical candles:', err);
      } finally {
        setIsLoadingHistory(false);
      }
    };

    loadHistoricalData();
  }, [fetchHistoricalCandles]);

  // Subscribe to price updates for 24-hour data
  useEffect(() => {
    const unsubscribe = subscribeToPriceUpdates();

    return () => {
      unsubscribe();
    };
  }, [subscribeToPriceUpdates]);

  // Periodically refresh candle data to get new completed candles
  useEffect(() => {
    // Only set up refresh if we have initial data and not loading
    if (!candleData || isLoadingHistory) return;

    // Calculate refresh interval based on candle period
    const getRefreshInterval = (interval: CandlePeriod): number => {
      switch (interval) {
        case CandlePeriod.ONE_MINUTE:
          return 60 * 1000; // 1 minute
        case CandlePeriod.THREE_MINUTES:
          return 3 * 60 * 1000; // 3 minutes
        case CandlePeriod.FIVE_MINUTES:
          return 5 * 60 * 1000; // 5 minutes
        case CandlePeriod.FIFTEEN_MINUTES:
          return 15 * 60 * 1000; // 15 minutes
        case CandlePeriod.THIRTY_MINUTES:
          return 30 * 60 * 1000; // 30 minutes
        case CandlePeriod.ONE_HOUR:
          return 60 * 60 * 1000; // 1 hour
        case CandlePeriod.TWO_HOURS:
          return 2 * 60 * 60 * 1000; // 2 hours
        case CandlePeriod.FOUR_HOURS:
          return 4 * 60 * 60 * 1000; // 4 hours
        default:
          return 60 * 60 * 1000; // Default 1 hour
      }
    };

    const refreshInterval = getRefreshInterval(selectedInterval);
    DevLogger.log(
      `Setting up candle refresh every ${
        refreshInterval / 1000
      } seconds for ${selectedInterval}`,
    );

    const intervalId = setInterval(async () => {
      try {
        const newData = await fetchHistoricalCandles();
        if (newData && newData.candles.length > 0) {
          setCandleData(newData);
          DevLogger.log(
            `Refreshed candle data: ${newData.candles.length} candles`,
          );
        }
      } catch (error) {
        console.error('Error refreshing candle data:', error);
      }
    }, refreshInterval);

    return () => {
      clearInterval(intervalId);
      DevLogger.log('Cleared candle refresh interval');
    };
  }, [candleData, isLoadingHistory, selectedInterval, fetchHistoricalCandles]);

  // Build live candle from price updates
  useEffect(() => {
    if (!priceData?.price) return;

    const currentCandleTime = getCurrentCandleStartTime(selectedInterval);
    const currentPrice = parseFloat(priceData.price.toString());

    setLiveCandle((prevLive) => {
      // If no previous live candle or time period changed, create new one
      if (!prevLive || prevLive.time !== currentCandleTime) {
        return {
          time: currentCandleTime,
          open: currentPrice.toString(),
          high: currentPrice.toString(),
          low: currentPrice.toString(),
          close: currentPrice.toString(),
          volume: '0', // We don't have live volume
        };
      }

      // Update existing live candle with new price
      const prevHigh = parseFloat(prevLive.high);
      const prevLow = parseFloat(prevLive.low);

      return {
        ...prevLive,
        high: Math.max(prevHigh, currentPrice).toString(),
        low: Math.min(prevLow, currentPrice).toString(),
        close: currentPrice.toString(),
      };
    });
  }, [priceData, selectedInterval, getCurrentCandleStartTime]);

  // Merge historical candles with live candle for chart display
  const candleDataWithLive = useMemo(() => {
    if (!candleData || !liveCandle) return candleData;

    // Check if live candle already exists in historical data
    const existingCandleIndex = candleData.candles.findIndex(
      (candle) => candle.time === liveCandle.time,
    );

    const updatedCandles = [...candleData.candles];

    if (existingCandleIndex >= 0) {
      // Replace existing candle with live version
      updatedCandles[existingCandleIndex] = liveCandle;
    } else {
      // Add live candle to the end
      updatedCandles.push(liveCandle);
    }

    return {
      ...candleData,
      candles: updatedCandles,
    };
  }, [candleData, liveCandle]);

  const refreshCandleData = useCallback(async () => {
    setIsLoadingHistory(true);
    try {
      const historicalData = await fetchHistoricalCandles();
      setCandleData(historicalData);
    } catch (err) {
      console.error('Error refreshing candle data:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [fetchHistoricalCandles]);

  return {
    candleData: candleDataWithLive,
    priceData,
    isLoadingHistory,
    refreshCandleData,
  };
};

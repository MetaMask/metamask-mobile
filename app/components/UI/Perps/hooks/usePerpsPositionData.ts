import { isEqual } from 'lodash';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Engine from '../../../../core/Engine';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';
import {
  calculateCandleCount,
  CandlePeriod,
  TimeDuration,
} from '../constants/chartConfig';
import type { PriceUpdate } from '../controllers/types';
import type { CandleData } from '../types/perps-types';

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
  const prevMergedDataRef = useRef<CandleData | null>(null);

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
        setCandleData((prev) => {
          // Prevent re-render if data is identical
          if (isEqual(prev, historicalData)) {
            return prev;
          }
          return historicalData;
        });
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
          setCandleData((prev) => {
            // Prevent re-render if data is identical
            if (isEqual(prev, newData)) {
              return prev;
            }
            DevLogger.log(
              `Refreshed candle data: ${newData.candles.length} candles`,
            );
            return newData;
          });
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

  useEffect(() => {
    prevMergedDataRef.current = null;
  }, [selectedInterval]);

  const liveCandle = useMemo(() => {
    if (!priceData?.price || isLoadingHistory) return null;

    const currentPrice = Number.parseFloat(priceData.price.toString());
    const currentCandleTime = getCurrentCandleStartTime(selectedInterval);
    const existingCandles =
      prevMergedDataRef.current?.candles ?? candleData?.candles ?? [];
    const existingCandleIndex =
      existingCandles.findIndex(
        (candle) => candle.time === currentCandleTime,
      ) ?? -1;

    const existingLiveCandle =
      existingCandleIndex >= 0 ? existingCandles[existingCandleIndex] : null;

    if (!existingLiveCandle) {
      const existingCandlesLength = existingCandles.length;
      const previousCandle =
        existingCandlesLength > 0
          ? existingCandles[existingCandlesLength - 1]
          : null;
      const open = previousCandle
        ? previousCandle.close.toString()
        : currentPrice.toString();
      const close = currentPrice.toString();
      const high = currentPrice.toString();
      const low = currentPrice.toString();

      return {
        time: currentCandleTime,
        open,
        high,
        low,
        close,
        volume: '0',
      };
    }

    const close = currentPrice.toString();
    const high = Math.max(
      currentPrice,
      Number.parseFloat(existingLiveCandle.high),
    ).toString();
    const low = Math.min(
      currentPrice,
      Number.parseFloat(existingLiveCandle.low),
    ).toString();

    const newLiveCandle = {
      ...existingLiveCandle,
      time: currentCandleTime,
      close,
      high,
      low,
    };

    return newLiveCandle;
  }, [
    priceData,
    selectedInterval,
    getCurrentCandleStartTime,
    isLoadingHistory,
    prevMergedDataRef,
    candleData,
  ]);

  // Merge historical candles with live candle for chart display
  const candleDataWithLive = useMemo(() => {
    if (!candleData || !liveCandle) return candleData;

    // Check if live candle already exists in historical data
    const existingCandles =
      prevMergedDataRef.current?.candles ?? candleData.candles;
    const existingCandleIndex = existingCandles.findIndex(
      (candle) => candle.time === liveCandle.time,
    );

    const updatedCandles = [...existingCandles];

    if (existingCandleIndex >= 0) {
      // Replace existing candle with live version
      updatedCandles[existingCandleIndex] = liveCandle;
    } else {
      // Add live candle to the end
      updatedCandles.push(liveCandle);
    }

    const mergedData = {
      ...candleData,
      candles: updatedCandles,
    };

    // Use deep equality check to prevent unnecessary re-renders when candle values haven't changed
    if (isEqual(prevMergedDataRef.current, mergedData)) {
      return prevMergedDataRef.current as CandleData;
    }

    prevMergedDataRef.current = mergedData;
    return mergedData;
  }, [candleData, liveCandle]);

  const refreshCandleData = useCallback(async () => {
    setIsLoadingHistory(true);
    try {
      const historicalData = await fetchHistoricalCandles();
      setCandleData((prev) => {
        // Prevent re-render if data is identical
        if (isEqual(prev, historicalData)) {
          return prev;
        }
        return historicalData;
      });
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

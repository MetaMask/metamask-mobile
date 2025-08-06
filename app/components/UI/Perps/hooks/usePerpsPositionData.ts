import { useCallback, useEffect, useState } from 'react';
import Engine from '../../../../core/Engine';
import type { PriceUpdate } from '../controllers/types';
import type { CandleData } from '../types';
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
  const [isLoadingMoreData, setIsLoadingMoreData] = useState(false);

  // Helper function to convert interval to milliseconds
  const getIntervalMilliseconds = (interval: CandlePeriod): number => {
    const intervalMap: Record<CandlePeriod, number> = {
      [CandlePeriod.THREE_MINUTES]: 3 * 60 * 1000,
      [CandlePeriod.FIVE_MINUTES]: 5 * 60 * 1000,
      [CandlePeriod.FIFTEEN_MINUTES]: 15 * 60 * 1000,
      [CandlePeriod.THIRTY_MINUTES]: 30 * 60 * 1000,
      [CandlePeriod.ONE_HOUR]: 60 * 60 * 1000,
      [CandlePeriod.TWO_HOURS]: 2 * 60 * 60 * 1000,
      [CandlePeriod.FOUR_HOURS]: 4 * 60 * 60 * 1000,
      [CandlePeriod.EIGHT_HOURS]: 8 * 60 * 60 * 1000,
      [CandlePeriod.TWELVE_HOURS]: 12 * 60 * 60 * 1000,
      [CandlePeriod.ONE_DAY]: 24 * 60 * 60 * 1000,
      [CandlePeriod.THREE_DAYS]: 3 * 24 * 60 * 60 * 1000,
      [CandlePeriod.ONE_WEEK]: 7 * 24 * 60 * 60 * 1000,
      [CandlePeriod.ONE_MONTH]: 30 * 24 * 60 * 60 * 1000,
    };
    return intervalMap[interval] || 60 * 60 * 1000; // Default to 1 hour
  };

  const fetchHistoricalCandles = useCallback(async () => {
    const candleCount = calculateCandleCount(
      selectedDuration,
      selectedInterval,
    );
    DevLogger.log(
      `Fetching ${candleCount} candles for ${selectedDuration} duration with ${selectedInterval} period`,
    );
    const historicalData =
      await Engine.context.PerpsController.fetchHistoricalCandles(
        coin,
        selectedInterval,
        candleCount,
      );
    return historicalData;
  }, [coin, selectedDuration, selectedInterval]);

  const loadMoreHistoricalData = useCallback(
    async (direction: 'left' | 'right') => {
      if (!candleData || isLoadingMoreData) return;

      setIsLoadingMoreData(true);

      try {
        const additionalCandleCount = 10;

        if (direction === 'left') {
          // Fetch older data (before the earliest candle)
          const earliestCandle = candleData.candles[0];
          if (!earliestCandle) return;

          // Calculate time range for older data
          const intervalMs = getIntervalMilliseconds(selectedInterval);
          const endTime = earliestCandle.time;
          const startTime = endTime - additionalCandleCount * intervalMs;

          const olderData =
            await Engine.context.PerpsController.fetchHistoricalCandlesWithTimeRange(
              coin,
              selectedInterval,
              startTime,
              endTime,
            );

          const newCandles = [...olderData.candles, ...candleData.candles];

          if (olderData?.candles && olderData.candles.length > 0) {
            // Prepend older data to existing data
            setCandleData((prevData: CandleData | null) => {
              if (!prevData) return olderData;
              return {
                ...prevData,
                candles: newCandles,
              };
            });
          }
        } else {
          // We don't need to load newer data at this time, we'll always have the latest data on mount
          setCandleData((prevData: CandleData | null) => {
            if (!prevData) return candleData;
            return {
              ...prevData,
            };
          });
        }
      } catch (error) {
        DevLogger.log(`Error loading more ${direction} data:`, error);
      } finally {
        setIsLoadingMoreData(false);
      }
    },
    [coin, selectedInterval, candleData, isLoadingMoreData],
  );

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

  return {
    candleData,
    priceData,
    isLoadingHistory,
    isLoadingMoreData,
    loadMoreHistoricalData,
  };
};

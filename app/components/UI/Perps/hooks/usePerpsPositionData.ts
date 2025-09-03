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

  // Refresh function to reload candle data
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
    candleData,
    priceData,
    isLoadingHistory,
    refreshCandleData,
  };
};

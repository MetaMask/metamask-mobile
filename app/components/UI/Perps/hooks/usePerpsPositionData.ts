import { useCallback, useEffect, useState } from 'react';
import Engine from '../../../../core/Engine';
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
    isLoadingHistory,
    refreshCandleData,
  };
};

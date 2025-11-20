import { isEqual } from 'lodash';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { selectPerpsInitializationState } from '../selectors/perpsController';
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
  const [hasHistoricalData, setHasHistoricalData] = useState(false);

  const initializationState = useSelector(selectPerpsInitializationState);
  const isControllerInitialized = initializationState === 'initialized';

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
    if (!isControllerInitialized) {
      DevLogger.log(
        'usePerpsPositionData: Waiting for controller initialization before loading historical data',
      );
      return;
    }

    setIsLoadingHistory(true);
    setHasHistoricalData(false);
    const loadHistoricalData = async () => {
      try {
        setCandleData(null);
        const historicalData = await fetchHistoricalCandles();
        // Only set data and flag if we received valid data
        if (historicalData && historicalData.candles?.length > 0) {
          setCandleData((prev) => {
            // Prevent re-render if data is identical
            if (isEqual(prev, historicalData)) {
              return prev;
            }
            return historicalData;
          });
          setHasHistoricalData(true);
        } else {
          // No valid data received
          setHasHistoricalData(false);
        }
      } catch (err) {
        console.error('Error loading historical candles:', err);
        setHasHistoricalData(false);
      } finally {
        setIsLoadingHistory(false);
      }
    };

    loadHistoricalData();
  }, [fetchHistoricalCandles, initializationState, isControllerInitialized]);

  // Subscribe to price updates for 24-hour data
  useEffect(() => {
    if (!isControllerInitialized) {
      return;
    }

    const unsubscribe = subscribeToPriceUpdates();

    return () => {
      unsubscribe();
    };
  }, [subscribeToPriceUpdates, initializationState, isControllerInitialized]);

  // Periodically refresh candle data to get new completed candles
  useEffect(() => {
    // Only set up refresh if we have initial data and not loading
    if (!candleData || isLoadingHistory || !isControllerInitialized) {
      if (!isControllerInitialized) {
        DevLogger.log(
          'usePerpsPositionData: Deferring interval setup until controller is initialized',
        );
      }
      return;
    }

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
    // Note: candleData is intentionally excluded from deps to prevent infinite loop
    // This effect only needs to re-run when the interval settings change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isLoadingHistory,
    selectedInterval,
    fetchHistoricalCandles,
    isControllerInitialized,
  ]);

  const liveCandle = useMemo(() => {
    if (!priceData?.price || isLoadingHistory) return null;

    const currentPrice = Number.parseFloat(priceData.price.toString());
    const currentCandleTime = getCurrentCandleStartTime(selectedInterval);
    const existingCandles = candleData?.candles ?? [];
    const existingCandleIndex = existingCandles.findIndex(
      (candle) => candle.time === currentCandleTime,
    );

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
      const high = Math.max(currentPrice, Number.parseFloat(open)).toString();
      const low = Math.min(currentPrice, Number.parseFloat(open)).toString();

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    priceData,
    selectedInterval,
    getCurrentCandleStartTime,
    isLoadingHistory,
  ]);

  // Merge historical candles with live candle for chart display
  useEffect(() => {
    // Don't merge until we have successfully loaded historical candles
    if (!hasHistoricalData || !candleData) return;

    const candles = candleData.candles;
    if (!liveCandle || candles.length === 0) return;

    const liveCandleIndex = candles.findIndex(
      (candle) => candle.time === liveCandle.time,
    );

    if (liveCandleIndex === -1) {
      setCandleData((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          candles: [...prev.candles, liveCandle],
        };
      });
      return;
    }

    if (isEqual(candles[liveCandleIndex], liveCandle)) {
      return;
    }

    setCandleData((prev) => {
      if (!prev) return null;
      const candlesCopy = [...prev.candles];
      candlesCopy[liveCandleIndex] = liveCandle;
      return {
        ...prev,
        candles: candlesCopy,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveCandle, hasHistoricalData, candleData]);

  const refreshCandleData = useCallback(async () => {
    setIsLoadingHistory(true);
    try {
      setCandleData(null);
      const historicalData = await fetchHistoricalCandles();

      if (historicalData && historicalData.candles?.length > 0) {
        setCandleData((prev) => {
          // Prevent re-render if data is identical
          if (isEqual(prev, historicalData)) {
            return prev;
          }
          return historicalData;
        });
        setHasHistoricalData(true);
      } else {
        // No valid data received on refresh
        setHasHistoricalData(false);
      }
    } catch (err) {
      console.error('Error refreshing candle data:', err);
      setHasHistoricalData(false);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [fetchHistoricalCandles]);

  return {
    candleData,
    priceData,
    isLoadingHistory,
    refreshCandleData,
    hasHistoricalData,
  };
};

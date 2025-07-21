import { useCallback, useEffect, useState } from 'react';
import Engine from '../../../../core/Engine';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import type { PriceUpdate } from '../controllers/types';
import type { CandleData } from '../types';
import { usePerpsConnection } from '../providers/PerpsConnectionProvider';

interface UsePerpsPositionDataProps {
  coin: string;
  selectedInterval: string;
}

export const usePerpsPositionData = ({
  coin,
  selectedInterval,
}: UsePerpsPositionDataProps) => {
  const [candleData, setCandleData] = useState<CandleData | null>(null);
  const [priceData, setPriceData] = useState<PriceUpdate | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Get connection state from the provider
  const { isConnected, isInitialized } = usePerpsConnection();

  const fetchHistoricalCandles = useCallback(async () => {
    const historicalData =
      await Engine.context.PerpsController.fetchHistoricalCandles(
        coin,
        selectedInterval,
        100,
      );
    return historicalData;
  }, [coin, selectedInterval]);

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

  // Load historical candles only when SDK is ready
  useEffect(() => {
    // Only fetch data if SDK is initialized and connected
    if (!isInitialized || !isConnected || !coin) {
      return;
    }

    setIsLoadingHistory(true);
    const loadHistoricalData = async () => {
      try {
        const historicalData = await fetchHistoricalCandles();
        setCandleData(historicalData);
      } catch (err) {
        DevLogger.log('Error loading historical candles:', err);
      } finally {
        setIsLoadingHistory(false);
      }
    };

    loadHistoricalData();
  }, [
    fetchHistoricalCandles,
    isInitialized,
    isConnected,
    coin,
    selectedInterval,
  ]);

  // Subscribe to price updates only when SDK is ready
  useEffect(() => {
    // Only subscribe if SDK is initialized and connected
    if (!isInitialized || !isConnected || !coin) {
      return;
    }

    const unsubscribe = subscribeToPriceUpdates();

    return () => {
      unsubscribe();
    };
  }, [subscribeToPriceUpdates, isInitialized, isConnected, coin]);

  return {
    candleData,
    priceData,
    isLoadingHistory,
  };
};

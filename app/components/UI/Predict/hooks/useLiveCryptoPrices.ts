import { useEffect, useState, useRef } from 'react';
import Engine from '../../../../core/Engine';
import { CryptoPriceUpdate } from '../types';

/**
 * Result returned by useLiveCryptoPrices.
 */
export interface UseLiveCryptoPricesResult {
  /** Whether the RTDS WebSocket is connected. */
  isConnected: boolean;
}

/**
 * Subscribes to real-time crypto price updates for a single symbol.
 * The hook itself stores no price state — each update is forwarded
 * to the mandatory `onUpdate` callback, letting consumers decide
 * how to store and process price data.
 *
 * @param symbol - Crypto symbol to subscribe to (e.g., 'btcusdt'). Pass empty string to skip subscription.
 * @param onUpdate - Mandatory callback invoked on every price update.
 * @returns Object with `isConnected` boolean indicating RTDS WebSocket status.
 */
export const useLiveCryptoPrices = (
  symbol: string,
  onUpdate: (update: CryptoPriceUpdate) => void,
): UseLiveCryptoPricesResult => {
  const [isConnected, setIsConnected] = useState(false);
  const isMountedRef = useRef(true);
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  useEffect(() => {
    isMountedRef.current = true;

    if (!symbol) {
      setIsConnected(false);
      return;
    }

    const { PredictController } = Engine.context;
    const unsubscribe = PredictController.subscribeToCryptoPrices(
      [symbol],
      (update: CryptoPriceUpdate) => {
        if (!isMountedRef.current) return;
        onUpdateRef.current(update);
      },
    );

    const checkConnection = () => {
      if (!isMountedRef.current) return;
      const status = PredictController.getConnectionStatus();
      setIsConnected(status.rtdsConnected);
    };

    checkConnection();
    const intervalId = setInterval(checkConnection, 1000);

    return () => {
      isMountedRef.current = false;
      unsubscribe();
      clearInterval(intervalId);
    };
  }, [symbol]);

  return { isConnected };
};

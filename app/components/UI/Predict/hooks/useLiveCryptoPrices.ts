import { useEffect, useState, useRef } from 'react';
import Engine from '../../../../core/Engine';
import { CryptoPriceUpdate } from '../types';

export interface UseLiveCryptoPricesResult {
  isConnected: boolean;
}

export const useLiveCryptoPrices = (
  symbol: string,
  onUpdate: (update: CryptoPriceUpdate) => void,
): UseLiveCryptoPricesResult => {
  const [isConnected, setIsConnected] = useState(false);
  const isMountedRef = useRef(true);
  const isConnectedRef = useRef(false);
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  useEffect(() => {
    isMountedRef.current = true;

    if (!symbol) {
      isConnectedRef.current = false;
      setIsConnected(false);
      return () => {
        isMountedRef.current = false;
        isConnectedRef.current = false;
      };
    }

    const { PredictController } = Engine.context;
    const unsubscribe = PredictController.subscribeToCryptoPrices(
      [symbol],
      (update: CryptoPriceUpdate) => {
        if (!isMountedRef.current) return;
        if (!isConnectedRef.current) {
          isConnectedRef.current = true;
          setIsConnected(true);
        }
        onUpdateRef.current(update);
      },
    );

    const status = PredictController.getConnectionStatus();
    const isCurrentlyConnected = isConnectedRef.current || status.rtdsConnected;
    isConnectedRef.current = isCurrentlyConnected;
    setIsConnected(isCurrentlyConnected);

    return () => {
      isMountedRef.current = false;
      isConnectedRef.current = false;
      setIsConnected(false);
      unsubscribe();
    };
  }, [symbol]);

  return { isConnected };
};

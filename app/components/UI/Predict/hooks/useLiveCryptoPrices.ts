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
        if (!isConnected) setIsConnected(true);
        onUpdateRef.current(update);
      },
    );

    const status = PredictController.getConnectionStatus();
    setIsConnected(status.rtdsConnected);

    return () => {
      isMountedRef.current = false;
      setIsConnected(false);
      unsubscribe();
    };
  }, [symbol]); // eslint-disable-line react-hooks/exhaustive-deps

  return { isConnected };
};

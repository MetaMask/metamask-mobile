import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import Engine from '../../../../core/Engine';
import { CryptoPriceUpdate } from '../types';

export interface UseLiveCryptoPricesOptions {
  enabled?: boolean;
}

export interface UseLiveCryptoPricesResult {
  prices: Map<string, CryptoPriceUpdate>;
  getPrice: (symbol: string) => CryptoPriceUpdate | undefined;
  isConnected: boolean;
  lastUpdateTime: number | null;
}

export const useLiveCryptoPrices = (
  symbols: string[],
  options: UseLiveCryptoPricesOptions = {},
): UseLiveCryptoPricesResult => {
  const { enabled = true } = options;

  const [prices, setPrices] = useState<Map<string, CryptoPriceUpdate>>(
    new Map(),
  );
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<number | null>(null);

  const isMountedRef = useRef(true);
  const symbolsRef = useRef(symbols);

  const symbolsKey = useMemo(
    () => JSON.stringify([...symbols].sort((a, b) => a.localeCompare(b))),
    [symbols],
  );

  useEffect(() => {
    symbolsRef.current = symbols;
  }, [symbols]);

  const handlePriceUpdate = useCallback((update: CryptoPriceUpdate) => {
    if (!isMountedRef.current) return;

    setPrices((prevPrices) => {
      const newPrices = new Map(prevPrices);
      newPrices.set(update.symbol, update);
      return newPrices;
    });

    setLastUpdateTime(Date.now());
  }, []);

  useEffect(() => {
    isMountedRef.current = true;

    setPrices(new Map());
    setLastUpdateTime(null);

    if (!enabled || symbolsRef.current.length === 0) {
      setIsConnected(false);
      return;
    }

    const { PredictController } = Engine.context;
    const unsubscribe = PredictController.subscribeToCryptoPrices(
      symbolsRef.current,
      handlePriceUpdate,
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
  }, [symbolsKey, enabled, handlePriceUpdate]);

  const getPrice = useCallback(
    (symbol: string): CryptoPriceUpdate | undefined => prices.get(symbol),
    [prices],
  );

  return {
    prices,
    getPrice,
    isConnected,
    lastUpdateTime,
  };
};

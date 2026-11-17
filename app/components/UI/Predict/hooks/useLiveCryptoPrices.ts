import { useEffect, useState, useRef } from 'react';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { selectSelectedAccountGroupEvmInternalAccount } from '../../../../selectors/multichainAccounts/accountTreeController';
import {
  CryptoPriceUpdate,
  type CryptoPriceProvider,
  type CryptoTwapWindowSeconds,
} from '../types';

export interface UseLiveCryptoPricesResult {
  isConnected: boolean;
}

export const useLiveCryptoPrices = (
  symbol: string,
  onUpdate: (update: CryptoPriceUpdate) => void,
  twapWindowSeconds?: CryptoTwapWindowSeconds,
  provider?: CryptoPriceProvider,
): UseLiveCryptoPricesResult => {
  const [isConnected, setIsConnected] = useState(false);
  const isMountedRef = useRef(true);
  const isConnectedRef = useRef(false);
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;
  // The provider authenticates the price feed with this account and skips the
  // subscription without one, so re-subscribe when it appears or changes.
  const selectedAddress = useSelector(
    selectSelectedAccountGroupEvmInternalAccount,
  )?.address;

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
      { twapWindowSeconds, ...(provider && { provider }) },
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
  }, [symbol, twapWindowSeconds, provider, selectedAddress]);

  return { isConnected };
};

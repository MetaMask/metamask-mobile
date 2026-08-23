import { useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { selectHip3ConfigVersion } from '../selectors/featureFlags';
import {
  selectPerpsNetwork,
  selectPerpsProvider,
} from '../selectors/perpsController';
import { usePerpsConnection } from './usePerpsConnection';

export interface PerpsMarketContext {
  key: string;
  isReady: boolean;
}

/**
 * Tracks when the connection has reinitialized for the selected market context.
 * Account reconnects keep the same key, so resident market data stays usable.
 */
export function usePerpsMarketContext(): PerpsMarketContext {
  const network = useSelector(selectPerpsNetwork);
  const provider = useSelector(selectPerpsProvider);
  const hip3ConfigVersion = useSelector(selectHip3ConfigVersion);
  const { isInitialized } = usePerpsConnection();
  const key = `${network}|${provider ?? 'unknown'}|${hip3ConfigVersion}`;

  const [readyKey, setReadyKey] = useState<string | null>(() =>
    isInitialized ? key : null,
  );
  const isInitializedRef = useRef(isInitialized);
  isInitializedRef.current = isInitialized;
  const pendingKeyRef = useRef<string | null>(isInitialized ? null : key);
  const observedReconnectRef = useRef(!isInitialized);

  useEffect(() => {
    if (readyKey === key) {
      return;
    }
    pendingKeyRef.current = key;
    observedReconnectRef.current = !isInitializedRef.current;
    setReadyKey(null);
  }, [key, readyKey]);

  useEffect(() => {
    const pendingKey = pendingKeyRef.current;
    if (!pendingKey) {
      return;
    }
    if (!isInitialized) {
      observedReconnectRef.current = true;
      return;
    }
    if (pendingKey === key && observedReconnectRef.current) {
      pendingKeyRef.current = null;
      setReadyKey(key);
    }
  }, [isInitialized, key]);

  return { key, isReady: readyKey === key };
}

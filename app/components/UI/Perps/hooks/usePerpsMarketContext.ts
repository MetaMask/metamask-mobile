import { useSyncExternalStore } from 'react';
import { useSelector } from 'react-redux';
import { PerpsConnectionManager } from '../services/PerpsConnectionManager';
import { selectHip3ConfigVersion } from '../selectors/featureFlags';
import {
  selectPerpsNetwork,
  selectPerpsProvider,
} from '../selectors/perpsController';
import { selectPerpsSelectedAccountAddress } from '../selectors/selectedAccountAddress';
import { usePerpsConnection } from './usePerpsConnection';
import { buildPerpsMarketContextKey } from '../utils/perpsMarketContext';

export interface PerpsMarketContext {
  key: string;
  isReady: boolean;
  isUserReady: boolean;
  isConnectionInitialized: boolean;
}

const subscribeToInitializedMarketContext = (listener: () => void) =>
  PerpsConnectionManager.subscribeToInitializedMarketContext(listener);

const getInitializedMarketContextSnapshot = () =>
  PerpsConnectionManager.getInitializedMarketContextKey();
const subscribeToInitializedUserContext = (listener: () => void) =>
  PerpsConnectionManager.subscribeToInitializedUserContext(listener);
const getInitializedUserContextSnapshot = () =>
  PerpsConnectionManager.getInitializedUserContextKey();

/**
 * Compares the selected market context with the connection that last completed
 * initialization. Account reconnects keep the same market identity, so their
 * resident global data stays usable while user data reconnects.
 */
export function usePerpsMarketContext(): PerpsMarketContext {
  const network = useSelector(selectPerpsNetwork);
  const provider = useSelector(selectPerpsProvider);
  const address = useSelector(selectPerpsSelectedAccountAddress);
  const hip3ConfigVersion = useSelector(selectHip3ConfigVersion);
  const { isInitialized } = usePerpsConnection();
  const key = buildPerpsMarketContextKey(network, provider, hip3ConfigVersion);
  const initializedKey = useSyncExternalStore(
    subscribeToInitializedMarketContext,
    getInitializedMarketContextSnapshot,
    getInitializedMarketContextSnapshot,
  );
  const isReady = initializedKey === key;
  const userKey = `${key}|${address?.toLowerCase() ?? ''}`;
  const initializedUserKey = useSyncExternalStore(
    subscribeToInitializedUserContext,
    getInitializedUserContextSnapshot,
    getInitializedUserContextSnapshot,
  );
  const isUserReady = initializedUserKey === userKey;

  return {
    key,
    isReady,
    isUserReady,
    isConnectionInitialized: isInitialized,
  };
}

import { useSyncExternalStore } from 'react';
import { useSelector } from 'react-redux';
import { PerpsConnectionManager } from '../services/PerpsConnectionManager';
import { selectHip3ConfigVersion } from '../selectors/featureFlags';
import {
  selectPerpsNetwork,
  selectPerpsProvider,
} from '../selectors/perpsController';
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
const getUserContextReadySnapshot = () =>
  PerpsConnectionManager.isSelectedUserContextReady();

/**
 * Compares the selected market context with the connection that last completed
 * initialization. Account reconnects keep the same market identity, so their
 * resident global data stays usable while user data reconnects.
 */
export function usePerpsMarketContext(): PerpsMarketContext {
  const network = useSelector(selectPerpsNetwork);
  const provider = useSelector(selectPerpsProvider);
  const hip3ConfigVersion = useSelector(selectHip3ConfigVersion);
  const { isInitialized } = usePerpsConnection();
  const key = buildPerpsMarketContextKey(network, provider, hip3ConfigVersion);
  const initializedKey = useSyncExternalStore(
    subscribeToInitializedMarketContext,
    getInitializedMarketContextSnapshot,
    getInitializedMarketContextSnapshot,
  );
  const isReady = initializedKey === key;
  const isUserReady = useSyncExternalStore(
    subscribeToInitializedUserContext,
    getUserContextReadySnapshot,
    getUserContextReadySnapshot,
  );

  return {
    key,
    isReady,
    isUserReady,
    isConnectionInitialized: isInitialized,
  };
}

import { useSyncExternalStore } from 'react';
import { useSelector } from 'react-redux';
import { PerpsConnectionManager } from '../services/PerpsConnectionManager';
import { selectHip3ConfigVersion } from '../selectors/featureFlags';
import {
  selectPerpsNetwork,
  selectPerpsProvider,
} from '../selectors/perpsController';
import { buildPerpsMarketContextKey } from '../utils/perpsMarketContext';

export interface PerpsMarketContext {
  key: string;
  identityKey: string;
  isReady: boolean;
}

const subscribeToInitializedMarketContext = (listener: () => void) =>
  PerpsConnectionManager.subscribeToInitializedMarketContext(listener);

const getInitializedMarketContextSnapshot = () =>
  PerpsConnectionManager.getInitializedMarketContextKey();
const subscribeToConnectionGeneration = (listener: () => void) =>
  PerpsConnectionManager.subscribeToConnectionGeneration(listener);
const getConnectionGenerationSnapshot = () =>
  PerpsConnectionManager.getConnectionGeneration();
const getInitializedConnectionGenerationSnapshot = () =>
  PerpsConnectionManager.getInitializedConnectionGeneration();

/**
 * Compares the selected market context with the connection that last completed
 * initialization. Account reconnects keep the same market identity, so their
 * resident global data stays usable while user data reconnects.
 */
export function usePerpsMarketContext(): PerpsMarketContext {
  const network = useSelector(selectPerpsNetwork);
  const provider = useSelector(selectPerpsProvider);
  const hip3ConfigVersion = useSelector(selectHip3ConfigVersion);
  const selectedContextKey = buildPerpsMarketContextKey(
    network,
    provider,
    hip3ConfigVersion,
  );
  const connectionGeneration = useSyncExternalStore(
    subscribeToConnectionGeneration,
    getConnectionGenerationSnapshot,
    getConnectionGenerationSnapshot,
  );
  const initializedConnectionGeneration = useSyncExternalStore(
    subscribeToInitializedMarketContext,
    getInitializedConnectionGenerationSnapshot,
    getInitializedConnectionGenerationSnapshot,
  );
  const key = `${selectedContextKey}|${connectionGeneration}`;
  const initializedKey = useSyncExternalStore(
    subscribeToInitializedMarketContext,
    getInitializedMarketContextSnapshot,
    getInitializedMarketContextSnapshot,
  );
  const isReady =
    initializedKey === selectedContextKey &&
    initializedConnectionGeneration === connectionGeneration;
  return {
    key,
    identityKey: selectedContextKey,
    isReady,
  };
}

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useSelector } from 'react-redux';
import { selectHip3ConfigVersion } from '../../../../../UI/Perps/selectors/featureFlags';
import {
  selectPerpsNetwork,
  selectPerpsProvider,
} from '../../../../../UI/Perps/selectors/perpsController';
import { selectPerpsSelectedAccountAddress } from '../../../../../UI/Perps/selectors/selectedAccountAddress';
import { getPerpsLifecycleContext } from '../../../../../UI/Perps/utils/perpsLifecycleContext';
import {
  cancelPerpsLoadingSession,
  getActivePerpsLoadingSessionContext,
  preparePerpsLoadingSession,
  resolvePerpsLoadingLifecycle,
  startPerpsLoadingSession,
  type PerpsLoadingLifecycle,
  type PerpsLoadingSessionContext,
} from '../../../../../UI/Perps/utils/perpsLoadingSession';

interface PerpsContextIdentity {
  address?: string;
  network: 'mainnet' | 'testnet';
  provider?: string;
  hip3ConfigVersion: number;
}

interface PerpsHomepageLoadingSession {
  proposedLifecycle: PerpsLoadingLifecycle;
  sessionContext: PerpsLoadingSessionContext | null;
  sessionReady: boolean;
}

function identitiesMatch(
  first: PerpsContextIdentity,
  second: PerpsContextIdentity,
): boolean {
  return (
    first.address === second.address &&
    first.network === second.network &&
    first.provider === second.provider &&
    first.hip3ConfigVersion === second.hip3ConfigVersion
  );
}

export function usePerpsHomepageLoadingSession(): PerpsHomepageLoadingSession {
  const address = useSelector(selectPerpsSelectedAccountAddress);
  const network = useSelector(selectPerpsNetwork);
  const provider = useSelector(selectPerpsProvider);
  const hip3ConfigVersion = useSelector(selectHip3ConfigVersion);
  const identity = useMemo<PerpsContextIdentity>(
    () => ({ address, network, provider, hip3ConfigVersion }),
    [address, hip3ConfigVersion, network, provider],
  );
  const proposedLifecycle = resolvePerpsLoadingLifecycle(
    getPerpsLifecycleContext(),
  );
  const preparedRef = useRef(false);
  if (!preparedRef.current) {
    preparePerpsLoadingSession();
    preparedRef.current = true;
  }

  const previousIdentityRef = useRef<PerpsContextIdentity | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const wasBackgroundedRef = useRef(AppState.currentState === 'background');
  const hasOwnedSessionRef = useRef(
    getActivePerpsLoadingSessionContext() !== null,
  );
  const [sessionState, setSessionState] = useState({
    ready: getActivePerpsLoadingSessionContext() !== null,
    revision: 0,
  });

  const beginSession = useCallback((lifecycle: PerpsLoadingLifecycle) => {
    preparePerpsLoadingSession();
    startPerpsLoadingSession({
      lifecycle,
      restart: getActivePerpsLoadingSessionContext() !== null,
      surface: 'homepage',
    });
    hasOwnedSessionRef.current = true;
    setSessionState((current) => ({
      ready: true,
      revision: current.revision + 1,
    }));
  }, []);

  useEffect(() => {
    const previousIdentity = previousIdentityRef.current;
    previousIdentityRef.current = identity;

    if (appStateRef.current !== 'active') {
      return;
    }
    if (!previousIdentity) {
      beginSession(proposedLifecycle);
      return;
    }
    if (identitiesMatch(previousIdentity, identity)) {
      return;
    }

    const accountOnlyChanged =
      previousIdentity.address !== identity.address &&
      previousIdentity.network === identity.network &&
      previousIdentity.provider === identity.provider &&
      previousIdentity.hip3ConfigVersion === identity.hip3ConfigVersion;
    cancelPerpsLoadingSession('context_changed');
    beginSession(accountOnlyChanged ? 'account_switch' : 'network_switch');
  }, [beginSession, identity, proposedLifecycle]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      const previousState = appStateRef.current;
      appStateRef.current = nextState;

      if (nextState === 'background') {
        wasBackgroundedRef.current = true;
        cancelPerpsLoadingSession('app_backgrounded');
        hasOwnedSessionRef.current = false;
        setSessionState((current) => ({
          ready: false,
          revision: current.revision + 1,
        }));
        return;
      }
      if (nextState === 'active' && previousState !== 'active') {
        if (!wasBackgroundedRef.current && hasOwnedSessionRef.current) {
          return;
        }
        const lifecycle = wasBackgroundedRef.current
          ? 'background_short'
          : proposedLifecycle;
        wasBackgroundedRef.current = false;
        beginSession(lifecycle);
      }
    });
    return () => subscription.remove();
  }, [beginSession, proposedLifecycle]);

  useEffect(() => () => cancelPerpsLoadingSession('surface_unmounted'), []);

  return {
    proposedLifecycle,
    sessionContext: getActivePerpsLoadingSessionContext(),
    sessionReady: sessionState.ready,
  };
}

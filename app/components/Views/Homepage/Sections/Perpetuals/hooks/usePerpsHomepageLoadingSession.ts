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
  createPerpsLoadingSessionIdentity,
  getActivePerpsLoadingSessionContext,
  preparePerpsLoadingSession,
  resolvePerpsLoadingLifecycle,
  startPerpsLoadingSession,
  subscribeToPerpsLoadingSession,
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

function lifecycleForIdentityChange(
  previous: PerpsContextIdentity,
  current: PerpsContextIdentity,
): PerpsLoadingLifecycle {
  const accountOnlyChanged =
    previous.address !== current.address &&
    previous.network === current.network &&
    previous.provider === current.provider &&
    previous.hip3ConfigVersion === current.hip3ConfigVersion;
  return accountOnlyChanged ? 'account_switch' : 'network_switch';
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
  const identityRef = useRef(identity);
  identityRef.current = identity;
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const wasBackgroundedRef = useRef(AppState.currentState === 'background');
  const hasOwnedSessionRef = useRef(
    getActivePerpsLoadingSessionContext() !== null,
  );
  const [sessionContext, setSessionContext] =
    useState<PerpsLoadingSessionContext | null>(() =>
      getActivePerpsLoadingSessionContext(),
    );

  const beginSession = useCallback((lifecycle: PerpsLoadingLifecycle) => {
    preparePerpsLoadingSession();
    startPerpsLoadingSession({
      lifecycle,
      restart: getActivePerpsLoadingSessionContext() !== null,
      surface: 'homepage',
      identity: createPerpsLoadingSessionIdentity(identityRef.current),
    });
    hasOwnedSessionRef.current = true;
  }, []);

  useEffect(
    () =>
      subscribeToPerpsLoadingSession((update) => {
        if (update.type === 'cancelled' || update.type === 'timed_out') {
          hasOwnedSessionRef.current = false;
          setSessionContext((current) =>
            current?.id && current.id !== update.context.id ? current : null,
          );
          return;
        }
        hasOwnedSessionRef.current = true;
        setSessionContext(update.context);
      }),
    [],
  );

  useEffect(() => {
    const previousIdentity = previousIdentityRef.current;

    if (appStateRef.current !== 'active') {
      return;
    }
    if (!previousIdentity) {
      previousIdentityRef.current = identity;
      beginSession(proposedLifecycle);
      return;
    }
    if (identitiesMatch(previousIdentity, identity)) {
      return;
    }

    previousIdentityRef.current = identity;
    cancelPerpsLoadingSession('context_changed');
    beginSession(lifecycleForIdentityChange(previousIdentity, identity));
  }, [beginSession, identity, proposedLifecycle]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      const previousState = appStateRef.current;
      appStateRef.current = nextState;

      if (nextState === 'background') {
        wasBackgroundedRef.current = true;
        cancelPerpsLoadingSession('app_backgrounded');
        hasOwnedSessionRef.current = false;
        return;
      }
      if (nextState === 'active' && previousState !== 'active') {
        const previousIdentity = previousIdentityRef.current;
        const currentIdentity = identityRef.current;
        if (
          previousIdentity &&
          !identitiesMatch(previousIdentity, currentIdentity)
        ) {
          previousIdentityRef.current = currentIdentity;
          wasBackgroundedRef.current = false;
          cancelPerpsLoadingSession('context_changed');
          beginSession(
            lifecycleForIdentityChange(previousIdentity, currentIdentity),
          );
          return;
        }
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

  useEffect(
    () => () => {
      cancelPerpsLoadingSession('surface_unmounted');
      hasOwnedSessionRef.current = false;
      previousIdentityRef.current = null;
    },
    [],
  );

  return {
    proposedLifecycle,
    sessionContext,
    sessionReady: sessionContext !== null,
  };
}

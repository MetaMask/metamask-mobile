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
  type PerpsLoadingSessionCancellationReason,
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

export function usePerpsHomepageLoadingSession(
  isFocused = true,
): PerpsHomepageLoadingSession {
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
  // Arm during render so synchronous stream snapshots published before layout
  // effects are buffered. The ref and cancel path make StrictMode re-renders
  // idempotent and prevent an abandoned render from leaking into a later mount.
  if (isFocused && !preparedRef.current) {
    preparePerpsLoadingSession();
    preparedRef.current = true;
  }

  const previousIdentityRef = useRef<PerpsContextIdentity | null>(null);
  const identityRef = useRef(identity);
  identityRef.current = identity;
  const isFocusedRef = useRef(isFocused);
  isFocusedRef.current = isFocused;
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const wasBackgroundedRef = useRef(AppState.currentState !== 'active');
  const ownedSessionIdRef = useRef<string | null>(null);
  const hasOwnedSessionRef = useRef(false);
  const [sessionContext, setSessionContext] =
    useState<PerpsLoadingSessionContext | null>(null);

  const cancelOwnedOrPreparedSession = useCallback(
    (reason: PerpsLoadingSessionCancellationReason) => {
      const activeContext = getActivePerpsLoadingSessionContext();
      if (
        activeContext === null ||
        activeContext.id === ownedSessionIdRef.current
      ) {
        cancelPerpsLoadingSession(reason);
      }
      ownedSessionIdRef.current = null;
      hasOwnedSessionRef.current = false;
      preparedRef.current = false;
    },
    [],
  );

  const beginSession = useCallback((lifecycle: PerpsLoadingLifecycle) => {
    preparePerpsLoadingSession();
    const sessionId = startPerpsLoadingSession({
      lifecycle,
      restart: getActivePerpsLoadingSessionContext() !== null,
      surface: 'homepage',
      identity: createPerpsLoadingSessionIdentity(identityRef.current),
      provider: identityRef.current.provider,
      network: identityRef.current.network,
    });
    ownedSessionIdRef.current = sessionId;
    hasOwnedSessionRef.current = true;
    preparedRef.current = false;
    const activeContext = getActivePerpsLoadingSessionContext();
    if (activeContext?.id === sessionId) {
      setSessionContext(activeContext);
    }
  }, []);

  useEffect(
    () =>
      subscribeToPerpsLoadingSession((update) => {
        if (update.context.id !== ownedSessionIdRef.current) {
          return;
        }
        if (update.type === 'cancelled' || update.type === 'timed_out') {
          ownedSessionIdRef.current = null;
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

    if (!isFocused) {
      if (hasOwnedSessionRef.current || preparedRef.current) {
        cancelOwnedOrPreparedSession('surface_unfocused');
      }
      previousIdentityRef.current = null;
      return;
    }
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
    cancelOwnedOrPreparedSession('context_changed');
    beginSession(lifecycleForIdentityChange(previousIdentity, identity));
  }, [
    beginSession,
    cancelOwnedOrPreparedSession,
    identity,
    isFocused,
    proposedLifecycle,
  ]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      const previousState = appStateRef.current;
      appStateRef.current = nextState;

      if (nextState !== 'active') {
        wasBackgroundedRef.current = true;
        if (hasOwnedSessionRef.current || preparedRef.current) {
          cancelOwnedOrPreparedSession('app_backgrounded');
        }
        return;
      }
      if (nextState === 'active' && previousState !== 'active') {
        if (!isFocusedRef.current) {
          return;
        }
        const previousIdentity = previousIdentityRef.current;
        const currentIdentity = identityRef.current;
        if (!previousIdentity) {
          previousIdentityRef.current = currentIdentity;
        }
        if (
          previousIdentity &&
          !identitiesMatch(previousIdentity, currentIdentity)
        ) {
          previousIdentityRef.current = currentIdentity;
          wasBackgroundedRef.current = false;
          cancelOwnedOrPreparedSession('context_changed');
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
  }, [beginSession, cancelOwnedOrPreparedSession, proposedLifecycle]);

  useEffect(
    () => () => {
      if (hasOwnedSessionRef.current || preparedRef.current) {
        cancelOwnedOrPreparedSession('surface_unmounted');
      }
      previousIdentityRef.current = null;
    },
    [cancelOwnedOrPreparedSession],
  );

  return {
    proposedLifecycle,
    sessionContext,
    sessionReady: isFocused && sessionContext !== null,
  };
}

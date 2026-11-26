import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState } from 'react-native';

import { useNetworkTier } from '../../../../hooks/useNetworkTier';
import { useSettledNetworkLatency } from '../../../../hooks/useNetworkLatency';
import { getHardwareTier } from '../../../../util/deviceCapability';
import type { HardwareTier } from '../../../../util/deviceCapability/types';
import type {
  AccountReadinessAdapter,
  AccountReadinessCard,
  AccountReadinessConnection,
  AccountReadinessSnapshot,
  AccountReadinessValue,
} from './accountReadiness.types';
import {
  createAccountReadinessObservation,
  type AccountReadinessObservation,
  type AccountReadinessObservationContext,
  type AccountReadinessObservationMetadata,
} from './internal/accountReadinessObservation';
import { useVerifiedCardDismissal } from './internal/useVerifiedCardDismissal';

const HIDDEN_SNAPSHOT: AccountReadinessSnapshot = {
  readiness: 'unknown',
  card: { kind: 'hidden' },
};

const DEFAULT_METADATA: AccountReadinessObservationMetadata = {
  isRefreshing: false,
  readError: 'none',
  latency: 'unknown',
};

interface HomeVisibility {
  isFocused: boolean;
  region: 'allowed_or_unknown' | 'blocked';
}

const DEFAULT_VISIBILITY: HomeVisibility = {
  isFocused: false,
  region: 'allowed_or_unknown',
};

interface ReadyState {
  /** The observation session the value belongs to. */
  key: string;
  snapshot: AccountReadinessSnapshot;
}

interface MetadataState {
  key: string;
  metadata: AccountReadinessObservationMetadata;
}

export interface AccountReadinessProviderProps {
  children: React.ReactNode;
  adapter: AccountReadinessAdapter | null;
  accountActions: 'readiness_gated' | 'unchanged';
  /** Identity/environment/auth-profile key the adapter belongs to. */
  scope: string | null;
  canonicalProfileId: string | null;
  eligibility: 'eligible' | 'unavailable';
  setup: 'closed' | 'opening' | 'open';
  /** Internal: one passive status refresh per change. */
  refreshToken?: number;
  /** Internal: lets the gate cancel Home reads before mounting setup. */
  observationPauseRef?: { current: (() => void) | null };
}

export interface AccountReadinessContextValue extends AccountReadinessValue {
  registerVisibility(this: void, visibility: HomeVisibility): () => void;
}

export const AccountReadinessContext =
  createContext<AccountReadinessContextValue | null>(null);

const sameMetadata = (
  left: AccountReadinessObservationMetadata,
  right: AccountReadinessObservationMetadata,
): boolean =>
  left.isRefreshing === right.isRefreshing &&
  left.readError === right.readError &&
  left.latency === right.latency;

/**
 * Owns the one passive readiness observation for the current canonical
 * identity and exposes Home's view of it. Setup is never opened here; the
 * adapter's `openSetup` is only reachable through an explicit card action.
 */
export const AccountReadinessProvider = ({
  children,
  adapter,
  accountActions,
  scope,
  canonicalProfileId,
  eligibility,
  setup,
  refreshToken,
  observationPauseRef,
}: AccountReadinessProviderProps) => {
  const observed =
    adapter !== null && eligibility === 'eligible' && scope !== null;
  const sessionKey = observed ? `${scope}|${eligibility}` : '';

  const [published, setPublished] = useState<ReadyState>({
    key: sessionKey,
    snapshot: HIDDEN_SNAPSHOT,
  });
  const [publishedMetadata, setPublishedMetadata] = useState<MetadataState>({
    key: sessionKey,
    metadata: DEFAULT_METADATA,
  });
  const [visibility, setVisibility] =
    useState<HomeVisibility>(DEFAULT_VISIBILITY);
  const [appState, setAppState] = useState(AppState.currentState);
  const networkTier = useNetworkTier();
  const latencyBucket = useSettledNetworkLatency();
  const hardwareTier = useMemo<HardwareTier | null>(
    () => getHardwareTier(),
    [],
  );

  const snapshot: AccountReadinessSnapshot =
    published.key === sessionKey ? published.snapshot : HIDDEN_SNAPSHOT;
  const metadata =
    publishedMetadata.key === sessionKey
      ? publishedMetadata.metadata
      : DEFAULT_METADATA;

  const observationRef = useRef<AccountReadinessObservation | null>(null);
  const observationContext: AccountReadinessObservationContext = {
    scope: observed ? scope : null,
    isFocused: visibility.isFocused,
    appState,
    isEligible: observed && visibility.region !== 'blocked',
    isSetupOpen: setup !== 'closed',
    hardwareTier,
    networkTier,
    latency: latencyBucket,
  };
  const contextRef = useRef(observationContext);
  useEffect(() => {
    contextRef.current = observationContext;
  });

  useEffect(() => {
    const subscription = AppState.addEventListener('change', setAppState);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!observed || !adapter) {
      setPublished({ key: sessionKey, snapshot: HIDDEN_SNAPSHOT });
      setPublishedMetadata({ key: sessionKey, metadata: DEFAULT_METADATA });
      return undefined;
    }
    const observer = createAccountReadinessObservation({
      adapter,
      context: contextRef.current,
      publish: (next) => setPublished({ key: sessionKey, snapshot: next }),
      onMetadata: (next) =>
        setPublishedMetadata((current) =>
          sameMetadata(current.metadata, next)
            ? current
            : { key: sessionKey, metadata: next },
        ),
    });
    observationRef.current = observer;
    return () => {
      if (observationRef.current === observer) {
        observationRef.current = null;
      }
      observer.dispose();
    };
  }, [adapter, observed, sessionKey]);

  useEffect(() => {
    observationRef.current?.update(contextRef.current);
  }, [appState, hardwareTier, latencyBucket, networkTier, setup, visibility]);

  const lastRefreshToken = useRef(refreshToken);
  useEffect(() => {
    if (refreshToken === undefined) {
      return;
    }
    if (lastRefreshToken.current === refreshToken) {
      return;
    }
    lastRefreshToken.current = refreshToken;
    observationRef.current?.refreshStatus();
  }, [refreshToken]);

  useEffect(() => {
    if (!observationPauseRef) {
      return undefined;
    }
    observationPauseRef.current = () => {
      observationRef.current?.update({
        ...contextRef.current,
        isSetupOpen: true,
      });
    };
    return () => {
      observationPauseRef.current = null;
    };
  }, [observationPauseRef]);

  const verifiedCard = useVerifiedCardDismissal({
    canonicalProfileId,
    isVerified: snapshot.readiness === 'ready',
  });

  const isActive = appState === 'active';
  const setupClosed = setup === 'closed';

  const openSetup = useCallback(
    (intent: 'resume' | 'restart' | 'retry') => {
      if (
        !observed ||
        !adapter ||
        !setupClosed ||
        !isActive ||
        networkTier === 'NONE' ||
        visibility.region === 'blocked'
      ) {
        return;
      }
      adapter.openSetup(intent);
    },
    [adapter, isActive, networkTier, observed, setupClosed, visibility.region],
  );

  const startSetup = useCallback(() => {
    if (
      snapshot.card.kind === 'not_started' ||
      snapshot.card.kind === 'finish_verifying'
    ) {
      openSetup('resume');
    }
  }, [openSetup, snapshot.card.kind]);

  const retrySetup = useCallback(() => {
    if (snapshot.card.kind === 'action_required') {
      openSetup(snapshot.card.intent);
    }
  }, [openSetup, snapshot.card]);

  const refreshStatus = useCallback(() => {
    observationRef.current?.refreshStatus();
  }, []);

  const dismissVerified = useCallback(() => {
    if (snapshot.readiness === 'ready' && snapshot.card.kind === 'verified') {
      verifiedCard.dismiss();
    }
  }, [snapshot.card.kind, snapshot.readiness, verifiedCard]);

  const registerVisibility = useCallback((next: HomeVisibility) => {
    setVisibility((current) =>
      current.isFocused === next.isFocused && current.region === next.region
        ? current
        : next,
    );
    return () => setVisibility(DEFAULT_VISIBILITY);
  }, []);

  const connection: AccountReadinessConnection = !observed
    ? 'unavailable'
    : networkTier === 'NONE'
      ? 'offline'
      : networkTier === null
        ? 'unknown'
        : 'online';

  const value = useMemo<AccountReadinessContextValue>(() => {
    const card: AccountReadinessCard =
      snapshot.card.kind === 'verified'
        ? verifiedCard.isLoaded && !verifiedCard.isDismissed
          ? snapshot.card
          : { kind: 'hidden' }
        : snapshot.card;
    return {
      readiness: snapshot.readiness,
      card,
      connection,
      accountActions,
      setup,
      latency: metadata.latency,
      readError: metadata.readError,
      isRefreshing: metadata.isRefreshing,
      refreshStatus,
      startSetup,
      retrySetup,
      dismissVerified,
      registerVisibility,
    };
  }, [
    accountActions,
    connection,
    dismissVerified,
    metadata.isRefreshing,
    metadata.latency,
    metadata.readError,
    refreshStatus,
    registerVisibility,
    retrySetup,
    setup,
    snapshot.card,
    snapshot.readiness,
    startSetup,
    verifiedCard,
  ]);

  return (
    <AccountReadinessContext.Provider value={value}>
      {children}
    </AccountReadinessContext.Provider>
  );
};

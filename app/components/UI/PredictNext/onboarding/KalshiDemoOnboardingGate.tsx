import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useSelector } from 'react-redux';

import Engine from '../../../../core/Engine';
import { useNetworkTier } from '../../../../hooks/useNetworkTier';
import { selectEvmAddress } from '../../../../selectors/accountsController';
import {
  selectCanonicalProfileId,
  selectIsSignedIn,
} from '../../../../selectors/identity';
import { selectIsUnlocked } from '../../../../selectors/keyringController';
import type { HardwareTier } from '../../../../util/deviceCapability/types';
import { getHardwareTier } from '../../../../util/deviceCapability';
import { ensureError } from '../../../../util/errorUtils';
import Logger from '../../../../util/Logger';
import { getPredictApiUrl } from '../config/predictClusterUrls';
import { resolveVenueAuthProfile } from '../config/predictConfig';
import { useNextVenueId } from '../implementation';
import { portfolioQueryFamilies } from '../queries/portfolioQueries';
import { selectPredictConfig } from '../selectors/predictConfig';
import { KALSHI_VENUE_ID } from '../adapters/remote/KalshiRemoteAdapter';
import type {
  AccountReadiness,
  AccountSetupIntent,
} from './accountReadiness.types';
import { AccountReadinessProvider } from './AccountReadinessProvider';
import { createKalshiAccountReadinessAdapter } from './internal/createKalshiAccountReadinessAdapter';
import type { OnboardingFailure } from './internal/kalshiDemoOnboardingMachine';
import type { KalshiOnboardingState } from '../contracts/v1/onboarding';
import { createKalshiOnboardingClient } from './internal/createKalshiOnboardingClient';
import {
  kalshiDemoPayoutNetwork,
  kalshiDemoPayoutWallet,
} from './internal/demoOnboardingConfig';
import { KalshiDemoOnboardingModal } from './internal/KalshiDemoOnboardingModal';
import {
  useKalshiDemoOnboarding,
  type KalshiOnboardingApi,
} from './internal/useKalshiDemoOnboarding';
import { useVenueAccountNotEnabled } from './internal/useVenueAccountNotEnabled';

const POLL_INTERVAL_MS = 2_000;
/** Slow or absent links poll less. Unknown (`null`) keeps the default. */
const CONSTRAINED_POLL_INTERVAL_MS = 5_000;

const invalidatePortfolioReads = () => {
  for (const queryKey of portfolioQueryFamilies(KALSHI_VENUE_ID)) {
    Engine.context.PredictPortfolioService.invalidateQueries({
      queryKey,
    }).catch((error: unknown) => {
      Logger.error(
        ensureError(error, 'KalshiDemoOnboardingGate.invalidatePortfolioReads'),
        'PredictNext: failed to refresh portfolio reads after onboarding',
      );
    });
  }
};

interface KalshiDemoOnboardingFlowProps {
  client: KalshiOnboardingApi;
  walletAddress?: string;
  intent: AccountSetupIntent;
  onStatus: (state: KalshiOnboardingState) => void;
  onFailure: (failure: OnboardingFailure) => void;
  onClose: () => void;
}

/** Mounted only while the gate holds an explicit setup request. */
const KalshiDemoOnboardingFlow = ({
  client,
  walletAddress,
  intent,
  onStatus,
  onFailure,
  onClose,
}: KalshiDemoOnboardingFlowProps) => {
  const networkTier = useNetworkTier();
  const hardwareTier: HardwareTier | null = getHardwareTier();
  const network = kalshiDemoPayoutNetwork();
  const pollIntervalMs =
    hardwareTier === 'LOW' ||
    networkTier === 'SLOW_CELLULAR' ||
    networkTier === 'NONE'
      ? CONSTRAINED_POLL_INTERVAL_MS
      : POLL_INTERVAL_MS;
  const onboarding = useKalshiDemoOnboarding({
    client,
    walletAddress,
    network,
    pollIntervalMs,
    canPoll: () => networkTier !== 'NONE',
    initialIntent: intent,
    onStatus,
    onFailure,
    onClose,
  });

  useEffect(() => {
    // An account that is already active needs no sheet; release the gate so
    // Home's passive observation can resume.
    if (onboarding.state.step === 'hidden') {
      onClose();
    }
  }, [onClose, onboarding.state.step]);

  if (
    onboarding.state.step === 'loading' ||
    onboarding.state.step === 'hidden'
  ) {
    return null;
  }
  return (
    <KalshiDemoOnboardingModal
      onboarding={onboarding}
      walletAddress={walletAddress}
      network={network}
    />
  );
};

interface KalshiDemoOnboardingGateProps {
  children: React.ReactNode;
}

/**
 * Owns the Account Readiness adapter for the current canonical identity and
 * hosts the explicit Kalshi demo setup flow. Entering or refocusing Home only
 * reads status; setup mounts only after a card press, and closing it cancels
 * the flow before a single passive read resumes.
 */
export const KalshiDemoOnboardingGate = ({
  children,
}: KalshiDemoOnboardingGateProps) => {
  const config = useSelector(selectPredictConfig);
  const signedIn = useSelector(selectIsSignedIn);
  const walletUnlocked = useSelector(selectIsUnlocked);
  const evmAddress = useSelector(selectEvmAddress);
  const canonicalProfileId = useSelector(selectCanonicalProfileId) ?? null;
  const venueId = useNextVenueId();
  const authProfile = resolveVenueAuthProfile(config);
  const apiUrl = getPredictApiUrl();
  const isKalshi = venueId === KALSHI_VENUE_ID;
  const eligible =
    isKalshi &&
    authProfile !== undefined &&
    signedIn &&
    walletUnlocked &&
    canonicalProfileId !== null;
  const scope =
    eligible && authProfile !== undefined
      ? `${canonicalProfileId}|${venueId}|${apiUrl ?? ''}|${authProfile.id}`
      : null;

  const [setupRequest, setSetupRequest] = useState<{
    id: number;
    intent: AccountSetupIntent;
  } | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const nextRequestId = useRef(0);
  const observationPauseRef = useRef<(() => void) | null>(null);
  const walletAddress = kalshiDemoPayoutWallet(evmAddress);

  const client = useMemo(
    () => (scope ? createKalshiOnboardingClient() : null),
    [scope],
  );

  const openSetup = useCallback((intent: AccountSetupIntent) => {
    // Home's read is cancelled synchronously, before the flow mounts.
    observationPauseRef.current?.();
    setSetupRequest((current) => {
      if (current) {
        return current;
      }
      nextRequestId.current += 1;
      return { id: nextRequestId.current, intent };
    });
  }, []);

  const session = useMemo(() => {
    if (!client) {
      return null;
    }
    let disposed = false;
    const instance = createKalshiAccountReadinessAdapter({
      client,
      openSetup,
      isCurrent: () => !disposed,
    });
    return {
      instance,
      dispose: () => {
        disposed = true;
        instance.dispose();
      },
    };
  }, [client, openSetup]);
  const adapter = session?.instance ?? null;

  useEffect(() => () => session?.dispose(), [session]);

  // One portfolio invalidation per not-ready-to-ready transition. An initial
  // discovery of `active` has no previous snapshot, so it does not invalidate.
  const lastReadiness = useRef<AccountReadiness | null>(null);
  useEffect(() => {
    lastReadiness.current = null;
    if (!adapter) {
      return undefined;
    }
    return adapter.subscribe((snapshot) => {
      const previous = lastReadiness.current;
      lastReadiness.current = snapshot.readiness;
      if (
        previous !== null &&
        previous !== 'ready' &&
        snapshot.readiness === 'ready'
      ) {
        invalidatePortfolioReads();
      }
    });
  }, [adapter]);

  const closeSetup = useCallback(() => {
    setSetupRequest(null);
    adapter?.resetSetup();
    // One passive status read once the flow has released the gate.
    setRefreshToken((token) => token + 1);
  }, [adapter]);

  // A new identity or environment owns a new adapter and cannot inherit the
  // old flow.
  useEffect(() => {
    setSetupRequest(null);
  }, [scope]);

  // The Funding Wallet shown in setup can change while the sheet is open;
  // the flow's typed values and writes no longer belong to it.
  const previousWallet = useRef(evmAddress);
  useEffect(() => {
    if (previousWallet.current === evmAddress) {
      return;
    }
    previousWallet.current = evmAddress;
    if (setupRequest) {
      closeSetup();
    }
  }, [closeSetup, evmAddress, setupRequest]);

  // A portfolio read can discover a not-yet-enabled account without opening
  // setup. Coalesce that signal into one passive status refresh.
  const accountNotEnabled = useVenueAccountNotEnabled(KALSHI_VENUE_ID);
  const wasNotEnabled = useRef(accountNotEnabled);
  useEffect(() => {
    if (accountNotEnabled && !wasNotEnabled.current) {
      setRefreshToken((token) => token + 1);
    }
    wasNotEnabled.current = accountNotEnabled;
  }, [accountNotEnabled]);

  return (
    <AccountReadinessProvider
      adapter={adapter}
      accountActions={isKalshi ? 'readiness_gated' : 'unchanged'}
      scope={scope}
      canonicalProfileId={canonicalProfileId}
      eligibility={eligible ? 'eligible' : 'unavailable'}
      setup={setupRequest ? 'open' : 'closed'}
      refreshToken={refreshToken}
      observationPauseRef={observationPauseRef}
    >
      {children}
      {setupRequest && client && adapter ? (
        <KalshiDemoOnboardingFlow
          key={setupRequest.id}
          client={client}
          walletAddress={walletAddress}
          intent={setupRequest.intent}
          onStatus={(state) => adapter.publishStatus(state)}
          onFailure={(failure) => adapter.publishFailure(failure)}
          onClose={closeSetup}
        />
      ) : null}
    </AccountReadinessProvider>
  );
};

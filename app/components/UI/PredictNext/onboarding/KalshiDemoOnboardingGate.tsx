import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';

import Engine from '../../../../core/Engine';
import { useNetworkTier } from '../../../../hooks/useNetworkTier';
import { selectEvmAddress } from '../../../../selectors/accountsController';
import { selectIsSignedIn } from '../../../../selectors/identity';
import { selectIsUnlocked } from '../../../../selectors/keyringController';
import { getHardwareTier } from '../../../../util/deviceCapability';
import { ensureError } from '../../../../util/errorUtils';
import Logger from '../../../../util/Logger';
import { isKalshiDeviceKeyEnabled } from '../auth/kalshiDeviceKey';
import { portfolioQueryFamilies } from '../queries/portfolioQueries';
import { selectPredictConfig } from '../selectors/predictConfig';
import { KALSHI_VENUE_ID } from '../types';
import { createKalshiOnboardingClient } from './internal/createKalshiOnboardingClient';
import {
  isKalshiDemoOnboardingEnabled,
  kalshiDemoPayoutNetwork,
  kalshiDemoPayoutWallet,
} from './internal/demoOnboardingConfig';
import { KalshiDemoOnboardingModal } from './internal/KalshiDemoOnboardingModal';
import {
  useKalshiDemoOnboarding,
  type KalshiOnboardingApi,
} from './internal/useKalshiDemoOnboarding';

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
}

const KalshiDemoOnboardingFlow = ({
  client,
  walletAddress,
}: KalshiDemoOnboardingFlowProps) => {
  const networkTier = useNetworkTier();
  const hardwareTier = getHardwareTier();
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
    onActivated: invalidatePortfolioReads,
  });

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
 * Temporary Kalshi demo onboarding (mobile plan §7). Reads onboarding status
 * once per mount of the Predict stack and opens the sheet when this profile
 * is not activated on Kalshi. *Not now* hides it until the next mount.
 * Renders nothing extra unless the demo build flag is on, Kalshi is enabled,
 * and the wallet is signed in and unlocked.
 */
export const KalshiDemoOnboardingGate = ({
  children,
}: KalshiDemoOnboardingGateProps) => {
  const config = useSelector(selectPredictConfig);
  const signedIn = useSelector(selectIsSignedIn);
  const walletUnlocked = useSelector(selectIsUnlocked);
  const evmAddress = useSelector(selectEvmAddress);
  const enabled =
    isKalshiDemoOnboardingEnabled() &&
    isKalshiDeviceKeyEnabled(config) &&
    signedIn &&
    walletUnlocked;
  const client = useMemo(
    () => (enabled ? createKalshiOnboardingClient() : undefined),
    [enabled],
  );
  const walletAddress = kalshiDemoPayoutWallet(evmAddress);

  return (
    <>
      {children}
      {client ? (
        <KalshiDemoOnboardingFlow
          client={client}
          walletAddress={walletAddress}
        />
      ) : null}
    </>
  );
};

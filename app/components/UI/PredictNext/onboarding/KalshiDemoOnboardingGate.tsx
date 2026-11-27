import React, { useEffect, useMemo, useRef } from 'react';
import { useSelector } from 'react-redux';
import { toChecksumHexAddress } from '@metamask/controller-utils';

import Engine from '../../../../core/Engine';
import { useNetworkTier } from '../../../../hooks/useNetworkTier';
import {
  selectEvmAddress,
  selectInternalEvmAccounts,
} from '../../../../selectors/accountsController';
import { selectIsSignedIn } from '../../../../selectors/identity';
import { selectIsUnlocked } from '../../../../selectors/keyringController';
import { getHardwareTier } from '../../../../util/deviceCapability';
import { ensureError } from '../../../../util/errorUtils';
import Logger from '../../../../util/Logger';
import { resolveVenueAuthProfile } from '../config/predictConfig';
import { portfolioQueryFamilies } from '../queries/portfolioQueries';
import { selectPredictConfig } from '../selectors/predictConfig';
import { KALSHI_VENUE_ID } from '../adapters/remote/KalshiRemoteAdapter';
import { createKalshiOnboardingClient } from './internal/createKalshiOnboardingClient';
import type { KalshiPayoutDestinationMode } from './internal/kalshiPayoutDestination';
import { useKalshiPayoutDestinationMode } from './internal/useKalshiPayoutDestinationMode';
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
  mode: KalshiPayoutDestinationMode;
}

const KalshiDemoOnboardingFlow = ({
  client,
  mode,
}: KalshiDemoOnboardingFlowProps) => {
  const networkTier = useNetworkTier();
  const hardwareTier = getHardwareTier();
  const accounts = useSelector(selectInternalEvmAccounts);
  const selectedEvmAddress = useSelector(selectEvmAddress);
  const selectedAccount = accounts.find(
    (candidate) =>
      candidate.address.toLowerCase() === selectedEvmAddress?.toLowerCase(),
  );
  const account = selectedAccount
    ? {
        address: toChecksumHexAddress(selectedAccount.address),
        name: selectedAccount.metadata.name,
      }
    : undefined;
  const walletAddress = mode.kind === 'demo' ? mode.address : account?.address;
  const network = mode.network;
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
      mode={mode}
      account={account}
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
 * Renders nothing extra unless Kalshi is enabled and the wallet is signed in
 * and unlocked.
 */
export const KalshiDemoOnboardingGate = ({
  children,
}: KalshiDemoOnboardingGateProps) => {
  const config = useSelector(selectPredictConfig);
  const signedIn = useSelector(selectIsSignedIn);
  const walletUnlocked = useSelector(selectIsUnlocked);
  const accounts = useSelector(selectInternalEvmAccounts);
  const destination = useKalshiPayoutDestinationMode(KALSHI_VENUE_ID);
  const logged = useRef(new Set<string>());
  const unavailable =
    destination.status !== 'ready'
      ? destination.status === 'loading'
        ? 'loading'
        : destination.reason
      : destination.mode.kind === 'production' && accounts.length === 0
        ? 'no_evm_account'
        : undefined;
  useEffect(() => {
    if (unavailable && !logged.current.has(unavailable)) {
      logged.current.add(unavailable);
      Logger.log('PredictNext: Kalshi onboarding unavailable', {
        reason: unavailable,
      });
    }
  }, [unavailable]);
  const accountNotEnabled = useVenueAccountNotEnabled(KALSHI_VENUE_ID);
  const enabled =
    resolveVenueAuthProfile(config) !== undefined &&
    signedIn &&
    walletUnlocked &&
    !unavailable;
  const client = useMemo(
    () => (enabled ? createKalshiOnboardingClient() : undefined),
    [enabled],
  );
  return (
    <>
      {children}
      {client && destination.status === 'ready' ? (
        <KalshiDemoOnboardingFlow
          key={accountNotEnabled ? 'account-not-enabled' : 'initial'}
          client={client}
          mode={destination.mode}
        />
      ) : null}
    </>
  );
};

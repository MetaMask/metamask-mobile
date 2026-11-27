import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';

import Engine from '../../../../core/Engine';
import { useNetworkTier } from '../../../../hooks/useNetworkTier';
import { selectEvmAddress } from '../../../../selectors/accountsController';
import { selectIsSignedIn } from '../../../../selectors/identity';
import { selectIsUnlocked } from '../../../../selectors/keyringController';
import { getHardwareTier } from '../../../../util/deviceCapability';
import { ensureError } from '../../../../util/errorUtils';
import Logger from '../../../../util/Logger';
import { KALSHI_VENUE_ID } from '../adapters/remote/KalshiRemoteAdapter';
import { resolveVenueAuthProfile } from '../config/predictConfig';
import { portfolioQueryFamilies } from '../queries/portfolioQueries';
import { selectPredictConfig } from '../selectors/predictConfig';
import type { PredictVenueId } from '../types';
import { selectKalshiBannerState } from '../../KYC/Kalshi/kalshiBannerState';
import { createKalshiOnboardingClient } from './internal/createKalshiOnboardingClient';
import {
  kalshiDemoPayoutNetwork,
  kalshiDemoPayoutWallet,
} from './internal/demoOnboardingConfig';
import { KalshiActivationModal } from './internal/KalshiActivationModal';
import { useKalshiActivation } from './internal/useKalshiActivation';

const POLL_INTERVAL_MS = 2_000;
/** Slow or absent links poll less. Unknown (`null`) keeps the default. */
const CONSTRAINED_POLL_INTERVAL_MS = 5_000;

const invalidatePortfolioReads = (): void => {
  for (const queryKey of portfolioQueryFamilies(KALSHI_VENUE_ID)) {
    Engine.context.PredictPortfolioService.invalidateQueries({
      queryKey,
    }).catch((error: unknown) => {
      Logger.error(
        ensureError(error, 'KalshiActivationPrompt.invalidatePortfolioReads'),
        'PredictNext: failed to refresh portfolio reads after activation',
      );
    });
  }
};

interface KalshiActivationPromptProps {
  venueId: PredictVenueId;
}

/**
 * Home's automatic activation trigger. The last Kalshi demo onboarding step
 * registers the withdrawal address; this opens its sheet once kyc-api says
 * approved and predict-api still reports `approved`.
 *
 * This component owns only the auto-open policy. A card-triggered variant
 * uses `useKalshiActivation` and `KalshiActivationModal` directly, so the
 * status read, write and polling stay unchanged.
 */
export const KalshiActivationPrompt = ({
  venueId,
}: KalshiActivationPromptProps): React.ReactElement | null => {
  const config = useSelector(selectPredictConfig);
  const signedIn = useSelector(selectIsSignedIn);
  const walletUnlocked = useSelector(selectIsUnlocked);
  const evmAddress = useSelector(selectEvmAddress);
  const kycApproved = useSelector(selectKalshiBannerState) === 'verified';
  const networkTier = useNetworkTier();
  const hardwareTier = getHardwareTier();

  const authProfile = resolveVenueAuthProfile(config);
  const eligible =
    venueId === KALSHI_VENUE_ID &&
    authProfile !== undefined &&
    signedIn &&
    walletUnlocked;
  const enabled = eligible && kycApproved;
  const client = useMemo(
    () => (enabled ? createKalshiOnboardingClient() : undefined),
    [enabled],
  );
  const canPoll = useCallback(() => networkTier !== 'NONE', [networkTier]);

  const activation = useKalshiActivation({
    client,
    enabled,
    walletAddress: kalshiDemoPayoutWallet(evmAddress),
    network: kalshiDemoPayoutNetwork(),
    pollIntervalMs:
      hardwareTier === 'LOW' ||
      networkTier === 'SLOW_CELLULAR' ||
      networkTier === 'NONE'
        ? CONSTRAINED_POLL_INTERVAL_MS
        : POLL_INTERVAL_MS,
    canPoll,
    onActivated: invalidatePortfolioReads,
  });
  const { refresh } = activation;
  const isFocused = useIsFocused();
  const [dismissed, setDismissed] = useState(false);
  const firstFocus = useRef(true);

  // Re-read predict-api status when Home regains focus, matching the KYC
  // banner beside it. The hook itself reads once when KYC first approves.
  useFocusEffect(
    useCallback(() => {
      setDismissed(false);
      if (firstFocus.current) {
        firstFocus.current = false;
        return undefined;
      }
      refresh();
      return undefined;
    }, [refresh]),
  );

  if (
    !isFocused ||
    dismissed ||
    (!activation.requiresActivation && !activation.completed)
  ) {
    return null;
  }

  return (
    <KalshiActivationModal
      activation={activation}
      walletAddress={kalshiDemoPayoutWallet(evmAddress)}
      network={kalshiDemoPayoutNetwork()}
      onDismiss={() => {
        activation.dismiss();
        setDismissed(true);
      }}
    />
  );
};

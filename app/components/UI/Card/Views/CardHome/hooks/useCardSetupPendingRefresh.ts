import { useCallback, useEffect } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import Engine from '../../../../../../core/Engine';
import { selectOnboardingId } from '../../../../../../core/redux/slices/card';
import type { HardwareTier } from '../../../../../../util/deviceCapability';
import type { NetworkTier } from '../../../../../../hooks/useNetworkTier';
import { deriveMoneyCardSetupPollIntervalMs } from '../../../../Money/utils/moneyMetaMaskCardMode';
import useUserRegistrationStatus from '../../../hooks/useUserRegistrationStatus';
import { cardQueries } from '../../../queries';

/** How often Card home re-checks a card that is still being set up. */
export const CARD_SETUP_PENDING_POLL_MS = 15000;
/** Faster cadence while a card is being created (A08): the wait is brief. */
export const CARD_SETUP_CREATING_POLL_MS = 3000;

interface UseCardSetupPendingRefreshOptions {
  /** Card home is in a setup-pending waiting state (A07 / A08 / A09). */
  isPending: boolean;
  isAuthenticated: boolean;
  isFocused: boolean;
  /**
   * Signed-in poll cadence in ms. `null` means the network tier is offline,
   * so neither the interval nor a foreground refetch runs. Defaults to
   * `CARD_SETUP_PENDING_POLL_MS`.
   */
  pollIntervalMs?: number | null;
  /**
   * Skip the signed-in interval when Immersve is already polling card home
   * data. A foreground return still refreshes once.
   */
  suspendSignedInPoll?: boolean;
}

/**
 * Card home's setup poll, using the same offline / slow-link split as Money
 * home. A fast or unknown network keeps this screen's own cadence: 3s while
 * the card is being created, 15s while it is in review. Hardware is read so
 * the screen follows the device matrix; the Money helper uses the network
 * column, and `null` hardware stays on that column.
 */
export function deriveCardHomeSetupPollIntervalMs(
  hardware: HardwareTier | null,
  network: NetworkTier | null,
  isCreating: boolean,
): number | null {
  const tierInterval = deriveMoneyCardSetupPollIntervalMs(hardware, network);
  if (tierInterval === null) {
    return null;
  }
  if (tierInterval >= CARD_SETUP_PENDING_POLL_MS) {
    return CARD_SETUP_PENDING_POLL_MS;
  }
  return isCreating ? CARD_SETUP_CREATING_POLL_MS : CARD_SETUP_PENDING_POLL_MS;
}

const forceFetchCardHomeData = () => {
  Engine.context.CardController.fetchCardHomeData({ force: true }).catch(
    () => undefined,
  );
};

/**
 * Keeps the Card home setup-pending states up to date so they move on by
 * themselves once the card is ready.
 *
 * Signed in: force-refetches Card home data on the pending cadence while a
 * pending state is on screen and focused, and again whenever the app returns
 * to the foreground. It stops as soon as the pending state ends, the screen
 * loses focus, or it unmounts.
 *
 * Signed out (A09): polls the onboarding registration status, the same check
 * the Veriff verifying screen uses, until verification leaves PENDING.
 *
 * Returns a refresh handler for pull-to-refresh.
 */
export const useCardSetupPendingRefresh = ({
  isPending,
  isAuthenticated,
  isFocused,
  pollIntervalMs = CARD_SETUP_PENDING_POLL_MS,
  suspendSignedInPoll = false,
}: UseCardSetupPendingRefreshOptions) => {
  const isActive = isPending && isFocused;
  const isSignedInActive =
    isActive && isAuthenticated && pollIntervalMs != null;
  const isSignedOutActive =
    isActive && !isAuthenticated && pollIntervalMs != null;

  // Signed in: poll Card home data.
  useEffect(() => {
    if (!isSignedInActive || pollIntervalMs == null) {
      return undefined;
    }
    const interval = suspendSignedInPoll
      ? null
      : setInterval(forceFetchCardHomeData, pollIntervalMs);
    const subscription = AppState.addEventListener(
      'change',
      (state: AppStateStatus) => {
        if (state === 'active') {
          forceFetchCardHomeData();
        }
      },
    );
    return () => {
      if (interval) {
        clearInterval(interval);
      }
      subscription.remove();
    };
  }, [isSignedInActive, pollIntervalMs, suspendSignedInPoll]);

  // Signed out: poll the onboarding registration status.
  const { startPolling, stopPolling } = useUserRegistrationStatus();
  useEffect(() => {
    if (!isSignedOutActive) {
      return undefined;
    }
    startPolling();
    return () => stopPolling();
  }, [isSignedOutActive, startPolling, stopPolling]);

  const queryClient = useQueryClient();
  const onboardingId = useSelector(selectOnboardingId);
  const refreshRegistrationStatus = useCallback(async () => {
    if (!onboardingId) {
      return;
    }
    await queryClient.invalidateQueries({
      queryKey: cardQueries.dashboard.keys.registrationStatus(onboardingId),
    });
  }, [onboardingId, queryClient]);

  return { refreshRegistrationStatus };
};

export default useCardSetupPendingRefresh;

import { useCallback, useEffect } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import Engine from '../../../../../../core/Engine';
import { selectOnboardingId } from '../../../../../../core/redux/slices/card';
import useUserRegistrationStatus from '../../../hooks/useUserRegistrationStatus';
import { cardQueries } from '../../../queries';

/** How often Card home re-checks a card that is still being set up. */
export const CARD_SETUP_PENDING_POLL_MS = 15000;

interface UseCardSetupPendingRefreshOptions {
  /** The shared "Setting up your card" view is on screen (A07 / A08 / A09). */
  isPending: boolean;
  isAuthenticated: boolean;
  isFocused: boolean;
}

const forceFetchCardHomeData = () => {
  Engine.context.CardController.fetchCardHomeData({ force: true }).catch(
    () => undefined,
  );
};

/**
 * Keeps the "Setting up your card" view up to date so it moves on by itself
 * once the card is ready.
 *
 * Signed in: force-refetches Card home data every 15s while the view is on
 * screen and focused, and again whenever the app returns to the foreground.
 * It stops as soon as the pending alerts clear (the view goes away), the
 * screen loses focus, or it unmounts.
 *
 * Signed out (A09): polls the onboarding registration status, the same check
 * the Veriff verifying screen uses, until verification leaves PENDING.
 *
 * Returns a refresh handler for pull-to-refresh on the view.
 */
export const useCardSetupPendingRefresh = ({
  isPending,
  isAuthenticated,
  isFocused,
}: UseCardSetupPendingRefreshOptions) => {
  const isActive = isPending && isFocused;
  const isSignedInActive = isActive && isAuthenticated;
  const isSignedOutActive = isActive && !isAuthenticated;

  // Signed in: poll Card home data.
  useEffect(() => {
    if (!isSignedInActive) {
      return undefined;
    }
    const interval = setInterval(
      forceFetchCardHomeData,
      CARD_SETUP_PENDING_POLL_MS,
    );
    const subscription = AppState.addEventListener(
      'change',
      (state: AppStateStatus) => {
        if (state === 'active') {
          forceFetchCardHomeData();
        }
      },
    );
    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [isSignedInActive]);

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
  const refreshRegistrationStatus = useCallback(() => {
    if (!onboardingId) {
      return Promise.resolve();
    }
    return queryClient.invalidateQueries({
      queryKey: cardQueries.dashboard.keys.registrationStatus(onboardingId),
    });
  }, [onboardingId, queryClient]);

  return { refreshRegistrationStatus };
};

export default useCardSetupPendingRefresh;

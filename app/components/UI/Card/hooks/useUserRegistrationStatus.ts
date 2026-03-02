import { useCallback, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useCardSDK } from '../sdk';
import { CardVerificationState } from '../types';
import { getErrorMessage } from '../util/getErrorMessage';
import { selectOnboardingId } from '../../../../core/redux/slices/card';
import { useSelector } from 'react-redux';
import { cardQueries } from '../queries';

const POLLING_INTERVAL = 5000;

interface UseUserRegistrationStatusReturn {
  verificationState: CardVerificationState | null;
  isLoading: boolean;
  isError: boolean;
  error: string | null;
  startPolling: () => void;
  stopPolling: () => void;
}

/**
 * Hook for polling user registration status.
 * Polling must be started manually via startPolling() and automatically stops
 * when verification reaches a terminal state (VERIFIED, REJECTED, or UNVERIFIED).
 */
export const useUserRegistrationStatus =
  (): UseUserRegistrationStatusReturn => {
    const { sdk, user, setUser } = useCardSDK();
    const onboardingId = useSelector(selectOnboardingId);
    const [isPolling, setIsPolling] = useState(false);

    const { data, isLoading, error } = useQuery({
      queryKey: cardQueries.dashboard.keys.registrationStatus(
        onboardingId ?? '',
      ),
      queryFn: async () => {
        if (!sdk) throw new Error('Card SDK not initialized');
        if (!onboardingId) throw new Error('Onboarding ID not available');
        return sdk.getRegistrationStatus(onboardingId);
      },
      enabled: isPolling && !!sdk && !!onboardingId,
      refetchInterval: (query) => {
        const state = query.state.data?.verificationState;
        if (state && state !== 'PENDING') return false;
        return POLLING_INTERVAL;
      },
    });

    useEffect(() => {
      if (data) {
        setUser(data);
      }
    }, [data, setUser]);

    const verificationState: CardVerificationState =
      data?.verificationState ?? user?.verificationState ?? 'PENDING';

    useEffect(() => {
      if (verificationState !== 'PENDING') {
        setIsPolling(false);
      }
    }, [verificationState]);

    const startPolling = useCallback(() => setIsPolling(true), []);
    const stopPolling = useCallback(() => setIsPolling(false), []);

    return {
      verificationState,
      isLoading,
      isError: !!error,
      error: error ? getErrorMessage(error) : null,
      startPolling,
      stopPolling,
    };
  };

export default useUserRegistrationStatus;

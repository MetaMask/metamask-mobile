import { useCallback, useEffect, useRef, useState } from 'react';
import { useCardSDK } from '../sdk';
import { CardVerificationState } from '../types';
import { getErrorMessage } from '../util/getErrorMessage';
import { selectOnboardingId } from '../../../../core/redux/slices/card';
import { useSelector } from 'react-redux';

interface UseUserRegistrationStatusReturn {
  verificationState: CardVerificationState | null;
  isLoading: boolean;
  isError: boolean;
  error: string | null;
  clearError: () => void;
  startPolling: () => void;
  stopPolling: () => void;
}

/**
 * Hook for polling user registration status
 * Polls the registration status using getRegistrationStatus from CardSDK.
 * Polling must be started manually via startPolling() and automatically stops
 * when verification reaches a terminal state (VERIFIED, REJECTED, or UNVERIFIED).
 * Only PENDING state continues polling.
 */
export const useUserRegistrationStatus =
  (): UseUserRegistrationStatusReturn => {
    const { sdk, user, setUser } = useCardSDK();
    const [verificationState, setVerificationState] =
      useState<CardVerificationState>(user?.verificationState || 'PENDING');
    const [isLoading, setIsLoading] = useState(false);
    const [isError, setIsError] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const onboardingId = useSelector(selectOnboardingId);

    // Default polling interval: 5 seconds
    const POLLING_INTERVAL = 5000;

    const clearError = useCallback(() => {
      setError(null);
      setIsError(false);
    }, []);

    const fetchRegistrationStatus = useCallback(async () => {
      if (!sdk) {
        const errorMessage = 'Card SDK not initialized';
        setError(errorMessage);
        setIsError(true);
        return;
      }

      if (!onboardingId) {
        const errorMessage = 'Onboarding ID not available';
        setError(errorMessage);
        setIsError(true);
        return;
      }

      try {
        setIsLoading(true);
        setIsError(false);
        setError(null);

        const response = await sdk.getRegistrationStatus(onboardingId);
        setUser(response);
        setVerificationState(response.verificationState || 'PENDING');
        setIsLoading(false);
      } catch (err) {
        const errorMessage = getErrorMessage(err);
        setError(errorMessage);
        setIsError(true);
        setIsLoading(false);
      }
    }, [setUser, onboardingId, sdk]);

    const startPolling = useCallback(() => {
      // Clear any existing interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      // Fetch immediately
      fetchRegistrationStatus();

      // Set up polling interval
      intervalRef.current = setInterval(() => {
        fetchRegistrationStatus();
      }, POLLING_INTERVAL);
    }, [fetchRegistrationStatus]);

    const stopPolling = useCallback(() => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }, []);

    useEffect(() => {
      // Auto-stop polling when verification reaches terminal state (not PENDING)
      if (verificationState !== 'PENDING' && intervalRef.current) {
        stopPolling();
      }

      return stopPolling;
    }, [verificationState, stopPolling]);

    return {
      verificationState,
      isLoading,
      isError,
      error,
      clearError,
      startPolling,
      stopPolling,
    };
  };

export default useUserRegistrationStatus;

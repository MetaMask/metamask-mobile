import { useCallback, useEffect, useRef, useState } from 'react';
import { useCardSDK } from '../sdk';
import { UserResponse, VERIFICATION_STATUS } from '../types';
import { getErrorMessage } from '../util/getErrorMessage';
import { selectOnboardingId } from '../../../../core/redux/slices/card';
import { useSelector } from 'react-redux';

interface UseUserRegistrationStatusReturn {
  verificationState: VERIFICATION_STATUS | null;
  userResponse: UserResponse | null;
  isLoading: boolean;
  isError: boolean;
  error: string | null;
  clearError: () => void;
  startPolling: () => void;
  stopPolling: () => void;
}

/**
 * Hook for polling user registration status
 * Automatically polls the registration status using getRegistrationStatus from CardSDK
 * at regular intervals when verificationState is PENDING
 */
export const useUserRegistrationStatus =
  (): UseUserRegistrationStatusReturn => {
    const { sdk } = useCardSDK();
    const [verificationState, setVerificationState] =
      useState<VERIFICATION_STATUS | null>(null);
    const [userResponse, setUserResponse] = useState<UserResponse | null>(null);
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

        setUserResponse(response);
        setVerificationState(response.verificationState || null);
        setIsLoading(false);
      } catch (err) {
        const errorMessage = getErrorMessage(err);
        setError(errorMessage);
        setIsError(true);
        setIsLoading(false);
      }
    }, [onboardingId, sdk]);

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

    // Auto-manage polling based on verification state
    useEffect(() => {
      if (verificationState === 'PENDING') {
        // Only start auto-polling if not already polling
        if (!intervalRef.current) {
          intervalRef.current = setInterval(() => {
            fetchRegistrationStatus();
          }, POLLING_INTERVAL);
        }
      } else if (verificationState !== null) {
        stopPolling();
      }

      return stopPolling;
    }, [verificationState, fetchRegistrationStatus, stopPolling]);

    return {
      verificationState,
      userResponse,
      isLoading,
      isError,
      error,
      clearError,
      startPolling,
      stopPolling,
    };
  };

export default useUserRegistrationStatus;

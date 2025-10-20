import { useCallback, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { useCardSDK } from '../sdk';
import { CardLocation, UserResponse, VERIFICATION_STATUS } from '../types';
import { getErrorMessage } from '../util/getErrorMessage';
import { selectSelectedCountry } from '../../../../core/redux/slices/card';

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
    const selectedCountry = useSelector(selectSelectedCountry);
    const [verificationState, setVerificationState] =
      useState<VERIFICATION_STATUS | null>(null);
    const [userResponse, setUserResponse] = useState<UserResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isError, setIsError] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

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

      try {
        setIsLoading(true);
        setIsError(false);
        setError(null);

        const location: CardLocation =
          selectedCountry === 'US' ? 'us' : 'international';
        const response = await sdk.getRegistrationStatus(location);

        setUserResponse(response);
        setVerificationState(response.verificationState || null);
        setIsLoading(false);
      } catch (err) {
        const errorMessage = getErrorMessage(err);
        setError(errorMessage);
        setIsError(true);
        setIsLoading(false);
      }
    }, [sdk, selectedCountry]);

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
        startPolling();
      } else if (verificationState !== null) {
        stopPolling();
      }

      return stopPolling;
    }, [verificationState, startPolling, stopPolling]);

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

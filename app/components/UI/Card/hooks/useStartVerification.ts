import { useCallback, useEffect, useState } from 'react';
import { useCardSDK } from '../sdk';
import { StartUserVerificationResponse, CardError } from '../types';
import Logger from '../../../../util/Logger';
import { getErrorMessage } from '../util/getErrorMessage';
import { selectOnboardingId } from '../../../../core/redux/slices/card';
import { useSelector } from 'react-redux';

interface UseStartVerificationReturn {
  startVerification: () => Promise<StartUserVerificationResponse | null>;
  data: StartUserVerificationResponse | null;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  error: string | null;
  clearError: () => void;
}

/**
 * Hook for starting user verification process
 * Calls the CardSDK startUserVerification method and manages loading, success, and error states
 */
export const useStartVerification = (): UseStartVerificationReturn => {
  const { sdk } = useCardSDK();
  const [data, setData] = useState<StartUserVerificationResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const onboardingId = useSelector(selectOnboardingId);

  const clearError = useCallback(() => {
    setError(null);
    setIsError(false);
  }, []);

  const startVerification =
    useCallback(async (): Promise<StartUserVerificationResponse | null> => {
      if (!sdk) {
        const errorMessage = 'Card SDK not initialized';
        setError(errorMessage);
        setIsError(true);
        return null;
      }

      if (!onboardingId) {
        const errorMessage = 'Onboarding ID not found';
        setError(errorMessage);
        setIsError(true);
        return null;
      }

      try {
        setIsLoading(true);
        setIsError(false);
        setError(null);
        setIsSuccess(false);

        const response = await sdk.startUserVerification({
          onboardingId,
        });

        setData(response);
        setIsSuccess(true);
        setIsLoading(false);

        return response;
      } catch (err) {
        setIsLoading(false);
        setIsSuccess(false);
        setIsError(true);

        let errorMessage = 'Failed to start user verification';

        if (err instanceof CardError) {
          errorMessage = getErrorMessage(err);
        } else if (err instanceof Error) {
          errorMessage = err.message;
        }

        setError(errorMessage);
        Logger.error(
          err instanceof Error ? err : new Error(String(err)),
          'useStartVerification::Error starting user verification',
        );

        return null;
      }
    }, [onboardingId, sdk]);

  // Automatically fetch verification data on mount
  useEffect(() => {
    if (sdk && onboardingId) {
      startVerification();
    }
  }, [onboardingId, sdk, startVerification]);

  return {
    startVerification,
    data,
    isLoading,
    isSuccess,
    isError,
    error,
    clearError,
  };
};

export default useStartVerification;

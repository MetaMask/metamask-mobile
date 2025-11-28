import { useCallback, useState } from 'react';
import { useCardSDK } from '../sdk';
import { getErrorMessage } from '../util/getErrorMessage';
import { RegisterPersonalDetailsRequest, RegisterUserResponse } from '../types';

/**
 * Hook for registering personal details
 * Manages isSuccess, isLoading, and isError states
 */
const useRegisterPersonalDetails = (): {
  registerPersonalDetails: (
    request: RegisterPersonalDetailsRequest,
  ) => Promise<RegisterUserResponse>;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  error: string | null;
  clearError: () => void;
  reset: () => void;
} => {
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { sdk } = useCardSDK();

  const clearError = useCallback(() => {
    setError(null);
    setIsError(false);
  }, []);

  const reset = useCallback(() => {
    setIsLoading(false);
    setIsSuccess(false);
    setIsError(false);
    setError(null);
  }, []);

  const registerPersonalDetails = useCallback(
    async (
      request: RegisterPersonalDetailsRequest,
    ): Promise<RegisterUserResponse> => {
      if (!sdk) {
        throw new Error('Card SDK not initialized');
      }

      try {
        setIsLoading(true);
        setIsError(false);
        setIsSuccess(false);
        setError(null);

        const registerPersonalDetailsResponse =
          await sdk.registerPersonalDetails(request);

        setIsSuccess(true);

        return registerPersonalDetailsResponse;
      } catch (err) {
        const errorMessage = getErrorMessage(err);
        setError(errorMessage);
        setIsError(true);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [sdk],
  );

  return {
    registerPersonalDetails,
    isLoading,
    isSuccess,
    isError,
    error,
    clearError,
    reset,
  };
};

export default useRegisterPersonalDetails;

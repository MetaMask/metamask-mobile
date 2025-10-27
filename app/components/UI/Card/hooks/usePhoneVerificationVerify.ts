import { useCallback, useState } from 'react';
import { useCardSDK } from '../sdk';
import { getErrorMessage } from '../util/getErrorMessage';
import { PhoneVerificationVerifyRequest, RegisterUserResponse } from '../types';

/**
 * Hook for verifying phone verification
 * Manages isSuccess, isLoading, and isError states
 */
const usePhoneVerificationVerify = (): {
  verifyPhoneVerification: (
    request: PhoneVerificationVerifyRequest,
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

  const verifyPhoneVerification = useCallback(
    async (
      request: PhoneVerificationVerifyRequest,
    ): Promise<RegisterUserResponse> => {
      if (!sdk) {
        throw new Error('Card SDK not initialized');
      }

      try {
        setIsLoading(true);
        setIsError(false);
        setIsSuccess(false);
        setError(null);

        const registerUserResponse = await sdk.phoneVerificationVerify(request);

        setIsSuccess(true);

        return registerUserResponse;
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
    verifyPhoneVerification,
    isLoading,
    isSuccess,
    isError,
    error,
    clearError,
    reset,
  };
};

export default usePhoneVerificationVerify;

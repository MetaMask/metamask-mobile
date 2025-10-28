import { useCallback, useState } from 'react';
import { useCardSDK } from '../sdk';
import { getErrorMessage } from '../util/getErrorMessage';
import {
  EmailVerificationVerifyRequest,
  EmailVerificationVerifyResponse,
} from '../types';

/**
 * Hook for verifying email verification
 * Manages isSuccess, isLoading, and isError states
 */
const useEmailVerificationVerify = (): {
  verifyEmailVerification: (
    request: EmailVerificationVerifyRequest,
  ) => Promise<EmailVerificationVerifyResponse>;
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

  const verifyEmailVerification = useCallback(
    async (
      request: EmailVerificationVerifyRequest,
    ): Promise<EmailVerificationVerifyResponse> => {
      if (!sdk) {
        throw new Error('Card SDK not initialized');
      }

      try {
        setIsLoading(true);
        setIsError(false);
        setIsSuccess(false);
        setError(null);

        const emailVerificationVerifyResponse =
          await sdk.emailVerificationVerify(request);

        setIsSuccess(true);

        return emailVerificationVerifyResponse;
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
    verifyEmailVerification,
    isLoading,
    isSuccess,
    isError,
    error,
    clearError,
    reset,
  };
};

export default useEmailVerificationVerify;

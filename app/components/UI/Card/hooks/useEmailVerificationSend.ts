import { useCallback, useState } from 'react';
import { useCardSDK } from '../sdk';
import { getErrorMessage } from '../util/getErrorMessage';
import { CardLocation, EmailVerificationSendResponse } from '../types';

/**
 * Hook for sending email verification
 * Manages isSuccess, isLoading, and isError states
 */
const useEmailVerificationSend = (): {
  sendEmailVerification: (
    email: string,
    location: CardLocation,
  ) => Promise<EmailVerificationSendResponse>;
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

  const sendEmailVerification = useCallback(
    async (
      email: string,
      location: CardLocation,
    ): Promise<EmailVerificationSendResponse> => {
      if (!sdk) {
        throw new Error('Card SDK not initialized');
      }

      try {
        setIsLoading(true);
        setIsError(false);
        setIsSuccess(false);
        setError(null);

        const emailVerificationSendResponse = await sdk.emailVerificationSend({
          email,
          location,
        });

        setIsSuccess(true);

        return emailVerificationSendResponse;
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
    sendEmailVerification,
    isLoading,
    isSuccess,
    isError,
    error,
    clearError,
    reset,
  };
};

export default useEmailVerificationSend;

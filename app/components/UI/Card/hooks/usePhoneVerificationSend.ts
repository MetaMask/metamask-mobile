import { useCallback, useState } from 'react';
import { useCardSDK } from '../sdk';
import { getErrorMessage } from '../util/getErrorMessage';
import {
  PhoneVerificationSendRequest,
  PhoneVerificationSendResponse,
} from '../types';

/**
 * Hook for sending phone verification
 * Manages isSuccess, isLoading, and isError states
 */
const usePhoneVerificationSend = (): {
  sendPhoneVerification: (
    request: PhoneVerificationSendRequest,
  ) => Promise<PhoneVerificationSendResponse>;
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

  const sendPhoneVerification = useCallback(
    async (
      request: PhoneVerificationSendRequest,
    ): Promise<PhoneVerificationSendResponse> => {
      if (!sdk) {
        throw new Error('Card SDK not initialized');
      }

      try {
        setIsLoading(true);
        setIsError(false);
        setIsSuccess(false);
        setError(null);

        const phoneVerificationSendResponse =
          await sdk.phoneVerificationSend(request);

        setIsSuccess(true);

        return phoneVerificationSendResponse;
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
    sendPhoneVerification,
    isLoading,
    isSuccess,
    isError,
    error,
    clearError,
    reset,
  };
};

export default usePhoneVerificationSend;

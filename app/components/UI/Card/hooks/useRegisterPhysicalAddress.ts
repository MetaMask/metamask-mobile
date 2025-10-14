import { useCallback, useState } from 'react';
import { useCardSDK } from '../sdk';
import { getErrorMessage } from '../util/getErrorMessage';
import {
  CardLocation,
  RegisterPhysicalAddressRequest,
  RegisterAddressResponse,
} from '../types';

/**
 * Hook for registering address details
 * Manages isSuccess, isLoading, and isError states
 */
const useRegisterPhysicalAddress = (): {
  registerAddress: (
    request: RegisterPhysicalAddressRequest,
    location: CardLocation,
  ) => Promise<RegisterAddressResponse>;
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

  const registerAddress = useCallback(
    async (
      request: RegisterPhysicalAddressRequest,
      location: CardLocation,
    ): Promise<RegisterAddressResponse> => {
      if (!sdk) {
        throw new Error('Card SDK not initialized');
      }

      try {
        setIsLoading(true);
        setIsError(false);
        setIsSuccess(false);
        setError(null);

        const registerAddressResponse = await sdk.registerPhysicalAddress({
          ...request,
          location,
        });

        setIsSuccess(true);

        return registerAddressResponse;
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
    registerAddress,
    isLoading,
    isSuccess,
    isError,
    error,
    clearError,
    reset,
  };
};

export default useRegisterPhysicalAddress;

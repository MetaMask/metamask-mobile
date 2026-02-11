import { useCallback, useState } from 'react';
import { useCardSDK } from '../sdk';
import { getErrorMessage } from '../util/getErrorMessage';
import Engine from '../../../../core/Engine';
import {
  EmailVerificationVerifyRequest,
  EmailVerificationVerifyResponse,
} from '../types';

/**
 * Gets the user's profile ID (JWT sub claim) from authenticated MetaMask requests.
 * Only returns the profileId if the user is signed in.
 *
 * @returns The profile ID string or undefined if not signed in
 */
const getProfileId = async (): Promise<string | undefined> => {
  try {
    const { AuthenticationController } = Engine.context;
    const isSignedIn = AuthenticationController.isSignedIn();
    if (!isSignedIn) {
      return undefined;
    }
    const sessionProfile = await AuthenticationController.getSessionProfile();
    if (sessionProfile?.profileId) {
      return sessionProfile.profileId;
    }
  } catch {
    // Return undefined if any error occurs
  }
  return undefined;
};

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

        const userExternalId = await getProfileId();

        const emailVerificationVerifyResponse =
          await sdk.emailVerificationVerify({
            ...request,
            ...(userExternalId && { userExternalId }),
          });

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

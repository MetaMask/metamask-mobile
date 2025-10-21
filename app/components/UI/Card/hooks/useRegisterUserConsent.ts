import { useCallback, useState } from 'react';
import { useCardSDK } from '../sdk';
import { selectSelectedCountry } from '../../../../core/redux/slices/card';
import { useSelector } from 'react-redux';
import AppConstants from '../../../../core/AppConstants';
import { getErrorMessage } from '../util/getErrorMessage';

interface UseRegisterUserConsentState {
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  error: string | null;
  consentSetId: string | null;
}

interface UseRegisterUserConsentReturn extends UseRegisterUserConsentState {
  registerUserConsent: (onboardingId: string, userId: string) => Promise<void>;
  clearError: () => void;
  reset: () => void;
}

/**
 * Hook for managing the 2-stage user consent registration process
 *
 * Stage 1: Creates onboarding consent record via createOnboardingConsent
 * Stage 2: Links the user to the consent record via linkUserToConsent
 *
 * @returns {UseRegisterUserConsentReturn} Object containing state and methods for consent registration
 */
export const useRegisterUserConsent = (): UseRegisterUserConsentReturn => {
  const { sdk } = useCardSDK();
  const selectedCountry = useSelector(selectSelectedCountry);
  const [state, setState] = useState<UseRegisterUserConsentState>({
    isLoading: false,
    isSuccess: false,
    isError: false,
    error: null,
    consentSetId: null,
  });

  const clearError = useCallback(() => {
    setState((prevState) => ({
      ...prevState,
      error: null,
      isError: false,
    }));
  }, []);

  const reset = useCallback(() => {
    setState({
      isLoading: false,
      isSuccess: false,
      isError: false,
      error: null,
      consentSetId: null,
    });
  }, []);

  const registerUserConsent = useCallback(
    async (onboardingId: string, userId: string): Promise<void> => {
      if (!sdk) {
        throw new Error('Card SDK not initialized');
      }

      const policy = selectedCountry === 'US' ? 'us' : 'global';

      try {
        // Reset state and start loading
        setState((prevState) => ({
          ...prevState,
          isLoading: true,
          isError: false,
          error: null,
          isSuccess: false,
        }));

        // Stage 1: Create onboarding consent
        const { consentSetId } = await sdk.createOnboardingConsent({
          policy,
          onboardingId,
          consents: {
            eSignAct: 'granted',
            termsAndPrivacy: 'granted',
            marketingNotifications: 'granted',
            smsNotifications: 'granted',
            emailNotifications: 'granted',
          },
          metadata: {
            userAgent: AppConstants.USER_AGENT,
            timestamp: new Date().toISOString(),
          },
        });

        if (!consentSetId) {
          setState((prevState) => ({
            ...prevState,
            isLoading: false,
            isError: true,
            error: 'Failed to create onboarding consent',
          }));
          return;
        }

        // Stage 2: Link user to consent
        await sdk.linkUserToConsent(consentSetId, {
          userId,
        });

        // Update state with success
        setState((prevState) => ({
          ...prevState,
          isLoading: false,
          isSuccess: true,
          consentSetId,
        }));
      } catch (err) {
        const errorMessage = getErrorMessage(err);

        setState((prevState) => ({
          ...prevState,
          isLoading: false,
          isError: true,
          error: errorMessage,
        }));
      }
    },
    [sdk, selectedCountry],
  );

  return {
    ...state,
    registerUserConsent,
    clearError,
    reset,
  };
};

export default useRegisterUserConsent;

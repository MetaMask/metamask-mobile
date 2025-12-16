import { useCallback, useState } from 'react';
import { useCardSDK } from '../sdk';
import { selectSelectedCountry } from '../../../../core/redux/slices/card';
import { useSelector } from 'react-redux';
import AppConstants from '../../../../core/AppConstants';
import { getErrorMessage } from '../util/getErrorMessage';
import { Consent, ConsentSet } from '../types';

interface UseRegisterUserConsentState {
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  error: string | null;
  consentSetId: string | null;
}

interface UseRegisterUserConsentReturn extends UseRegisterUserConsentState {
  createOnboardingConsent: (onboardingId: string) => Promise<string>;
  linkUserToConsent: (consentSetId: string, userId: string) => Promise<void>;
  clearError: () => void;
  reset: () => void;
  getOnboardingConsentSetByOnboardingId: (
    onboardingId: string,
  ) => Promise<ConsentSet | null>;
}

/**
 * Hook for managing the 2-stage user consent registration process
 *
 * IMPORTANT: These operations must be performed in the correct order:
 * Step 7: createOnboardingConsent - Creates consent record and returns consentSetId
 * Step 8: Register physical address (via useRegisterPhysicalAddress)
 * Step 9: Register mailing address if needed (via useRegisterMailingAddress)
 * Step 10: linkUserToConsent - Links the user to the consent record
 *
 * This ensures that if address registration fails, no consent is linked to the user,
 * preventing inconsistent state.
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

  const getOnboardingConsentSetByOnboardingId = useCallback(
    async (onboardingId: string): Promise<ConsentSet | null> => {
      if (!sdk) {
        throw new Error('Card SDK not initialized');
      }

      const consentSetResponse =
        await sdk.getConsentSetByOnboardingId(onboardingId);
      if (!consentSetResponse) {
        return null;
      }

      return consentSetResponse.consentSets[0];
    },
    [sdk],
  );

  /**
   * Step 7: Creates an onboarding consent record
   * This should be called BEFORE address registration
   * @param onboardingId - The onboarding ID
   * @returns The consentSetId to be used later in linkUserToConsent
   */
  const createOnboardingConsent = useCallback(
    async (onboardingId: string): Promise<string> => {
      if (!sdk) {
        throw new Error('Card SDK not initialized');
      }

      const policy = selectedCountry?.key === 'US' ? 'us' : 'global';

      try {
        // Reset state and start loading
        setState((prevState) => ({
          ...prevState,
          isLoading: true,
          isError: false,
          error: null,
          isSuccess: false,
        }));

        // Build consent array based on policy
        const eSignActConsent: Consent = {
          consentType: 'eSignAct',
          consentStatus: 'granted',
          metadata: {
            userAgent: AppConstants.USER_AGENT,
          },
        };
        const consents: Consent[] = [
          ...(policy === 'us' ? [eSignActConsent] : []),
          {
            consentType: 'termsAndPrivacy',
            consentStatus: 'granted',
            metadata: {
              userAgent: AppConstants.USER_AGENT,
            },
          },
          {
            consentType: 'marketingNotifications',
            consentStatus: 'granted',
            metadata: {
              userAgent: AppConstants.USER_AGENT,
            },
          },
          {
            consentType: 'smsNotifications',
            consentStatus: 'granted',
            metadata: {
              userAgent: AppConstants.USER_AGENT,
            },
          },
          {
            consentType: 'emailNotifications',
            consentStatus: 'granted',
            metadata: {
              userAgent: AppConstants.USER_AGENT,
            },
          },
        ];

        // Create onboarding consent
        const { consentSetId } = await sdk.createOnboardingConsent({
          policyType: policy,
          onboardingId,
          consents,
          metadata: {
            userAgent: AppConstants.USER_AGENT,
            timestamp: new Date().toISOString(),
          },
        });

        if (!consentSetId) {
          const error = 'Failed to create onboarding consent';
          setState((prevState) => ({
            ...prevState,
            isLoading: false,
            isError: true,
            error,
          }));
          throw new Error(error);
        }

        // Update state with consentSetId
        setState((prevState) => ({
          ...prevState,
          isLoading: false,
          consentSetId,
        }));

        return consentSetId;
      } catch (err) {
        const errorMessage = getErrorMessage(err);

        setState((prevState) => ({
          ...prevState,
          isLoading: false,
          isError: true,
          error: errorMessage,
        }));

        throw err;
      }
    },
    [sdk, selectedCountry],
  );

  /**
   * Step 10: Links the user to an existing consent record
   * This should be called AFTER successful address registration
   * @param consentSetId - The consent set ID from createOnboardingConsent
   * @param userId - The user ID to link
   */
  const linkUserToConsent = useCallback(
    async (consentSetId: string, userId: string): Promise<void> => {
      if (!sdk) {
        throw new Error('Card SDK not initialized');
      }

      try {
        setState((prevState) => ({
          ...prevState,
          isLoading: true,
          isError: false,
          error: null,
        }));

        // Link user to consent
        await sdk.linkUserToConsent(consentSetId, {
          userId,
        });

        // Update state with success
        setState((prevState) => ({
          ...prevState,
          isLoading: false,
          isSuccess: true,
        }));
      } catch (err) {
        const errorMessage = getErrorMessage(err);

        setState((prevState) => ({
          ...prevState,
          isLoading: false,
          isError: true,
          error: errorMessage,
        }));

        throw err;
      }
    },
    [sdk],
  );

  return {
    ...state,
    getOnboardingConsentSetByOnboardingId,
    createOnboardingConsent,
    linkUserToConsent,
    clearError,
    reset,
  };
};

export default useRegisterUserConsent;

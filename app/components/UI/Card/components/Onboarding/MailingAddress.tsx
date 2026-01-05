import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import Routes from '../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../locales/i18n';
import OnboardingStep from './OnboardingStep';
import { AddressFields } from './PhysicalAddress';
import {
  resetOnboardingState,
  selectConsentSetId,
  selectOnboardingId,
  selectSelectedCountry,
  setConsentSetId,
  setIsAuthenticatedCard,
  setUserCardLocation,
} from '../../../../../core/redux/slices/card';
import { useDispatch, useSelector } from 'react-redux';
import useRegisterMailingAddress from '../../hooks/useRegisterMailingAddress';
import { Box, Text, TextVariant } from '@metamask/design-system-react-native';
import { CardError } from '../../types';
import useRegisterUserConsent from '../../hooks/useRegisterUserConsent';
import { storeCardBaanxToken } from '../../util/cardTokenVault';
import { mapCountryToLocation } from '../../util/mapCountryToLocation';
import { extractTokenExpiration } from '../../util/extractTokenExpiration';
import { useCardSDK } from '../../sdk';
import { MetaMetricsEvents, useMetrics } from '../../../../hooks/useMetrics';
import { CardActions, CardScreens } from '../../util/metrics';

const MailingAddress = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const { setUser } = useCardSDK();
  const onboardingId = useSelector(selectOnboardingId);
  const selectedCountry = useSelector(selectSelectedCountry);
  const consentSetId = useSelector(selectConsentSetId);
  const { trackEvent, createEventBuilder } = useMetrics();

  const {
    createOnboardingConsent,
    linkUserToConsent,
    getOnboardingConsentSetByOnboardingId,
  } = useRegisterUserConsent();

  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');

  useEffect(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_VIEWED)
        .addProperties({
          screen: CardScreens.MAILING_ADDRESS,
        })
        .build(),
    );
  }, [trackEvent, createEventBuilder]);

  const {
    registerAddress,
    isLoading: registerLoading,
    isError: registerIsError,
    error: registerError,
    reset: resetRegisterAddress,
  } = useRegisterMailingAddress();

  const handleAddressLine1Change = useCallback(
    (text: string) => {
      resetRegisterAddress();
      setAddressLine1(text);
    },
    [resetRegisterAddress],
  );

  const handleAddressLine2Change = useCallback(
    (text: string) => {
      resetRegisterAddress();
      setAddressLine2(text);
    },
    [resetRegisterAddress],
  );

  const handleCityChange = useCallback(
    (text: string) => {
      resetRegisterAddress();
      setCity(text);
    },
    [resetRegisterAddress],
  );

  const handleStateChange = useCallback(
    (text: string) => {
      resetRegisterAddress();
      setState(text);
    },
    [resetRegisterAddress],
  );

  const handleZipCodeChange = useCallback(
    (text: string) => {
      resetRegisterAddress();
      setZipCode(text);
    },
    [resetRegisterAddress],
  );

  const isDisabled = useMemo(
    () =>
      registerLoading ||
      registerIsError ||
      !onboardingId ||
      !addressLine1 ||
      !city ||
      (!state && selectedCountry?.key === 'US') ||
      !zipCode,
    [
      registerLoading,
      registerIsError,
      onboardingId,
      addressLine1,
      city,
      state,
      selectedCountry,
      zipCode,
    ],
  );

  const handleContinue = async () => {
    if (
      !onboardingId ||
      !addressLine1 ||
      !city ||
      (!state && selectedCountry?.key === 'US') ||
      !zipCode
    ) {
      return;
    }

    try {
      trackEvent(
        createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
          .addProperties({
            action: CardActions.MAILING_ADDRESS_BUTTON,
          })
          .build(),
      );
      const { accessToken, user: updatedUser } = await registerAddress({
        onboardingId,
        addressLine1,
        addressLine2,
        city,
        usState: state || undefined,
        zip: zipCode,
      });

      if (updatedUser) {
        setUser(updatedUser);
      }

      if (accessToken && updatedUser?.id) {
        // Store the access token for immediate authentication
        const location = mapCountryToLocation(selectedCountry?.key || null);
        const accessTokenExpiresIn = extractTokenExpiration(accessToken);

        const storeResult = await storeCardBaanxToken({
          accessToken,
          accessTokenExpiresAt: accessTokenExpiresIn,
          location,
        });

        if (storeResult.success) {
          // Update Redux state to reflect authentication
          dispatch(setIsAuthenticatedCard(true));
          dispatch(setUserCardLocation(location));
        }

        // Step 10: Handle consent with defensive checks (similar to PhysicalAddress)
        // Defensive fallback in case Redux state was lost or consent creation failed
        let finalConsentSetId = consentSetId;
        let shouldLinkConsent = true;

        if (!finalConsentSetId) {
          // Fallback: Check if consent already exists for this onboarding
          const consentSet =
            await getOnboardingConsentSetByOnboardingId(onboardingId);

          if (consentSet) {
            // Check if consent is already completed (both fields must be present)
            if (consentSet.completedAt && consentSet.userId) {
              // Consent already linked - skip consent operations
              shouldLinkConsent = false;
            } else {
              // Consent exists but not completed - reuse it
              finalConsentSetId = consentSet.consentSetId;
            }
          } else {
            // Safety net: Create consent if it doesn't exist
            // This shouldn't normally happen, but protects against edge cases
            finalConsentSetId = await createOnboardingConsent(onboardingId);
          }
        }

        // Link consent to user (only if needed)
        if (shouldLinkConsent && finalConsentSetId) {
          await linkUserToConsent(finalConsentSetId, updatedUser.id);
          dispatch(setConsentSetId(null));
        }

        // Reset the navigation stack to the verifying registration screen
        navigation.reset({
          index: 0,
          routes: [{ name: Routes.CARD.VERIFYING_REGISTRATION }],
        });
        return;
      }

      // Something is wrong. We need to display the registerError or restart the flow
    } catch (error) {
      if (
        error instanceof CardError &&
        error.message.includes('Onboarding ID not found')
      ) {
        // Onboarding ID not found, navigate back and restart the flow
        dispatch(resetOnboardingState());
        navigation.navigate(Routes.CARD.ONBOARDING.SIGN_UP);
        return;
      }
      // Allow error message to display
    }
  };

  const renderFormFields = () => (
    <AddressFields
      addressLine1={addressLine1}
      handleAddressLine1Change={handleAddressLine1Change}
      addressLine2={addressLine2}
      handleAddressLine2Change={handleAddressLine2Change}
      city={city}
      handleCityChange={handleCityChange}
      state={state}
      handleStateChange={handleStateChange}
      zipCode={zipCode}
      handleZipCodeChange={handleZipCodeChange}
    />
  );

  const renderActions = () => (
    <Box>
      <Button
        variant={ButtonVariants.Primary}
        label={strings('card.card_onboarding.continue_button')}
        size={ButtonSize.Lg}
        onPress={handleContinue}
        width={ButtonWidthTypes.Full}
        isDisabled={isDisabled}
        testID="mailing-address-continue-button"
      />
      {!!registerError && (
        <Text
          variant={TextVariant.BodySm}
          testID="mailing-address-error"
          twClassName="text-error-default"
        >
          {registerError}
        </Text>
      )}
    </Box>
  );

  return (
    <OnboardingStep
      title={strings('card.card_onboarding.mailing_address.title')}
      description={strings('card.card_onboarding.mailing_address.description')}
      formFields={renderFormFields()}
      actions={renderActions()}
    />
  );
};

export default MailingAddress;

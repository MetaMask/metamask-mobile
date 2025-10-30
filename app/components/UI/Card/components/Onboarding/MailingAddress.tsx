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
  selectOnboardingId,
  selectSelectedCountry,
  setIsAuthenticatedCard,
  setUserCardLocation,
} from '../../../../../core/redux/slices/card';
import { useDispatch, useSelector } from 'react-redux';
import useRegisterMailingAddress from '../../hooks/useRegisterMailingAddress';
import { Box, Text, TextVariant } from '@metamask/design-system-react-native';
import { CardError } from '../../types';
import { storeCardBaanxToken } from '../../util/cardTokenVault';
import { mapCountryToLocation } from '../../util/mapCountryToLocation';
import { extractTokenExpiration } from '../../util/extractTokenExpiration';
import { useCardSDK } from '../../sdk';
import { MetaMetricsEvents, useMetrics } from '../../../../hooks/useMetrics';
import { OnboardingActions, OnboardingScreens } from '../../util/metrics';

const MailingAddress = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const { setUser } = useCardSDK();
  const onboardingId = useSelector(selectOnboardingId);
  const selectedCountry = useSelector(selectSelectedCountry);
  const { trackEvent, createEventBuilder } = useMetrics();

  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');

  useEffect(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_ONBOARDING_PAGE_VIEWED)
        .addProperties({
          page: OnboardingScreens.MAILING_ADDRESS,
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
      (!state && selectedCountry === 'US') ||
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
      (!state && selectedCountry === 'US') ||
      !zipCode
    ) {
      return;
    }

    try {
      trackEvent(
        createEventBuilder(MetaMetricsEvents.CARD_ONBOARDING_BUTTON_CLICKED)
          .addProperties({
            action: OnboardingActions.MAILING_ADDRESS_BUTTON_CLICKED,
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

      if (accessToken) {
        // Store the access token for immediate authentication
        const location = mapCountryToLocation(selectedCountry);
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

        // Registration complete
        navigation.navigate(Routes.CARD.ONBOARDING.COMPLETE);
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

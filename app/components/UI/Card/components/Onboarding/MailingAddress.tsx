import React, { useCallback, useMemo, useState } from 'react';
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
  selectOnboardingId,
  selectSelectedCountry,
} from '../../../../../core/redux/slices/card';
import { useSelector } from 'react-redux';
import useRegisterMailingAddress from '../../hooks/useRegisterMailingAddress';
import { Box, Text, TextVariant } from '@metamask/design-system-react-native';

const MailingAddress = () => {
  const navigation = useNavigation();
  const onboardingId = useSelector(selectOnboardingId);
  const selectedCountry = useSelector(selectSelectedCountry);

  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');

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
      const { accessToken } = await registerAddress(
        {
          onboardingId,
          mailingAddressLine1: addressLine1,
          mailingAddressLine2: addressLine2 || undefined,
          mailingCity: city,
          mailingUsState: state || undefined,
          mailingZip: zipCode,
        },
        selectedCountry === 'US' ? 'us' : 'international',
      );

      if (accessToken) {
        // Registration complete
        navigation.navigate(Routes.CARD.ONBOARDING.COMPLETE);
      }

      // Something is wrong. We need to display the registerError or restart the flow
    } catch (error) {
      return;
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
      />
      {!!registerError && (
        <Text variant={TextVariant.BodySm} twClassName="text-error-default">
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

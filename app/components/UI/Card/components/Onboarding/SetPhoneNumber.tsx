import React, { useEffect, useMemo, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { Box, Text, TextVariant } from '@metamask/design-system-react-native';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import TextField, {
  TextFieldSize,
} from '../../../../../component-library/components/Form/TextField';
import Label from '../../../../../component-library/components/Form/Label';
import Routes from '../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../locales/i18n';
import OnboardingStep from './OnboardingStep';
import SelectComponent from '../../../SelectComponent';
import { useDebouncedValue } from '../../../../hooks/useDebouncedValue';
import usePhoneVerificationSend from '../../hooks/usePhoneVerificationSend';
import useRegistrationSettings from '../../hooks/useRegistrationSettings';
import {
  selectContactVerificationId,
  selectSelectedCountry,
} from '../../../../../core/redux/slices/card';
import { useSelector } from 'react-redux';
import { CardError } from '../../types';

const SetPhoneNumber = () => {
  const navigation = useNavigation();

  const contactVerificationId = useSelector(selectContactVerificationId);
  const selectedCountry = useSelector(selectSelectedCountry);

  const { data: registrationSettings } = useRegistrationSettings();

  const selectOptions = useMemo(() => {
    if (!registrationSettings?.countries) {
      return [];
    }
    return [...registrationSettings.countries]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((country) => ({
        key: country.iso3166alpha2,
        value: `+${country.callingCode}`,
        label: `+${country.callingCode} ${country.name}`,
      }));
  }, [registrationSettings]);

  const initialSelectedCountryAreaCode = useMemo(() => {
    if (!registrationSettings?.countries) {
      return '+1';
    }
    const selectedCountryWithCallingCode = registrationSettings.countries.find(
      (country) => country.iso3166alpha2 === selectedCountry,
    );
    return selectedCountryWithCallingCode?.callingCode
      ? `+${selectedCountryWithCallingCode.callingCode}`
      : '+1';
  }, [selectedCountry, registrationSettings]);

  const [phoneNumber, setPhoneNumber] = useState('');
  const [isPhoneNumberError, setIsPhoneNumberError] = useState(false);
  const [selectedCountryAreaCode, setSelectedCountryAreaCode] =
    useState<string>(initialSelectedCountryAreaCode);
  const debouncedPhoneNumber = useDebouncedValue(phoneNumber, 1000);

  const {
    sendPhoneVerification,
    isLoading: phoneVerificationIsLoading,
    isError: phoneVerificationIsError,
    error: phoneVerificationError,
    reset: resetPhoneVerificationSend,
  } = usePhoneVerificationSend();

  const handleContinue = async () => {
    if (
      !debouncedPhoneNumber ||
      !selectedCountryAreaCode ||
      !contactVerificationId
    ) {
      return;
    }

    try {
      const { success } = await sendPhoneVerification({
        phoneCountryCode: selectedCountryAreaCode,
        phoneNumber: debouncedPhoneNumber,
        contactVerificationId,
      });
      if (success) {
        navigation.navigate(Routes.CARD.ONBOARDING.CONFIRM_PHONE_NUMBER, {
          phoneCountryCode: selectedCountryAreaCode,
          phoneNumber: debouncedPhoneNumber,
        });
      }
    } catch (error) {
      if (
        error instanceof CardError &&
        error.message.includes('Invalid or expired contact verification ID')
      ) {
        // navigate back and restart the flow
        navigation.navigate(Routes.CARD.ONBOARDING.SIGN_UP);
      }
      return;
    }
  };

  const handleCountrySelect = (areaCode: string) => {
    resetPhoneVerificationSend();
    setSelectedCountryAreaCode(areaCode);
  };

  const handlePhoneNumberChange = (text: string) => {
    resetPhoneVerificationSend();
    const cleanedText = text.replace(/\D/g, '');
    setPhoneNumber(cleanedText);
  };

  useEffect(() => {
    if (!debouncedPhoneNumber) {
      return;
    }

    setIsPhoneNumberError(
      // 4-15 digits
      !/^\d{4,15}$/.test(debouncedPhoneNumber),
    );
  }, [debouncedPhoneNumber]);

  const isDisabled = useMemo(
    () =>
      !debouncedPhoneNumber ||
      !selectedCountryAreaCode ||
      !contactVerificationId ||
      isPhoneNumberError ||
      phoneVerificationIsLoading ||
      phoneVerificationIsError,
    [
      debouncedPhoneNumber,
      selectedCountryAreaCode,
      contactVerificationId,
      isPhoneNumberError,
      phoneVerificationIsLoading,
      phoneVerificationIsError,
    ],
  );

  const renderFormFields = () => (
    <Box>
      <Label>
        {strings('card.card_onboarding.set_phone_number.phone_number_label')}
      </Label>
      {/* Area code selector */}
      <Box twClassName="flex flex-row items-center justify-center gap-2">
        <Box twClassName="w-24 border border-solid border-border-default rounded-lg py-1">
          <SelectComponent
            options={selectOptions}
            selectedValue={selectedCountryAreaCode}
            onValueChange={handleCountrySelect}
            label={strings(
              'card.card_onboarding.set_phone_number.country_area_code_label',
            )}
            testID="set-phone-number-country-area-code-select"
          />
        </Box>

        {/* Phone number input */}
        <Box twClassName="flex-1">
          <TextField
            autoCapitalize={'none'}
            onChangeText={handlePhoneNumberChange}
            placeholder={strings(
              'card.card_onboarding.set_phone_number.phone_number_placeholder',
            )}
            numberOfLines={1}
            size={TextFieldSize.Lg}
            value={phoneNumber}
            keyboardType="phone-pad"
            maxLength={255}
            accessibilityLabel={strings(
              'card.card_onboarding.set_phone_number.phone_number_label',
            )}
            testID="set-phone-number-phone-number-input"
          />
        </Box>
      </Box>
      {debouncedPhoneNumber && phoneVerificationIsError ? (
        <Text
          variant={TextVariant.BodySm}
          testID="set-phone-number-phone-number-error"
          twClassName="text-error-default"
        >
          {phoneVerificationError}
        </Text>
      ) : isPhoneNumberError ? (
        <Text
          variant={TextVariant.BodySm}
          testID="set-phone-number-phone-number-error"
          twClassName="text-error-default"
        >
          {strings(
            'card.card_onboarding.set_phone_number.invalid_phone_number',
          )}
        </Text>
      ) : null}
    </Box>
  );

  const renderActions = () => (
    <Box twClassName="flex flex-col items-center justify-center gap-2">
      <Text
        variant={TextVariant.BodySm}
        testID="set-phone-number-legal-terms"
        twClassName="text-text-default text-center"
      >
        {strings('card.card_onboarding.set_phone_number.legal_terms')}
      </Text>
      <Button
        variant={ButtonVariants.Primary}
        label={strings('card.card_onboarding.continue_button')}
        size={ButtonSize.Lg}
        onPress={handleContinue}
        width={ButtonWidthTypes.Full}
        isDisabled={isDisabled}
        testID="set-phone-number-continue-button"
      />
    </Box>
  );

  return (
    <OnboardingStep
      title={strings('card.card_onboarding.set_phone_number.title')}
      description={strings('card.card_onboarding.set_phone_number.description')}
      formFields={renderFormFields()}
      actions={renderActions()}
    />
  );
};

export default SetPhoneNumber;

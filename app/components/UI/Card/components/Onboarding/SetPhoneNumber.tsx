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
  resetOnboardingState,
  selectContactVerificationId,
  selectSelectedCountry,
} from '../../../../../core/redux/slices/card';
import { useDispatch, useSelector } from 'react-redux';
import { CardError } from '../../types';
import { MetaMetricsEvents, useMetrics } from '../../../../hooks/useMetrics';
import { CardActions, CardScreens } from '../../util/metrics';
import { countryCodeToFlag } from '../../util/countryCodeToFlag';

const SetPhoneNumber = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const contactVerificationId = useSelector(selectContactVerificationId);
  const selectedCountry = useSelector(selectSelectedCountry);
  const { trackEvent, createEventBuilder } = useMetrics();
  const { data: registrationSettings } = useRegistrationSettings();

  const selectOptions = useMemo(() => {
    if (!registrationSettings?.countries) {
      return [];
    }
    return [...registrationSettings.countries]
      .sort((a, b) => a.name.localeCompare(b.name))
      .filter((country) => country.canSignUp)
      .map((country) => ({
        key: country.iso3166alpha2,
        value: `${country.iso3166alpha2}-${country.callingCode}`,
        label: `${countryCodeToFlag(country.iso3166alpha2)} +${country.callingCode}`,
      }));
  }, [registrationSettings]);

  const initialSelectedCountryAreaCode = useMemo(() => {
    if (!registrationSettings?.countries) {
      return '1';
    }
    const selectedCountryWithCallingCode = registrationSettings.countries.find(
      (country) => country.iso3166alpha2 === selectedCountry,
    );
    return selectedCountryWithCallingCode?.callingCode || '1';
  }, [selectedCountry, registrationSettings]);

  const [phoneNumber, setPhoneNumber] = useState('');
  const [isPhoneNumberError, setIsPhoneNumberError] = useState(false);
  const [selectedCountryAreaCode, setSelectedCountryAreaCode] =
    useState<string>(initialSelectedCountryAreaCode);
  const [selectedCountryIsoCode, setSelectedCountryIsoCode] = useState<string>(
    selectedCountry || 'US',
  );
  const debouncedPhoneNumber = useDebouncedValue(phoneNumber, 1000);

  const {
    sendPhoneVerification,
    isLoading: phoneVerificationIsLoading,
    isError: phoneVerificationIsError,
    error: phoneVerificationError,
    reset: resetPhoneVerificationSend,
  } = usePhoneVerificationSend();

  useEffect(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_VIEWED)
        .addProperties({
          screen: CardScreens.SET_PHONE_NUMBER,
        })
        .build(),
    );
  }, [trackEvent, createEventBuilder]);

  const handleContinue = async () => {
    if (!phoneNumber || !selectedCountryAreaCode || !contactVerificationId) {
      return;
    }

    const isCurrentPhoneNumberValid = /^\d{4,15}$/.test(phoneNumber);
    if (!isCurrentPhoneNumberValid) {
      setIsPhoneNumberError(true);
      return;
    }

    try {
      trackEvent(
        createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
          .addProperties({
            action: CardActions.SET_PHONE_NUMBER_BUTTON,
            phone_number_country_code: selectedCountryAreaCode,
          })
          .build(),
      );
      const { success } = await sendPhoneVerification({
        phoneCountryCode: selectedCountryAreaCode,
        phoneNumber,
        contactVerificationId,
      });

      if (success) {
        navigation.navigate(Routes.CARD.ONBOARDING.CONFIRM_PHONE_NUMBER, {
          phoneCountryCode: selectedCountryAreaCode,
          phoneNumber,
        });
      }
    } catch (err: unknown) {
      if (
        err instanceof CardError &&
        err.message.includes('Invalid or expired contact verification ID')
      ) {
        dispatch(resetOnboardingState());
        navigation.navigate(Routes.CARD.ONBOARDING.SIGN_UP);
      }
      return;
    }
  };

  const handleCountrySelect = (value: string) => {
    resetPhoneVerificationSend();
    const [key, areaCode] = value.split('-');
    setSelectedCountryAreaCode(areaCode);
    setSelectedCountryIsoCode(key);
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

    setIsPhoneNumberError(!/^\d{4,15}$/.test(debouncedPhoneNumber));
  }, [debouncedPhoneNumber]);

  const isDisabled = useMemo(() => {
    const isCurrentPhoneNumberValid = phoneNumber
      ? /^\d{4,15}$/.test(phoneNumber)
      : false;

    return (
      !phoneNumber ||
      !selectedCountryAreaCode ||
      !contactVerificationId ||
      !isCurrentPhoneNumberValid ||
      phoneVerificationIsLoading ||
      phoneVerificationIsError
    );
  }, [
    phoneNumber,
    selectedCountryAreaCode,
    contactVerificationId,
    phoneVerificationIsLoading,
    phoneVerificationIsError,
  ]);

  const renderFormFields = () => (
    <Box>
      <Label>
        {strings('card.card_onboarding.set_phone_number.phone_number_label')}
      </Label>
      {/* Area code selector */}
      <Box twClassName="flex flex-row items-center justify-center gap-2">
        <Box twClassName="flex flex-row items-center border border-solid border-border-default rounded-lg">
          <Box twClassName="w-22">
            <SelectComponent
              options={selectOptions}
              selectedValue={`${selectedCountryIsoCode}-${selectedCountryAreaCode}`}
              onValueChange={handleCountrySelect}
              label={strings(
                'card.card_onboarding.set_phone_number.country_area_code_label',
              )}
              testID="set-phone-number-country-area-code-select"
            />
          </Box>
        </Box>

        {/* Phone number input */}
        <Box twClassName="flex-1">
          <TextField
            autoCapitalize={'none'}
            onChangeText={handlePhoneNumberChange}
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
      {phoneNumber && phoneVerificationIsError ? (
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
      <Button
        variant={ButtonVariants.Primary}
        label={strings('card.card_onboarding.continue_button')}
        size={ButtonSize.Lg}
        onPress={handleContinue}
        width={ButtonWidthTypes.Full}
        isDisabled={isDisabled}
        testID="set-phone-number-continue-button"
      />
      <Text
        variant={TextVariant.BodySm}
        testID="set-phone-number-legal-terms"
        twClassName="text-text-alternative text-center"
      >
        {strings('card.card_onboarding.set_phone_number.legal_terms')}
      </Text>
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

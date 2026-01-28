import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { useDebouncedValue } from '../../../../hooks/useDebouncedValue';
import usePhoneVerificationSend from '../../hooks/usePhoneVerificationSend';
import useRegistrationSettings from '../../hooks/useRegistrationSettings';
import {
  resetOnboardingState,
  selectContactVerificationId,
  selectSelectedCountry,
  selectUserCardLocation,
  setSelectedCountry,
} from '../../../../../core/redux/slices/card';
import { useDispatch, useSelector } from 'react-redux';
import { CardError } from '../../types';
import { MetaMetricsEvents, useMetrics } from '../../../../hooks/useMetrics';
import { CardActions, CardScreens } from '../../util/metrics';
import { countryCodeToFlag } from '../../util/countryCodeToFlag';
import {
  clearOnValueChange,
  createRegionSelectorModalNavigationDetails,
  Region,
  setOnValueChange,
} from './RegionSelectorModal';
import { TouchableOpacity } from 'react-native';
import { useCardSDK } from '../../sdk';

const US_PHONE_REGEX = /^[2-9]\d{2}[2-9]\d{6}$/;

const SetPhoneNumber = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const contactVerificationId = useSelector(selectContactVerificationId);
  const initialSelectedCountry = useSelector(selectSelectedCountry);
  const { trackEvent, createEventBuilder } = useMetrics();
  const { data: registrationSettings } = useRegistrationSettings();
  const { user } = useCardSDK();
  const userCardLocation = useSelector(selectUserCardLocation);

  const regions: Region[] = useMemo(() => {
    if (!registrationSettings?.countries) {
      return [];
    }
    return [...registrationSettings.countries]
      .sort((a, b) => a.name.localeCompare(b.name))
      .filter((country) => country.canSignUp)
      .map((country) => ({
        key: country.iso3166alpha2,
        name: country.name,
        emoji: countryCodeToFlag(country.iso3166alpha2),
        areaCode: country.callingCode,
      }));
  }, [registrationSettings]);

  const selectedCountry = useMemo(
    () =>
      initialSelectedCountry ||
      regions.find((region) => region.key === user?.countryOfResidence),
    [initialSelectedCountry, regions, user?.countryOfResidence],
  );

  useEffect(() => {
    if (!initialSelectedCountry && selectedCountry) {
      dispatch(setSelectedCountry(selectedCountry));
    }
  }, [selectedCountry, dispatch, initialSelectedCountry]);

  const [phoneNumber, setPhoneNumber] = useState('');
  const [isPhoneNumberError, setIsPhoneNumberError] = useState(false);
  const [isUsPhoneNumberError, setIsUsPhoneNumberError] = useState(false);
  const [selectedCountryAreaCode, setSelectedCountryAreaCode] =
    useState<string>(selectedCountry?.areaCode || '');
  const [selectedCountryEmoji, setSelectedCountryEmoji] = useState<string>(
    selectedCountry?.emoji || '',
  );

  const isUsUser = userCardLocation === 'us';

  // For US users, only show US in the region selector
  const availableRegions = useMemo(() => {
    if (isUsUser) {
      return regions.filter((region) => region.key === 'US');
    }
    return regions;
  }, [regions, isUsUser]);

  // Sync local state when selectedCountry changes (e.g., after regions load)
  useEffect(() => {
    if (selectedCountry) {
      setSelectedCountryAreaCode(selectedCountry.areaCode || '');
      setSelectedCountryEmoji(selectedCountry.emoji || '');
    }
  }, [selectedCountry]);
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

    // Validate US phone number format for US users
    if (isUsUser && !US_PHONE_REGEX.test(phoneNumber)) {
      setIsUsPhoneNumberError(true);
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

  const handleCountrySelect = useCallback(() => {
    resetPhoneVerificationSend();
    setIsUsPhoneNumberError(false);

    setOnValueChange((region) => {
      setSelectedCountryAreaCode(region.areaCode || '');
      setSelectedCountryEmoji(region.emoji || '');
    });

    navigation.navigate(
      ...createRegionSelectorModalNavigationDetails({
        regions: availableRegions,
        renderAreaCode: true,
      }),
    );
  }, [navigation, availableRegions, resetPhoneVerificationSend]);

  const handlePhoneNumberChange = (text: string) => {
    resetPhoneVerificationSend();
    setIsUsPhoneNumberError(false);
    const cleanedText = text.replace(/\D/g, '');
    setPhoneNumber(cleanedText);
  };

  useEffect(() => {
    if (!debouncedPhoneNumber) {
      setIsPhoneNumberError(false);
      setIsUsPhoneNumberError(false);
      return;
    }

    const isValidGenericFormat = /^\d{4,15}$/.test(debouncedPhoneNumber);
    setIsPhoneNumberError(!isValidGenericFormat);

    // Validate US phone format for US users
    if (isUsUser && isValidGenericFormat) {
      setIsUsPhoneNumberError(!US_PHONE_REGEX.test(debouncedPhoneNumber));
    } else {
      setIsUsPhoneNumberError(false);
    }
  }, [debouncedPhoneNumber, isUsUser]);

  const isDisabled = useMemo(() => {
    const isCurrentPhoneNumberValid = phoneNumber
      ? /^\d{4,15}$/.test(phoneNumber)
      : false;

    // For US users, also check US phone format
    const isUsPhoneValid = isUsUser ? US_PHONE_REGEX.test(phoneNumber) : true;

    return (
      !phoneNumber ||
      !selectedCountryAreaCode ||
      !contactVerificationId ||
      !isCurrentPhoneNumberValid ||
      !isUsPhoneValid ||
      phoneVerificationIsLoading ||
      phoneVerificationIsError
    );
  }, [
    phoneNumber,
    selectedCountryAreaCode,
    contactVerificationId,
    phoneVerificationIsLoading,
    phoneVerificationIsError,
    isUsUser,
  ]);

  useEffect(() => () => clearOnValueChange(), []);

  const renderFormFields = () => (
    <Box>
      <Label>
        {strings('card.card_onboarding.set_phone_number.phone_number_label')}
      </Label>
      {/* Area code selector */}
      <Box twClassName="flex flex-row items-center justify-center gap-2">
        <Box twClassName="flex flex-row items-center border border-solid border-border-default rounded-lg h-full">
          <Box twClassName="w-26 justify-center items-center flex">
            <TouchableOpacity
              onPress={handleCountrySelect}
              testID="set-phone-number-country-area-code-select"
            >
              <Box twClassName="flex flex-row items-center justify-between px-4 py-2">
                <Text variant={TextVariant.BodyMd}>
                  {`${selectedCountryEmoji} +${selectedCountryAreaCode}`}
                </Text>
              </Box>
            </TouchableOpacity>
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
            onSubmitEditing={handleContinue}
            returnKeyType="done"
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
      ) : isUsPhoneNumberError ? (
        <Text
          variant={TextVariant.BodySm}
          testID="set-phone-number-us-phone-error"
          twClassName="text-error-default"
        >
          {strings(
            'card.card_onboarding.set_phone_number.invalid_us_phone_number',
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
        loading={phoneVerificationIsLoading}
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
      stickyActions
    />
  );
};

export default SetPhoneNumber;

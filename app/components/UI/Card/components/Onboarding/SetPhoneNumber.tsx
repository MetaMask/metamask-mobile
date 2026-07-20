import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useNavigation } from '@react-navigation/native';
import {
  Box,
  Label,
  Text,
  TextVariant,
  Button,
  ButtonVariant,
  ButtonSize,
} from '@metamask/design-system-react-native';
import TextField from '../../../../../component-library/components/Form/TextField';
import Routes from '../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../locales/i18n';
import OnboardingStep from './OnboardingStep';
import { useDebouncedValue } from '../../../../hooks/useDebouncedValue';
import usePhoneVerificationSend from '../../hooks/usePhoneVerificationSend';
import useRegions from '../../hooks/useRegions';
import { useParams } from '../../../../../util/navigation/navUtils';
import Engine from '../../../../../core/Engine';
import { getCardProviderErrorMessage } from '../../util/getCardProviderErrorMessage';
import {
  resetOnboardingState,
  selectContactVerificationId,
} from '../../../../../core/redux/slices/card';
import { selectCardUserLocation } from '../../../../../selectors/cardController';
import { useDispatch, useSelector } from 'react-redux';
import { CardError, Region } from '../../types';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { CardActions, CardScreens } from '../../util/metrics';
import {
  clearOnValueChange,
  createRegionSelectorModalNavigationDetails,
  setOnValueChange,
} from './RegionSelectorModal';
import SelectField from './SelectField';

const US_PHONE_REGEX = /^[2-9]\d{2}[2-9]\d{6}$/;

const SetPhoneNumber = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const contactVerificationId = useSelector(selectContactVerificationId);
  const { trackEvent, createEventBuilder } = useAnalytics();
  const { signUpRegions, userCountry, getRegionByCode } = useRegions();
  const userCardLocation = useSelector(selectCardUserLocation);
  const {
    countryKey,
    immersve: isImmersve,
    email: immersveEmail,
  } = useParams<{ countryKey?: string; immersve?: boolean; email?: string }>();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isPhoneNumberError, setIsPhoneNumberError] = useState(false);
  const [isUsPhoneNumberError, setIsUsPhoneNumberError] = useState(false);
  const [isImmersveSubmitting, setIsImmersveSubmitting] = useState(false);
  const [immersveError, setImmersveError] = useState<string | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<Region | null>(
    () => getRegionByCode(countryKey) ?? userCountry ?? null,
  );
  const hasAutoSelected = useRef(selectedCountry !== null);
  const isUsUser = userCardLocation === 'us';

  // For US users, only show US in the region selector
  const availableRegions = useMemo(() => {
    if (isUsUser) {
      return signUpRegions.filter((region) => region.key === 'US');
    }
    return signUpRegions;
  }, [signUpRegions, isUsUser]);

  // Sync local state once when registration settings first become available
  // (cache miss on first render). Preserves countryKey nav param priority over
  // userCountry, mirroring the lazy initializer's resolution order.
  useEffect(() => {
    if (hasAutoSelected.current) return;
    const country = getRegionByCode(countryKey) ?? userCountry ?? null;
    if (country) {
      hasAutoSelected.current = true;
      setSelectedCountry(country);
    }
  }, [userCountry, getRegionByCode, countryKey]);
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
    const areaCode = selectedCountry?.areaCode;
    if (!phoneNumber || !areaCode || !contactVerificationId) {
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
            phone_number_country_code: areaCode,
          })
          .build(),
      );
      const { success } = await sendPhoneVerification({
        phoneCountryCode: areaCode,
        phoneNumber,
        contactVerificationId,
      });

      if (success) {
        navigation.navigate(Routes.CARD.ONBOARDING.CONFIRM_PHONE_NUMBER, {
          phoneCountryCode: areaCode,
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

  const handleImmersveContinue = async () => {
    const areaCode = selectedCountry?.areaCode;
    if (!phoneNumber || !areaCode || !immersveEmail) {
      return;
    }
    if (!/^\d{4,15}$/.test(phoneNumber)) {
      setIsPhoneNumberError(true);
      return;
    }
    setImmersveError(null);
    setIsImmersveSubmitting(true);
    try {
      await Engine.context.CardController.patchContactDetails({
        email: immersveEmail,
        phone: `+${areaCode}${phoneNumber}`,
      });
      navigation.navigate(Routes.CARD.ONBOARDING.KYC_PROCESSING, {
        countryKey,
      });
    } catch (e) {
      setImmersveError(getCardProviderErrorMessage(e));
    } finally {
      setIsImmersveSubmitting(false);
    }
  };

  const handleCountrySelect = useCallback(() => {
    resetPhoneVerificationSend();
    setIsUsPhoneNumberError(false);

    setOnValueChange((region) => {
      hasAutoSelected.current = true;
      setSelectedCountry(region);
    });

    navigation.navigate(
      ...createRegionSelectorModalNavigationDetails({
        regions: availableRegions,
        renderAreaCode: true,
        selectedRegionKey: selectedCountry?.key ?? null,
      }),
    );
  }, [
    navigation,
    availableRegions,
    selectedCountry?.key,
    resetPhoneVerificationSend,
  ]);

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

    if (isImmersve) {
      // No phone verification; just need a valid number + area code.
      return (
        !phoneNumber ||
        !selectedCountry?.areaCode ||
        !isCurrentPhoneNumberValid ||
        isImmersveSubmitting
      );
    }

    // For US users, also check US phone format
    const isUsPhoneValid = isUsUser ? US_PHONE_REGEX.test(phoneNumber) : true;

    return (
      !phoneNumber ||
      !selectedCountry?.areaCode ||
      !contactVerificationId ||
      !isCurrentPhoneNumberValid ||
      !isUsPhoneValid ||
      phoneVerificationIsLoading ||
      phoneVerificationIsError
    );
  }, [
    phoneNumber,
    selectedCountry?.areaCode,
    contactVerificationId,
    phoneVerificationIsLoading,
    phoneVerificationIsError,
    isUsUser,
    isImmersve,
    isImmersveSubmitting,
  ]);

  useEffect(() => () => clearOnValueChange(), []);

  const renderFormFields = () => (
    <Box>
      <Label>
        {strings('card.card_onboarding.set_phone_number.phone_number_label')}
      </Label>
      {/* Area code selector */}
      <Box twClassName="flex flex-row items-center justify-center gap-2">
        <Box twClassName="w-26">
          <SelectField
            value={`${selectedCountry?.emoji ?? ''} +${selectedCountry?.areaCode ?? ''}`}
            onPress={handleCountrySelect}
            hideIcon
            testID="set-phone-number-country-area-code-select"
          />
        </Box>

        {/* Phone number input */}
        <Box twClassName="flex-1">
          <TextField
            autoCapitalize={'none'}
            onChangeText={handlePhoneNumberChange}
            numberOfLines={1}
            autoComplete="one-time-code"
            value={phoneNumber}
            keyboardType="phone-pad"
            maxLength={255}
            accessibilityLabel={strings(
              'card.card_onboarding.set_phone_number.phone_number_label',
            )}
            testID="set-phone-number-phone-number-input"
            onSubmitEditing={
              isImmersve ? handleImmersveContinue : handleContinue
            }
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
      {isImmersve && immersveError ? (
        <Text
          variant={TextVariant.BodySm}
          testID="set-phone-number-immersve-error"
          twClassName="text-error-default text-center"
        >
          {immersveError}
        </Text>
      ) : null}
      <Button
        variant={ButtonVariant.Primary}
        size={ButtonSize.Lg}
        onPress={isImmersve ? handleImmersveContinue : handleContinue}
        isFullWidth
        isDisabled={isDisabled}
        isLoading={
          isImmersve ? isImmersveSubmitting : phoneVerificationIsLoading
        }
        testID="set-phone-number-continue-button"
      >
        {strings('card.card_onboarding.continue_button')}
      </Button>
      {!isImmersve ? (
        <Text
          variant={TextVariant.BodySm}
          testID="set-phone-number-legal-terms"
          twClassName="text-text-alternative text-center"
        >
          {strings('card.card_onboarding.set_phone_number.legal_terms')}
        </Text>
      ) : null}
    </Box>
  );

  return (
    <OnboardingStep
      title={strings('card.card_onboarding.set_phone_number.title')}
      description={
        isImmersve
          ? undefined
          : strings('card.card_onboarding.set_phone_number.description')
      }
      formFields={renderFormFields()}
      actions={renderActions()}
      stickyActions
      headerMode="close-with-confirmation"
    />
  );
};

export default SetPhoneNumber;

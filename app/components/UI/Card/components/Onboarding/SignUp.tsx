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
  FontWeight,
  Text,
  TextVariant,
  Icon,
  IconSize,
  IconName,
  Label,
  Button,
  ButtonVariant,
  ButtonSize,
} from '@metamask/design-system-react-native';
import TextField from '../../../../../component-library/components/Form/TextField';
import Routes from '../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../locales/i18n';
import OnboardingStep from './OnboardingStep';
import { validateEmail } from '../../../Ramp/utils/depositUtils';
import { useDebouncedValue } from '../../../../hooks/useDebouncedValue';
import useEmailVerificationSend from '../../hooks/useEmailVerificationSend';
import useRegions from '../../hooks/useRegions';
import { setContactVerificationId } from '../../../../../core/redux/slices/card';
import { useDispatch, useSelector } from 'react-redux';
import Engine from '../../../../../core/Engine';
import { validatePassword } from '../../util/validatePassword';
import { selectSelectedInternalAccountByScope } from '../../../../../selectors/multichainAccounts/accounts';
import { useAccountGroupName } from '../../../../hooks/multichainAccounts/useAccountGroupName';
import { createAccountSelectorNavDetails } from '../../../../Views/AccountSelector';
import { safeToChecksumAddress } from '../../../../../util/address';
import { useImmersveResumeOnboarding } from '../../hooks/useImmersveResumeOnboarding';
import { getCardProviderErrorMessage } from '../../util/getCardProviderErrorMessage';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { CardActions, CardScreens } from '../../util/metrics';
import { ActivityIndicator, TouchableOpacity } from 'react-native';
import {
  clearOnValueChange,
  createRegionSelectorModalNavigationDetails,
  setOnValueChange,
} from './RegionSelectorModal';
import SelectField from './SelectField';
import { mapCountryToLocation } from '../../util/mapCountryToLocation';
import type { Region } from '../../types';
import { selectGeolocationLocation } from '../../../../../selectors/geolocationController';
import {
  selectCardFeatureFlag,
  selectImmersveOnboardingEnabled,
} from '../../../../../selectors/featureFlagController/card';
import { HUBSPOT_WAITLIST_URL } from '../../constants';
import { useCardPostAuthRedirect } from '../../hooks/useCardPostAuthRedirect';

const buildWaitlistUrl = (countryName: string, email?: string): string => {
  // country must come first per HubSpot field ordering
  let query = `country=${encodeURIComponent(countryName)}`;
  if (email) query += `&email=${encodeURIComponent(email)}`;
  return `${HUBSPOT_WAITLIST_URL}?${query}`;
};

const SignUp = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const [email, setEmail] = useState('');
  const [isEmailError, setIsEmailError] = useState(false);
  const [isEmailValid, setIsEmailValid] = useState(false);
  const [password, setPassword] = useState('');
  const [isPasswordError, setIsPasswordError] = useState(false);
  const [isPasswordValid, setIsPasswordValid] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<Region | null>(null);
  const hasAutoSelectedCountry = useRef(false);
  const geoLocation = useSelector(selectGeolocationLocation);
  const cardFeatureFlag = useSelector(selectCardFeatureFlag);
  const immersveOnboardingEnabled = useSelector(
    selectImmersveOnboardingEnabled,
  );
  const {
    allRegions,
    getRegionByCode,
    isLoading: isLoadingRegistrationSettings,
  } = useRegions();
  const { trackEvent, createEventBuilder } = useAnalytics();
  const postAuthRedirect = useCardPostAuthRedirect();

  // Immersve onboarding entry: SIWE binds to the currently-selected EVM account.
  const accountName = useAccountGroupName();
  const selectAccountByScope = useSelector(
    selectSelectedInternalAccountByScope,
  );
  const immersveAddress = safeToChecksumAddress(
    selectAccountByScope('eip155:0')?.address,
  );
  const resumeImmersveOnboarding = useImmersveResumeOnboarding();
  const [isImmersveSubmitting, setIsImmersveSubmitting] = useState(false);
  const [immersveError, setImmersveError] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneRegion, setPhoneRegion] = useState<Region | null>(null);
  const [isPhoneNumberError, setIsPhoneNumberError] = useState(false);
  const debouncedPhoneNumber = useDebouncedValue(phoneNumber, 1000);

  const handleAlreadyHaveAccountPress = useCallback(() => {
    if (postAuthRedirect) {
      navigation.navigate(Routes.CARD.AUTHENTICATION, { postAuthRedirect });
      return;
    }
    navigation.navigate(Routes.CARD.AUTHENTICATION);
  }, [navigation, postAuthRedirect]);

  useEffect(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_VIEWED)
        .addProperties({
          screen: CardScreens.SIGN_UP,
        })
        .build(),
    );
  }, [trackEvent, createEventBuilder]);

  const {
    sendEmailVerification,
    isLoading: emailVerificationIsLoading,
    isError: emailVerificationIsError,
    error: emailVerificationError,
    reset: resetEmailVerificationSend,
  } = useEmailVerificationSend();

  const debouncedEmail = useDebouncedValue(email, 1000);
  const debouncedPassword = useDebouncedValue(password, 1000);

  useEffect(() => {
    if (!allRegions.length || geoLocation === 'UNKNOWN') {
      return;
    }

    // Run at most once: prevents a background re-fetch of registrationSettings
    // (which produces a new getRegionByCode reference) from overwriting the
    // user's manual country selection.
    if (hasAutoSelectedCountry.current) {
      return;
    }

    const matchedRegion = getRegionByCode(geoLocation);

    if (matchedRegion) {
      hasAutoSelectedCountry.current = true;
      setSelectedCountry(matchedRegion);
      setPhoneRegion(matchedRegion);
      Engine.context.CardController.setUserLocation(
        mapCountryToLocation(matchedRegion.key),
      );
      Engine.context.CardController.setSelectedCountry(matchedRegion.key);
    }
  }, [allRegions.length, geoLocation, getRegionByCode]);

  useEffect(() => {
    if (!debouncedEmail) {
      return;
    }
    const isValid = validateEmail(debouncedEmail);
    setIsEmailError(!isValid);
    setIsEmailValid(isValid);
  }, [debouncedEmail]);

  useEffect(() => {
    if (!debouncedPassword) {
      return;
    }
    const isValid = validatePassword(debouncedPassword);
    setIsPasswordError(!isValid);
    setIsPasswordValid(isValid);
  }, [debouncedPassword]);

  useEffect(() => {
    if (!debouncedPhoneNumber) {
      setIsPhoneNumberError(false);
      return;
    }
    setIsPhoneNumberError(!/^\d{4,15}$/.test(debouncedPhoneNumber));
  }, [debouncedPhoneNumber]);

  const isImmersveCountry = Boolean(
    immersveOnboardingEnabled &&
      selectedCountry &&
      (cardFeatureFlag.immersveCountries ?? []).includes(selectedCountry.key),
  );

  const isWaitlistMode = Boolean(
    selectedCountry && !selectedCountry.canSignUp && !isImmersveCountry,
  );

  const isPhoneValid = Boolean(
    phoneNumber && phoneRegion?.areaCode && /^\d{4,15}$/.test(phoneNumber),
  );

  const isDisabled = useMemo(() => {
    if (isWaitlistMode) {
      return false;
    }
    if (isImmersveCountry) {
      // Email + phone are collected; SIWE binds to the selected account.
      return (
        !email || !isPhoneValid || !immersveAddress || isImmersveSubmitting
      );
    }
    return (
      !email ||
      !password ||
      !selectedCountry ||
      !isEmailValid ||
      !isPasswordValid ||
      emailVerificationIsError ||
      emailVerificationIsLoading
    );
  }, [
    isWaitlistMode,
    isImmersveCountry,
    immersveAddress,
    isImmersveSubmitting,
    email,
    isPhoneValid,
    password,
    selectedCountry,
    isEmailValid,
    isPasswordValid,
    emailVerificationIsError,
    emailVerificationIsLoading,
  ]);

  const openAccountSelector = useCallback(() => {
    navigation.navigate(
      ...createAccountSelectorNavDetails({
        isEvmOnly: true,
        isSelectOnly: true,
        disableAddAccountButton: true,
      }),
    );
  }, [navigation]);

  const handleImmersveContinue = useCallback(async () => {
    if (
      !immersveAddress ||
      !selectedCountry ||
      !email ||
      !phoneNumber ||
      !phoneRegion?.areaCode
    ) {
      return;
    }
    if (!/^\d{4,15}$/.test(phoneNumber)) {
      setIsPhoneNumberError(true);
      return;
    }
    setImmersveError(null);
    setIsImmersveSubmitting(true);
    try {
      await resumeImmersveOnboarding({
        country: selectedCountry.key,
        address: immersveAddress,
        email,
        phone: `+${phoneRegion.areaCode}${phoneNumber}`,
      });
    } catch (e) {
      setImmersveError(getCardProviderErrorMessage(e));
    } finally {
      setIsImmersveSubmitting(false);
    }
  }, [
    immersveAddress,
    selectedCountry,
    email,
    phoneNumber,
    phoneRegion?.areaCode,
    resumeImmersveOnboarding,
  ]);

  const handleJoinWaitlist = useCallback(() => {
    if (!selectedCountry) return;
    navigation.navigate(Routes.CARD.MODALS.ID, {
      screen: Routes.CARD.MODALS.WAITLIST_FORM,
      params: {
        url: buildWaitlistUrl(selectedCountry.name, email || undefined),
      },
    });
  }, [selectedCountry, email, navigation]);

  const handleEmailChange = useCallback(
    (emailText: string) => {
      resetEmailVerificationSend();
      setEmail(emailText);
    },
    [resetEmailVerificationSend],
  );

  const handlePasswordChange = useCallback(
    (passwordText: string) => {
      resetEmailVerificationSend();
      setPassword(passwordText);
    },
    [resetEmailVerificationSend],
  );

  const handleContinue = useCallback(async () => {
    // Use actual values, not debounced ones
    if (!email || !password || !selectedCountry) {
      return;
    }

    const isCurrentEmailValid = validateEmail(email);
    const isCurrentPasswordValid = validatePassword(password);

    if (!isCurrentEmailValid || !isCurrentPasswordValid) {
      // Set error states
      setIsEmailError(!isCurrentEmailValid);
      setIsPasswordError(!isCurrentPasswordValid);
      return;
    }

    try {
      trackEvent(
        createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
          .addProperties({
            action: CardActions.SIGN_UP_BUTTON,
          })
          .build(),
      );
      const { contactVerificationId } = await sendEmailVerification(email);

      dispatch(setContactVerificationId(contactVerificationId));

      if (contactVerificationId) {
        navigation.navigate(Routes.CARD.ONBOARDING.CONFIRM_EMAIL, {
          email,
          password,
          countryKey: selectedCountry.key,
        });
      } else {
        // If no contactVerificationId, assume user is registered or email not valid
        setIsEmailError(true);
      }
    } catch {
      // Allow error message to display
    }
  }, [
    email,
    password,
    trackEvent,
    createEventBuilder,
    sendEmailVerification,
    dispatch,
    navigation,
    selectedCountry,
  ]);

  const handleCountrySelect = useCallback(() => {
    if (isLoadingRegistrationSettings) return;
    resetEmailVerificationSend();
    setOnValueChange((region) => {
      setSelectedCountry(region);
      setPhoneRegion(region);
      Engine.context.CardController.setUserLocation(
        mapCountryToLocation(region.key),
      );
      Engine.context.CardController.setSelectedCountry(region.key);
    });

    navigation.navigate(
      ...createRegionSelectorModalNavigationDetails({
        regions: allRegions,
        selectedRegionKey: selectedCountry?.key ?? null,
      }),
    );
  }, [
    navigation,
    allRegions,
    selectedCountry?.key,
    resetEmailVerificationSend,
    isLoadingRegistrationSettings,
  ]);

  const handlePhoneRegionSelect = useCallback(() => {
    setOnValueChange((region) => {
      setPhoneRegion(region);
    });

    navigation.navigate(
      ...createRegionSelectorModalNavigationDetails({
        regions: allRegions,
        renderAreaCode: true,
        selectedRegionKey: phoneRegion?.key ?? selectedCountry?.key ?? null,
      }),
    );
  }, [navigation, allRegions, phoneRegion?.key, selectedCountry?.key]);

  const handlePhoneNumberChange = useCallback((text: string) => {
    setPhoneNumber(text.replace(/\D/g, ''));
  }, []);

  useEffect(() => () => clearOnValueChange(), []);

  const renderFormFields = () => (
    <>
      <Box>
        <Label>{strings('card.card_onboarding.sign_up.country_label')}</Label>
        {isLoadingRegistrationSettings && !selectedCountry ? (
          <Box
            twClassName="flex-row items-center justify-center h-12 rounded-xl border border-solid border-border-muted bg-background-muted"
            testID="signup-country-loading"
          >
            <ActivityIndicator size="small" />
          </Box>
        ) : (
          <SelectField
            value={selectedCountry?.name}
            onPress={handleCountrySelect}
            isDisabled={isLoadingRegistrationSettings}
            testID="signup-country-select"
          />
        )}
        {isWaitlistMode && (
          <Text
            variant={TextVariant.BodySm}
            twClassName="text-text-alternative mt-1"
            testID="signup-country-not-available-text"
          >
            {strings('card.card_onboarding.sign_up.country_not_available')}
          </Text>
        )}
      </Box>

      <Box>
        <Label>{strings('card.card_onboarding.sign_up.email_label')}</Label>
        <TextField
          autoCapitalize={'none'}
          autoComplete="one-time-code"
          onChangeText={handleEmailChange}
          numberOfLines={1}
          value={email}
          keyboardType="email-address"
          maxLength={255}
          accessibilityLabel={strings(
            'card.card_onboarding.sign_up.email_label',
          )}
          isError={
            !isImmersveCountry && debouncedEmail.length > 0 && isEmailError
          }
          testID="signup-email-input"
        />
        {isImmersveCountry ? null : email.length > 0 &&
          emailVerificationIsError ? (
          <Text
            testID="signup-email-error-text"
            variant={TextVariant.BodySm}
            twClassName="text-error-default"
          >
            {emailVerificationError}
          </Text>
        ) : isEmailError ? (
          <Text
            testID="signup-email-error-text"
            variant={TextVariant.BodySm}
            twClassName="text-error-default"
          >
            {strings('card.card_onboarding.sign_up.invalid_email')}
          </Text>
        ) : null}
      </Box>

      {isImmersveCountry && (
        <>
          <Box>
            <Label>
              {strings(
                'card.card_onboarding.set_phone_number.phone_number_label',
              )}
            </Label>
            <Box twClassName="flex flex-row items-center justify-center gap-2">
              <Box twClassName="w-26">
                <SelectField
                  value={`${phoneRegion?.emoji ?? ''} +${phoneRegion?.areaCode ?? ''}`}
                  onPress={handlePhoneRegionSelect}
                  hideIcon
                  testID="signup-immersve-phone-area-code-select"
                />
              </Box>
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
                  testID="signup-immersve-phone-number-input"
                  onSubmitEditing={handleImmersveContinue}
                  returnKeyType="done"
                />
              </Box>
            </Box>
            {isPhoneNumberError ? (
              <Text
                variant={TextVariant.BodySm}
                testID="signup-immersve-phone-number-error"
                twClassName="text-error-default"
              >
                {strings(
                  'card.card_onboarding.set_phone_number.invalid_phone_number',
                )}
              </Text>
            ) : null}
          </Box>
          <Box>
            <Label>
              {strings('card.card_onboarding.sign_up.account_label')}
            </Label>
            <SelectField
              value={accountName ?? undefined}
              onPress={openAccountSelector}
              testID="signup-immersve-account-select"
            />
            <Text
              variant={TextVariant.BodySm}
              twClassName="text-text-alternative mt-1"
            >
              {strings('card.card_onboarding.sign_up.account_description')}
            </Text>
            {immersveError ? (
              <Text
                variant={TextVariant.BodySm}
                twClassName="text-error-default mt-1"
                testID="signup-immersve-error-text"
              >
                {immersveError}
              </Text>
            ) : null}
          </Box>
        </>
      )}

      {!isWaitlistMode && !isImmersveCountry && (
        <Box>
          <Label>
            {strings('card.card_onboarding.sign_up.password_label')}
          </Label>
          <TextField
            autoCapitalize={'none'}
            onChangeText={handlePasswordChange}
            numberOfLines={1}
            value={password}
            maxLength={255}
            secureTextEntry={!isPasswordVisible}
            autoComplete="one-time-code"
            accessibilityLabel={strings(
              'card.card_onboarding.sign_up.password_label',
            )}
            isError={debouncedPassword.length > 0 && isPasswordError}
            testID="signup-password-input"
            endAccessory={
              <TouchableOpacity
                onPress={() => setIsPasswordVisible(!isPasswordVisible)}
                testID="signup-password-visibility-toggle"
              >
                <Icon
                  name={isPasswordVisible ? IconName.EyeSlash : IconName.Eye}
                  size={IconSize.Md}
                />
              </TouchableOpacity>
            }
          />
          {debouncedPassword.length > 0 && isPasswordError ? (
            <Text
              testID="signup-password-error-text"
              variant={TextVariant.BodySm}
              twClassName="text-error-default"
            >
              {strings('card.card_onboarding.sign_up.invalid_password')}
            </Text>
          ) : (
            <Text
              variant={TextVariant.BodySm}
              twClassName="text-text-alternative"
            >
              {strings('card.card_onboarding.sign_up.password_description')}
            </Text>
          )}
        </Box>
      )}
    </>
  );

  const renderActions = () => (
    <>
      <Button
        variant={ButtonVariant.Primary}
        size={ButtonSize.Lg}
        onPress={
          isImmersveCountry
            ? handleImmersveContinue
            : isWaitlistMode
              ? handleJoinWaitlist
              : handleContinue
        }
        isFullWidth
        isDisabled={isDisabled}
        isLoading={
          isImmersveCountry
            ? isImmersveSubmitting
            : !isWaitlistMode && emailVerificationIsLoading
        }
        testID="signup-continue-button"
      >
        {isWaitlistMode
          ? strings('card.card_onboarding.sign_up.join_waitlist')
          : strings('card.card_onboarding.continue_button')}
      </Button>
      <TouchableOpacity onPress={handleAlreadyHaveAccountPress}>
        <Text
          testID="signup-i-already-have-an-account-text"
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Medium}
          twClassName="text-default text-center p-4"
        >
          {strings('card.card_onboarding.sign_up.i_already_have_an_account')}
        </Text>
      </TouchableOpacity>
    </>
  );

  return (
    <OnboardingStep
      title={strings('card.card_onboarding.sign_up.title')}
      description={strings('card.card_onboarding.sign_up.description')}
      formFields={renderFormFields()}
      actions={renderActions()}
      headerMode="back"
    />
  );
};

export default SignUp;

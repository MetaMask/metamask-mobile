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
import { validateEmail } from '../../../Ramp/Deposit/utils';
import { useDebouncedValue } from '../../../../hooks/useDebouncedValue';
import useEmailVerificationSend from '../../hooks/useEmailVerificationSend';
import useRegions from '../../hooks/useRegions';
import { setContactVerificationId } from '../../../../../core/redux/slices/card';
import { useDispatch, useSelector } from 'react-redux';
import Engine from '../../../../../core/Engine';
import { validatePassword } from '../../util/validatePassword';
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
import { HUBSPOT_WAITLIST_URL } from '../../constants';

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
  const {
    allRegions,
    getRegionByCode,
    isLoading: isLoadingRegistrationSettings,
  } = useRegions();
  const { trackEvent, createEventBuilder } = useAnalytics();

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
      Engine.context.CardController.setUserLocation(
        mapCountryToLocation(matchedRegion.key),
      );
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

  const isWaitlistMode = Boolean(selectedCountry && !selectedCountry.canSignUp);

  const isDisabled = useMemo(() => {
    if (isWaitlistMode) {
      return false;
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
    email,
    password,
    selectedCountry,
    isEmailValid,
    isPasswordValid,
    emailVerificationIsError,
    emailVerificationIsLoading,
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
      Engine.context.CardController.setUserLocation(
        mapCountryToLocation(region.key),
      );
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
          isError={debouncedEmail.length > 0 && isEmailError}
          testID="signup-email-input"
        />
        {email.length > 0 && emailVerificationIsError ? (
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

      {!isWaitlistMode && (
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
        onPress={isWaitlistMode ? handleJoinWaitlist : handleContinue}
        isFullWidth
        isDisabled={isDisabled}
        isLoading={!isWaitlistMode && emailVerificationIsLoading}
        testID="signup-continue-button"
      >
        {isWaitlistMode
          ? strings('card.card_onboarding.sign_up.join_waitlist')
          : strings('card.card_onboarding.continue_button')}
      </Button>
      <TouchableOpacity
        onPress={() => navigation.navigate(Routes.CARD.AUTHENTICATION)}
      >
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
    />
  );
};

export default SignUp;

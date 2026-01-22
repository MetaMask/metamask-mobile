import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import {
  Box,
  FontWeight,
  Text,
  TextVariant,
  Icon,
  IconSize,
  IconName,
} from '@metamask/design-system-react-native';
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
import { validateEmail } from '../../../Ramp/Deposit/utils';
import { useDebouncedValue } from '../../../../hooks/useDebouncedValue';
import useEmailVerificationSend from '../../hooks/useEmailVerificationSend';
import useRegistrationSettings from '../../hooks/useRegistrationSettings';
import {
  selectSelectedCountry,
  setContactVerificationId,
  setSelectedCountry,
  setUserCardLocation,
} from '../../../../../core/redux/slices/card';
import { useDispatch, useSelector } from 'react-redux';
import { validatePassword } from '../../util/validatePassword';
import { MetaMetricsEvents, useMetrics } from '../../../../hooks/useMetrics';
import { CardActions, CardScreens } from '../../util/metrics';
import { TouchableOpacity } from 'react-native';
import {
  clearOnValueChange,
  createRegionSelectorModalNavigationDetails,
  Region,
  setOnValueChange,
} from './RegionSelectorModal';
import { countryCodeToFlag } from '../../util/countryCodeToFlag';

const SignUp = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const [email, setEmail] = useState('');
  const [isEmailError, setIsEmailError] = useState(false);
  const [isEmailValid, setIsEmailValid] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isPasswordError, setIsPasswordError] = useState(false);
  const [isPasswordValid, setIsPasswordValid] = useState(false);
  const [isConfirmPasswordError, setIsConfirmPasswordError] = useState(false);
  const [isConfirmPasswordValid, setIsConfirmPasswordValid] = useState(false);
  const selectedCountry = useSelector(selectSelectedCountry);
  const { data: registrationSettings } = useRegistrationSettings();
  const { trackEvent, createEventBuilder } = useMetrics();

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
  const debouncedConfirmPassword = useDebouncedValue(confirmPassword, 1000);

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
    if (!debouncedConfirmPassword) {
      return;
    }
    const isValid = debouncedConfirmPassword === debouncedPassword;
    setIsConfirmPasswordError(!isValid);
    setIsConfirmPasswordValid(isValid);
  }, [debouncedConfirmPassword, debouncedPassword]);

  const isDisabled = useMemo(
    () =>
      !email ||
      !password ||
      !confirmPassword ||
      !selectedCountry ||
      !isEmailValid ||
      !isPasswordValid ||
      !isConfirmPasswordValid ||
      emailVerificationIsError ||
      emailVerificationIsLoading,
    [
      email,
      password,
      confirmPassword,
      selectedCountry,
      isEmailValid,
      isPasswordValid,
      isConfirmPasswordValid,
      emailVerificationIsError,
      emailVerificationIsLoading,
    ],
  );

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
    if (!email || !password || !confirmPassword || !selectedCountry) {
      return;
    }

    const isCurrentEmailValid = validateEmail(email);
    const isCurrentPasswordValid = validatePassword(password);
    const isCurrentConfirmPasswordValid = confirmPassword === password;

    if (
      !isCurrentEmailValid ||
      !isCurrentPasswordValid ||
      !isCurrentConfirmPasswordValid
    ) {
      // Set error states
      setIsEmailError(!isCurrentEmailValid);
      setIsPasswordError(!isCurrentPasswordValid);
      setIsConfirmPasswordError(!isCurrentConfirmPasswordValid);
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
          password: confirmPassword,
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
    confirmPassword,
    selectedCountry,
    trackEvent,
    createEventBuilder,
    sendEmailVerification,
    dispatch,
    navigation,
  ]);

  const handleCountrySelect = useCallback(() => {
    resetEmailVerificationSend();
    setOnValueChange((region) => {
      dispatch(setSelectedCountry(region));
      dispatch(
        setUserCardLocation(region.key === 'US' ? 'us' : 'international'),
      );
    });

    navigation.navigate(
      ...createRegionSelectorModalNavigationDetails({
        regions,
      }),
    );
  }, [dispatch, navigation, regions, resetEmailVerificationSend]);

  useEffect(() => () => clearOnValueChange(), []);

  const renderFormFields = () => (
    <>
      <Box>
        <Label>{strings('card.card_onboarding.sign_up.email_label')}</Label>
        <TextField
          autoCapitalize={'none'}
          autoComplete="email"
          onChangeText={handleEmailChange}
          numberOfLines={1}
          size={TextFieldSize.Lg}
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

      <Box>
        <Label>{strings('card.card_onboarding.sign_up.password_label')}</Label>
        <TextField
          autoCapitalize={'none'}
          onChangeText={handlePasswordChange}
          numberOfLines={1}
          size={TextFieldSize.Lg}
          value={password}
          maxLength={255}
          secureTextEntry
          accessibilityLabel={strings(
            'card.card_onboarding.sign_up.password_label',
          )}
          isError={debouncedPassword.length > 0 && isPasswordError}
          testID="signup-password-input"
          endAccessory={
            isPasswordValid ? (
              <Icon
                name={IconName.Confirmation}
                size={IconSize.Md}
                twClassName="text-success-default"
              />
            ) : null
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
            {strings('card.card_onboarding.sign_up.password_placeholder')}
          </Text>
        )}
      </Box>

      <Box>
        <Label>
          {strings('card.card_onboarding.sign_up.confirm_password_label')}
        </Label>
        <TextField
          autoCapitalize={'none'}
          onChangeText={setConfirmPassword}
          numberOfLines={1}
          size={TextFieldSize.Lg}
          value={confirmPassword}
          maxLength={255}
          secureTextEntry
          accessibilityLabel={strings(
            'card.card_onboarding.sign_up.confirm_password_label',
          )}
          isError={
            debouncedConfirmPassword.length > 0 && isConfirmPasswordError
          }
          testID="signup-confirm-password-input"
          endAccessory={
            isConfirmPasswordValid ? (
              <Icon
                name={IconName.Confirmation}
                size={IconSize.Md}
                twClassName="text-success-default"
              />
            ) : null
          }
        />
        {debouncedConfirmPassword.length > 0 && isConfirmPasswordError && (
          <Text
            testID="signup-confirm-password-error-text"
            variant={TextVariant.BodySm}
            twClassName="text-error-default"
          >
            {strings('card.card_onboarding.sign_up.password_mismatch')}
          </Text>
        )}
      </Box>

      <Box>
        <Label>{strings('card.card_onboarding.sign_up.country_label')}</Label>
        <Box twClassName="w-full border border-solid border-border-default rounded-lg py-1">
          <TouchableOpacity
            onPress={handleCountrySelect}
            testID="signup-country-select"
          >
            <Box twClassName="flex flex-row items-center justify-between px-4 py-2">
              <Text variant={TextVariant.BodyMd}>{selectedCountry?.name}</Text>
              <Icon name={IconName.ArrowDown} size={IconSize.Sm} />
            </Box>
          </TouchableOpacity>
        </Box>
      </Box>
    </>
  );

  const renderActions = () => (
    <>
      <Button
        variant={ButtonVariants.Primary}
        label={strings('card.card_onboarding.continue_button')}
        size={ButtonSize.Lg}
        onPress={handleContinue}
        width={ButtonWidthTypes.Full}
        isDisabled={isDisabled}
        loading={emailVerificationIsLoading}
        testID="signup-continue-button"
      />
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

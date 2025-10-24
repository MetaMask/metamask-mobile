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
import { validateEmail } from '../../../Ramp/Deposit/utils';
import { useDebouncedValue } from '../../../../hooks/useDebouncedValue';
import SelectComponent from '../../../SelectComponent';
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
import { OnboardingActions, OnboardingScreens } from '../../util/metrics';

const SignUp = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();

  const [email, setEmail] = useState('');
  const [isEmailError, setIsEmailError] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isPasswordError, setIsPasswordError] = useState(false);
  const [isConfirmPasswordError, setIsConfirmPasswordError] = useState(false);
  const selectedCountry = useSelector(selectSelectedCountry);
  const { data: registrationSettings } = useRegistrationSettings();
  const { trackEvent, createEventBuilder } = useMetrics();

  useEffect(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_ONBOARDING_PAGE_VIEWED)
        .addProperties({
          page: OnboardingScreens.SIGN_UP,
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

  const selectOptions = useMemo(() => {
    if (!registrationSettings?.countries) {
      return [];
    }
    return [...registrationSettings.countries]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((country) => ({
        key: country.iso3166alpha2,
        value: country.iso3166alpha2,
        label: country.name,
      }));
  }, [registrationSettings]);

  useEffect(() => {
    if (!debouncedEmail) {
      return;
    }
    setIsEmailError(!validateEmail(debouncedEmail));
  }, [debouncedEmail]);

  useEffect(() => {
    if (!debouncedPassword) {
      return;
    }
    setIsPasswordError(!validatePassword(debouncedPassword));
  }, [debouncedPassword]);

  useEffect(() => {
    if (!debouncedConfirmPassword) {
      return;
    }
    setIsConfirmPasswordError(debouncedConfirmPassword !== debouncedPassword);
  }, [debouncedConfirmPassword, debouncedPassword]);

  const isDisabled = useMemo(
    () =>
      !debouncedEmail ||
      !debouncedPassword ||
      !debouncedConfirmPassword ||
      !selectedCountry ||
      isPasswordError ||
      isConfirmPasswordError ||
      isEmailError ||
      emailVerificationIsError ||
      emailVerificationIsLoading,
    [
      debouncedEmail,
      debouncedPassword,
      debouncedConfirmPassword,
      selectedCountry,
      isPasswordError,
      isConfirmPasswordError,
      isEmailError,
      emailVerificationIsError,
      emailVerificationIsLoading,
    ],
  );

  const handleEmailChange = useCallback(
    (email: string) => {
      resetEmailVerificationSend();
      setEmail(email);
    },
    [resetEmailVerificationSend],
  );

  const handlePasswordChange = useCallback(
    (password: string) => {
      resetEmailVerificationSend();
      setPassword(password);
    },
    [resetEmailVerificationSend],
  );

  const handleContinue = useCallback(async () => {
    if (
      !debouncedEmail ||
      !debouncedPassword ||
      !debouncedConfirmPassword ||
      !selectedCountry
    ) {
      return;
    }
    try {
      trackEvent(
        createEventBuilder(MetaMetricsEvents.CARD_ONBOARDING_BUTTON_CLICKED)
          .addProperties({
            action: OnboardingActions.SIGN_UP_BUTTON_CLICKED,
          })
          .build(),
      );
      const { contactVerificationId } = await sendEmailVerification(
        debouncedEmail,
      );

      dispatch(setContactVerificationId(contactVerificationId));

      if (contactVerificationId) {
        navigation.navigate(Routes.CARD.ONBOARDING.CONFIRM_EMAIL, {
          email: debouncedEmail,
          password: debouncedConfirmPassword,
        });
      } else {
        // If no contactVerificationId, assume user is registered or email not valid
        setIsEmailError(true);
      }
    } catch {
      // Allow error message to display
    }
  }, [
    debouncedConfirmPassword,
    debouncedEmail,
    debouncedPassword,
    dispatch,
    navigation,
    selectedCountry,
    sendEmailVerification,
    trackEvent,
    createEventBuilder,
  ]);

  const handleCountrySelect = useCallback(
    (countryValue: string) => {
      resetEmailVerificationSend();
      dispatch(setSelectedCountry(countryValue));
      dispatch(
        setUserCardLocation(countryValue === 'US' ? 'us' : 'international'),
      );
    },
    [dispatch, resetEmailVerificationSend],
  );

  const renderFormFields = () => (
    <>
      <Box>
        <Label>{strings('card.card_onboarding.sign_up.email_label')}</Label>
        <TextField
          autoCapitalize={'none'}
          onChangeText={handleEmailChange}
          placeholder={strings(
            'card.card_onboarding.sign_up.email_placeholder',
          )}
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
        {debouncedEmail.length > 0 && emailVerificationIsError ? (
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
          placeholder={strings(
            'card.card_onboarding.sign_up.password_placeholder',
          )}
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
        />
        {debouncedPassword.length > 0 && isPasswordError ? (
          <Text
            testID="signup-password-error-text"
            variant={TextVariant.BodySm}
            twClassName="text-error-default"
          >
            {strings('card.card_onboarding.sign_up.invalid_password')}
          </Text>
        ) : null}
      </Box>

      <Box>
        <Label>
          {strings('card.card_onboarding.sign_up.confirm_password_label')}
        </Label>
        <TextField
          autoCapitalize={'none'}
          onChangeText={setConfirmPassword}
          placeholder={strings(
            'card.card_onboarding.sign_up.password_placeholder',
          )}
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
          <SelectComponent
            options={selectOptions}
            selectedValue={selectedCountry}
            onValueChange={handleCountrySelect}
            label={strings('card.card_onboarding.sign_up.country_label')}
            defaultValue={strings(
              'card.card_onboarding.sign_up.country_placeholder',
            )}
            testID="signup-country-select"
          />
        </Box>
      </Box>
    </>
  );

  const renderActions = () => (
    <Button
      variant={ButtonVariants.Primary}
      label={strings('card.card_onboarding.continue_button')}
      size={ButtonSize.Lg}
      onPress={handleContinue}
      width={ButtonWidthTypes.Full}
      isDisabled={isDisabled}
      testID="signup-continue-button"
    />
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

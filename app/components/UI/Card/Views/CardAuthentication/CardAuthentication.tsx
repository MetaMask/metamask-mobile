import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform, TouchableOpacity, TextInputProps } from 'react-native';
import {
  Box,
  FontWeight,
  Label,
  Text,
  TextVariant,
  Icon,
  IconName,
  IconSize,
  Button,
  ButtonVariant,
  ButtonSize,
} from '@metamask/design-system-react-native';
import TextField from '../../../../../component-library/components/Form/TextField';
import { useTheme } from '../../../../../util/theme';
import { useCardAuth } from '../../hooks/useCardAuth';
import { CardAuthenticationSelectors } from './CardAuthentication.testIds';
import Routes from '../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../locales/i18n';
import Logger from '../../../../../util/Logger';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { useDispatch, useSelector } from 'react-redux';
import { setOnboardingId } from '../../../../../core/redux/slices/card';
import { selectCardUserLocation } from '../../../../../selectors/cardController';
import Engine from '../../../../../core/Engine';
import { CardActions, CardScreens } from '../../util/metrics';
import OnboardingStep from '../../components/Onboarding/OnboardingStep';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { countryCodeToFlag } from '../../util/countryCodeToFlag';

const CODE_LENGTH = 6;
const autoComplete = Platform.select<TextInputProps['autoComplete']>({
  android: 'sms-otp',
  default: 'one-time-code',
});

const CardAuthentication = () => {
  const tw = useTailwind();
  const { trackEvent, createEventBuilder } = useAnalytics();
  const navigation = useNavigation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const location = useSelector(selectCardUserLocation);
  const [confirmCode, setConfirmCode] = useState('');
  const [latestValueSubmitted, setLatestValueSubmitted] = useState<
    string | null
  >(null);
  const [resendCooldown, setResendCooldown] = useState(60);
  const dispatch = useDispatch();
  const theme = useTheme();

  const {
    currentStep,
    initiate,
    submit,
    stepAction,
    resetToLogin,
    getErrorMessage,
  } = useCardAuth();

  // React Query guarantees mutate is referentially stable — safe to use as effect dep
  const { mutate: triggerStepAction } = stepAction;

  // Derived state — no useState needed for these
  const isOtpStep = currentStep.type === 'otp';
  const loading = initiate.isPending || submit.isPending;
  const otpLoading = stepAction.isPending;
  const error =
    initiate.error || submit.error
      ? getErrorMessage(initiate.error ?? submit.error)
      : null;
  const otpError = stepAction.error ? getErrorMessage(stepAction.error) : null;
  const maskedPhoneNumber =
    isOtpStep && currentStep.type === 'otp'
      ? currentStep.destination
      : undefined;

  const handleEmailChange = useCallback(
    (newEmail: string) => {
      setEmail(newEmail);
      if (initiate.error || submit.error) {
        initiate.reset();
        submit.reset();
      }
    },
    [initiate, submit],
  );

  const handlePasswordChange = useCallback(
    (newPassword: string) => {
      setPassword(newPassword);
      if (initiate.error || submit.error) {
        initiate.reset();
        submit.reset();
      }
    },
    [initiate, submit],
  );

  const handleOtpValueChange = useCallback(
    (text: string) => {
      setConfirmCode(text);
      setLatestValueSubmitted(null);
      if (submit.error) {
        submit.reset();
      }
      if (stepAction.error) {
        stepAction.reset();
      }
    },
    [submit, stepAction],
  );

  // Send OTP when entering OTP step
  useEffect(() => {
    if (!isOtpStep) return;
    triggerStepAction(undefined, {
      onSuccess: () => setResendCooldown(60),
      onError: (err) =>
        Logger.log('CardAuthentication::Send OTP login failed', err),
    });
  }, [isOtpStep, triggerStepAction]);

  // Cooldown timer effect
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown((prev) => prev - 1);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  useEffect(() => {
    const screenName = isOtpStep
      ? CardScreens.OTP_AUTHENTICATION
      : CardScreens.AUTHENTICATION;

    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_VIEWED)
        .addProperties({
          screen: screenName,
        })
        .build(),
    );
  }, [trackEvent, createEventBuilder, isOtpStep]);

  const performLogin = useCallback(
    async (otpCode?: string) => {
      const action = isOtpStep
        ? CardActions.OTP_AUTHENTICATION_CONFIRM_BUTTON
        : CardActions.AUTHENTICATION_LOGIN_BUTTON;

      trackEvent(
        createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
          .addProperties({
            action,
          })
          .build(),
      );

      try {
        if (!isOtpStep) {
          await initiate.mutateAsync(location ?? 'international');
        }
        const result = await submit.mutateAsync({
          type: 'email_password',
          email,
          password,
          ...(otpCode ? { otpCode } : {}),
        });

        if (result.nextStep?.type === 'otp') {
          // currentStep is updated by useCardAuth — view re-renders to OTP form automatically
          return;
        }

        if (result.onboardingRequired) {
          dispatch(setOnboardingId(result.onboardingRequired.sessionId));
          navigation.reset({
            index: 0,
            routes: [
              {
                name: Routes.CARD.ONBOARDING.ROOT,
                params: { cardUserPhase: result.onboardingRequired.phase },
              },
            ],
          });
          return;
        }

        // Successful login — navigate to home
        navigation.reset({
          index: 0,
          routes: [{ name: Routes.CARD.HOME }],
        });
      } catch (err) {
        Logger.log('CardAuthentication::Login failed', err);
        // error is displayed via the derived `error` variable above
      }
    },
    [
      email,
      initiate,
      submit,
      isOtpStep,
      location,
      password,
      navigation,
      dispatch,
      trackEvent,
      createEventBuilder,
    ],
  );

  // Auto-submit when all OTP digits are entered
  useEffect(() => {
    if (
      isOtpStep &&
      confirmCode.length === CODE_LENGTH &&
      latestValueSubmitted !== confirmCode
    ) {
      setLatestValueSubmitted(confirmCode);
      performLogin(confirmCode);
    }
  }, [confirmCode, performLogin, latestValueSubmitted, isOtpStep]);

  const isLoginDisabled = useMemo(
    () => !!error || email.length === 0 || password.length === 0 || !location,
    [error, email, password, location],
  );

  const handleResendOtp = useCallback(() => {
    if (resendCooldown > 0 || otpLoading) return;
    triggerStepAction(undefined, {
      onSuccess: () => setResendCooldown(60),
      onError: (err) =>
        Logger.log('CardAuthentication::Resend OTP failed', err),
    });
  }, [resendCooldown, triggerStepAction, otpLoading]);

  const handleBackToLogin = useCallback(() => {
    setConfirmCode('');
    setLatestValueSubmitted(null);
    setResendCooldown(60);
    resetToLogin();
  }, [resetToLogin]);

  const title = useMemo(
    () =>
      isOtpStep
        ? strings('card.card_otp_authentication.title')
        : strings('card.card_authentication.title'),
    [isOtpStep],
  );

  const description = useMemo(
    () =>
      isOtpStep
        ? maskedPhoneNumber
          ? strings(
              'card.card_otp_authentication.description_with_phone_number',
              { maskedPhoneNumber },
            )
          : strings(
              'card.card_otp_authentication.description_without_phone_number',
            )
        : '',
    [maskedPhoneNumber, isOtpStep],
  );

  const formFields = useMemo(
    () =>
      isOtpStep ? (
        <>
          <Box>
            <TextField
              autoCapitalize={'none'}
              onChangeText={handleOtpValueChange}
              numberOfLines={1}
              value={confirmCode}
              keyboardType="number-pad"
              textContentType="oneTimeCode"
              autoComplete={autoComplete}
              maxLength={CODE_LENGTH}
              accessibilityLabel={strings(
                'card.card_otp_authentication.confirm_code_label',
              )}
              isError={!!error}
              testID="otp-code-field"
              autoFocus
            />
            {error && (
              <Text
                testID="otp-code-field-error"
                variant={TextVariant.BodySm}
                twClassName="text-error-default"
              >
                {error}
              </Text>
            )}
          </Box>

          {/* Resend verification */}
          <Box twClassName="mt-2">
            <Text
              variant={TextVariant.BodySm}
              twClassName="text-text-alternative"
              testID="otp-resend-verification"
            >
              {resendCooldown > 0 ? (
                strings('card.card_otp_authentication.resend_cooldown', {
                  seconds: resendCooldown,
                })
              ) : (
                <>
                  {strings('card.card_otp_authentication.didnt_receive_code')}
                  <Text
                    variant={TextVariant.BodySm}
                    twClassName="text-text-alternative underline"
                    onPress={resendCooldown > 0 ? undefined : handleResendOtp}
                    disabled={resendCooldown > 0 || otpLoading}
                  >
                    {strings(
                      'card.card_otp_authentication.resend_verification',
                    )}
                  </Text>
                </>
              )}
            </Text>
            {otpError && (
              <Text
                testID="otp-error-text"
                variant={TextVariant.BodySm}
                twClassName="text-error-default"
              >
                {otpError}
              </Text>
            )}
          </Box>
        </>
      ) : (
        <>
          <Box twClassName="flex-row justify-between gap-2">
            <TouchableOpacity
              onPress={() =>
                Engine.context.CardController.setUserLocation('international')
              }
              style={tw.style(
                `flex flex-col items-center justify-center flex-1 bg-background-muted rounded-lg ${location === 'international' ? 'border border-text-default' : ''}`,
              )}
            >
              <Box
                twClassName="flex flex-col items-center justify-center w-full p-4"
                testID="international-location-box"
              >
                <Icon name={IconName.Global} size={IconSize.Lg} />
                <Text
                  twClassName="text-center text-body-sm font-medium"
                  variant={TextVariant.BodySm}
                >
                  {strings('card.card_authentication.location_button_text')}
                </Text>
              </Box>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() =>
                Engine.context.CardController.setUserLocation('us')
              }
              style={tw.style(
                `flex flex-col items-center justify-center flex-1 bg-background-muted rounded-lg ${location === 'us' ? 'border border-text-default' : ''}`,
              )}
            >
              <Box
                twClassName="flex flex-col items-center justify-center flex-1 w-full p-4"
                testID="us-location-box"
              >
                <Text twClassName="text-center">{countryCodeToFlag('US')}</Text>
                <Text
                  twClassName="text-center text-body-sm font-medium"
                  variant={TextVariant.BodySm}
                >
                  {strings('card.card_authentication.location_button_text_us')}
                </Text>
              </Box>
            </TouchableOpacity>
          </Box>

          <Box>
            <Label>{strings('card.card_authentication.email_label')}</Label>
            <TextField
              autoCapitalize={'none'}
              autoComplete="one-time-code"
              onChangeText={handleEmailChange}
              numberOfLines={1}
              value={email}
              returnKeyType={'next'}
              keyboardType="email-address"
              maxLength={255}
              accessibilityLabel={strings(
                'card.card_authentication.email_label',
              )}
              testID="email-field"
            />
          </Box>
          <Box>
            <Label>{strings('card.card_authentication.password_label')}</Label>
            <TextField
              autoCapitalize={'none'}
              onChangeText={handlePasswordChange}
              autoComplete="one-time-code"
              numberOfLines={1}
              value={password}
              maxLength={255}
              returnKeyType={'done'}
              onSubmitEditing={() => performLogin()}
              secureTextEntry={!isPasswordVisible}
              accessibilityLabel={strings(
                'card.card_authentication.password_label',
              )}
              testID="password-field"
              endAccessory={
                <TouchableOpacity
                  onPress={() => setIsPasswordVisible(!isPasswordVisible)}
                  testID="password-visibility-toggle"
                >
                  <Icon
                    name={isPasswordVisible ? IconName.EyeSlash : IconName.Eye}
                    size={IconSize.Md}
                  />
                </TouchableOpacity>
              }
            />
          </Box>
        </>
      ),
    [
      confirmCode,
      email,
      error,
      handleEmailChange,
      handleOtpValueChange,
      handlePasswordChange,
      handleResendOtp,
      isPasswordVisible,
      isOtpStep,
      otpError,
      otpLoading,
      password,
      performLogin,
      resendCooldown,
      tw,
      location,
    ],
  );

  const actions = useMemo(
    () =>
      isOtpStep ? (
        <>
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            onPress={() => performLogin(confirmCode)}
            isLoading={loading}
            isDisabled={
              loading || !confirmCode || confirmCode.length < CODE_LENGTH
            }
            isFullWidth
            testID="otp-confirm-button"
          >
            {strings('card.card_otp_authentication.confirm_button')}
          </Button>
          <TouchableOpacity
            onPress={handleBackToLogin}
            testID="otp-back-to-login-button"
          >
            <Text
              variant={TextVariant.BodyMd}
              fontWeight={FontWeight.Medium}
              twClassName="text-default text-center p-4"
            >
              {strings('card.card_otp_authentication.back_to_login_button')}
            </Text>
          </TouchableOpacity>
        </>
      ) : (
        <Box twClassName="flex flex-col justify-center gap-2">
          {error && (
            <Text
              variant={TextVariant.BodySm}
              style={{ color: theme.colors.error.default }}
              testID="login-error-text"
            >
              {error}
            </Text>
          )}
          <Box>
            <Button
              variant={ButtonVariant.Primary}
              size={ButtonSize.Lg}
              testID={CardAuthenticationSelectors.VERIFY_ACCOUNT_BUTTON}
              onPress={() => performLogin()}
              isLoading={loading}
              isFullWidth
              isDisabled={isLoginDisabled || loading}
            >
              {strings('card.card_authentication.login_button')}
            </Button>
            <TouchableOpacity
              onPress={() => navigation.navigate(Routes.CARD.ONBOARDING.ROOT)}
            >
              <Text
                testID={CardAuthenticationSelectors.SIGNUP_BUTTON}
                variant={TextVariant.BodyMd}
                fontWeight={FontWeight.Medium}
                twClassName="text-default text-center p-4"
              >
                {strings('card.card_authentication.signup_button')}
              </Text>
            </TouchableOpacity>
          </Box>
        </Box>
      ),
    [
      confirmCode,
      error,
      handleBackToLogin,
      isLoginDisabled,
      isOtpStep,
      loading,
      navigation,
      performLogin,
      theme.colors.error.default,
    ],
  );

  return (
    <OnboardingStep
      title={title}
      description={description}
      formFields={formFields}
      actions={actions}
    />
  );
};

export default CardAuthentication;

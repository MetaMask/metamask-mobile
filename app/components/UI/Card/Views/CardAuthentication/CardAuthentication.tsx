import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform, TouchableOpacity, TextInputProps } from 'react-native';
import {
  Box,
  FontWeight,
  Text,
  TextVariant,
  Icon,
  IconName,
  IconSize,
} from '@metamask/design-system-react-native';
import TextField, {
  TextFieldSize,
} from '../../../../../component-library/components/Form/TextField';
import Label from '../../../../../component-library/components/Form/Label';

import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import { useTheme } from '../../../../../util/theme';
import useCardProviderAuthentication from '../../hooks/useCardProviderAuthentication';
import { CardAuthenticationSelectors } from './CardAuthentication.testIds';
import Routes from '../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../locales/i18n';
import Logger from '../../../../../util/Logger';
import { MetaMetricsEvents, useMetrics } from '../../../../hooks/useMetrics';
import { useDispatch, useSelector } from 'react-redux';
import {
  selectUserCardLocation,
  setOnboardingId,
  setUserCardLocation,
} from '../../../../../core/redux/slices/card';
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
  const { trackEvent, createEventBuilder } = useMetrics();
  const navigation = useNavigation();
  const [step, setStep] = useState<'login' | 'otp'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const location = useSelector(selectUserCardLocation);
  const [otpData, setOtpData] = useState<{
    userId: string;
    maskedPhoneNumber?: string;
  } | null>(null);
  const [confirmCode, setConfirmCode] = useState('');
  const [latestValueSubmitted, setLatestValueSubmitted] = useState<
    string | null
  >(null);
  const [resendCooldown, setResendCooldown] = useState(60);
  const dispatch = useDispatch();
  const theme = useTheme();
  const {
    login,
    error,
    clearError,
    sendOtpLogin,
    otpError,
    clearOtpError,
    otpLoading,
  } = useCardProviderAuthentication();

  const handleEmailChange = useCallback(
    (newEmail: string) => {
      setEmail(newEmail);
      if (error) {
        clearError();
      }
    },
    [error, clearError],
  );

  const handlePasswordChange = useCallback(
    (newPassword: string) => {
      setPassword(newPassword);
      if (error) {
        clearError();
      }
    },
    [error, clearError],
  );

  const handleOtpValueChange = useCallback(
    (text: string) => {
      setConfirmCode(text);
      setLatestValueSubmitted(null);
      if (error) {
        clearError();
      }
      if (otpError) {
        clearOtpError();
      }
    },
    [error, clearError, otpError, clearOtpError],
  );

  // Send OTP when entering OTP step
  useEffect(() => {
    if (step === 'otp' && otpData?.userId) {
      const sendOtp = async () => {
        try {
          await sendOtpLogin({
            userId: otpData.userId,
          });
          // Reset countdown when OTP is sent
          setResendCooldown(60);
        } catch (err) {
          Logger.log('CardAuthentication::Send OTP login failed', err);
        }
      };

      sendOtp();
    }
  }, [step, otpData?.userId, sendOtpLogin]);

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
    const screenName =
      step === 'login'
        ? CardScreens.AUTHENTICATION
        : CardScreens.OTP_AUTHENTICATION;

    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_VIEWED)
        .addProperties({
          screen: screenName,
        })
        .build(),
    );
  }, [trackEvent, createEventBuilder, step]);

  const performLogin = useCallback(
    async (otpCode?: string) => {
      const action =
        step === 'login'
          ? CardActions.AUTHENTICATION_LOGIN_BUTTON
          : CardActions.OTP_AUTHENTICATION_CONFIRM_BUTTON;

      trackEvent(
        createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
          .addProperties({
            action,
          })
          .build(),
      );

      try {
        setLoading(true);
        const loginResponse = await login({
          email,
          password,
          ...(otpCode ? { otpCode } : {}),
        });

        if (loginResponse?.isOtpRequired) {
          // Switch to OTP step instead of navigating
          setOtpData({
            userId: loginResponse.userId,
            maskedPhoneNumber: loginResponse.phoneNumber ?? undefined,
          });
          setStep('otp');
          return;
        }

        if (loginResponse?.phase) {
          dispatch(setOnboardingId(loginResponse.userId));
          navigation.reset({
            index: 0,
            routes: [
              {
                name: Routes.CARD.ONBOARDING.ROOT,
                params: { cardUserPhase: loginResponse.phase },
              },
            ],
          });
          return;
        }

        // Successful login - navigate to home
        navigation.reset({
          index: 0,
          routes: [{ name: Routes.CARD.HOME }],
        });
      } catch (err) {
        Logger.log('CardAuthentication::Login failed', err);
      } finally {
        setLoading(false);
      }
    },
    [
      email,
      login,
      password,
      step,
      navigation,
      dispatch,
      trackEvent,
      createEventBuilder,
    ],
  );

  // Auto-submit when all OTP digits are entered
  useEffect(() => {
    if (
      step === 'otp' &&
      confirmCode.length === CODE_LENGTH &&
      latestValueSubmitted !== confirmCode
    ) {
      setLatestValueSubmitted(confirmCode);
      performLogin(confirmCode);
    }
  }, [confirmCode, performLogin, latestValueSubmitted, step]);

  const isLoginDisabled = useMemo(
    () => !!error || email.length === 0 || password.length === 0,
    [error, email, password],
  );

  const handleResendOtp = useCallback(async () => {
    if (resendCooldown > 0 || !otpData?.userId || otpLoading) {
      return;
    }

    try {
      await sendOtpLogin({
        userId: otpData.userId,
      });
      setResendCooldown(60);
    } catch (err) {
      Logger.log('CardAuthentication::Resend OTP failed', err);
    }
  }, [resendCooldown, otpData?.userId, sendOtpLogin, otpLoading]);

  const handleBackToLogin = useCallback(() => {
    setStep('login');
    setConfirmCode('');
    setLatestValueSubmitted(null);
    setOtpData(null);
    setResendCooldown(60);
    clearOtpError();
  }, [clearOtpError]);

  const title = useMemo(
    () =>
      step === 'otp'
        ? strings('card.card_otp_authentication.title')
        : strings('card.card_authentication.title'),
    [step],
  );
  const description = useMemo(
    () =>
      step === 'otp'
        ? otpData?.maskedPhoneNumber
          ? strings(
              'card.card_otp_authentication.description_with_phone_number',
              { maskedPhoneNumber: otpData.maskedPhoneNumber },
            )
          : strings(
              'card.card_otp_authentication.description_without_phone_number',
            )
        : '',
    [otpData?.maskedPhoneNumber, step],
  );

  const formFields = useMemo(
    () =>
      step === 'otp' ? (
        <>
          <Box>
            <TextField
              autoCapitalize={'none'}
              onChangeText={handleOtpValueChange}
              numberOfLines={1}
              size={TextFieldSize.Lg}
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
              onPress={() => dispatch(setUserCardLocation('international'))}
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
              onPress={() => dispatch(setUserCardLocation('us'))}
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
              size={TextFieldSize.Lg}
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
              size={TextFieldSize.Lg}
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
      otpError,
      otpLoading,
      password,
      performLogin,
      resendCooldown,
      step,
      tw,
      dispatch,
      location,
    ],
  );
  const actions = useMemo(
    () =>
      step === 'otp' ? (
        <>
          <Button
            variant={ButtonVariants.Primary}
            label={strings('card.card_otp_authentication.confirm_button')}
            size={ButtonSize.Lg}
            onPress={() => performLogin(confirmCode)}
            loading={loading}
            isDisabled={
              loading || !confirmCode || confirmCode.length < CODE_LENGTH
            }
            width={ButtonWidthTypes.Full}
            testID="otp-confirm-button"
          />
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
              variant={ButtonVariants.Primary}
              label={strings('card.card_authentication.login_button')}
              size={ButtonSize.Lg}
              testID={CardAuthenticationSelectors.VERIFY_ACCOUNT_BUTTON}
              onPress={() => performLogin()}
              loading={loading}
              width={ButtonWidthTypes.Full}
              isDisabled={isLoginDisabled || loading}
            />
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
      loading,
      navigation,
      performLogin,
      step,
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

import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Image,
  Platform,
  TouchableOpacity,
  View,
  TextInput,
  StyleSheet,
  TextInputProps,
} from 'react-native';
import {
  Box,
  FontWeight,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';

import Icon, {
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';

import TextField, {
  TextFieldSize,
} from '../../../../../component-library/components/Form/TextField';
import Label from '../../../../../component-library/components/Form/Label';

import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import FoxImage from '../../../../../images/branding/fox.png';
import { useTheme } from '../../../../../util/theme';
import createStyles from './CardAuthentication.styles';
import { SafeAreaView } from 'react-native-safe-area-context';
import useCardProviderAuthentication from '../../hooks/useCardProviderAuthentication';
import { CardAuthenticationSelectors } from '../../../../../../e2e/selectors/Card/CardAuthentication.selectors';
import Routes from '../../../../../constants/navigation/Routes';
import { CardLocation } from '../../types';
import { strings } from '../../../../../../locales/i18n';
import Logger from '../../../../../util/Logger';
import {
  CodeField,
  Cursor,
  useBlurOnFulfill,
  useClearByFocusCell,
} from 'react-native-confirmation-code-field';
import { useStyles } from '../../../../../component-library/hooks';
import { Theme } from '../../../../../util/theme/models';
import { MetaMetricsEvents, useMetrics } from '../../../../hooks/useMetrics';
import { useDispatch } from 'react-redux';
import { setOnboardingId } from '../../../../../core/redux/slices/card';
import { CardActions, CardScreens } from '../../util/metrics';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

const CELL_COUNT = 6;
const autoComplete = Platform.select<TextInputProps['autoComplete']>({
  android: 'sms-otp',
  default: 'one-time-code',
});

// Styles for the OTP CodeField
const createOtpStyles = (params: { theme: Theme }) => {
  const { theme } = params;

  return StyleSheet.create({
    codeFieldRoot: {
      marginTop: 8,
      gap: 8,
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    cellRoot: {
      width: 48,
      height: 48,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.background.default,
      borderWidth: 1,
      borderColor: theme.colors.border.default,
      borderRadius: 8,
    },
    focusCell: {
      borderColor: theme.colors.primary.default,
      borderWidth: 2,
    },
  });
};

const CardAuthentication = () => {
  const { trackEvent, createEventBuilder } = useMetrics();
  const navigation = useNavigation();
  const [step, setStep] = useState<'login' | 'otp'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState<CardLocation>('international');
  const [otpData, setOtpData] = useState<{
    userId: string;
    maskedPhoneNumber?: string;
  } | null>(null);
  const [confirmCode, setConfirmCode] = useState('');
  const [latestValueSubmitted, setLatestValueSubmitted] = useState<
    string | null
  >(null);
  const [resendCountdown, setResendCountdown] = useState(60);
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
  const styles = createStyles(theme);
  const { styles: otpStyles } = useStyles(createOtpStyles, {});
  const tw = useTailwind();

  const handleEmailChange = (newEmail: string) => {
    setEmail(newEmail);
    if (error) {
      clearError();
    }
  };

  const handlePasswordChange = (newPassword: string) => {
    setPassword(newPassword);
    if (error) {
      clearError();
    }
  };

  const handleOtpValueChange = useCallback(
    (text: string) => {
      setConfirmCode(text);
      setLatestValueSubmitted(null);
      if (otpError) {
        clearOtpError();
      }
    },
    [otpError, clearOtpError],
  );

  // Send OTP when entering OTP step
  useEffect(() => {
    if (step === 'otp' && otpData?.userId) {
      const sendOtp = async () => {
        try {
          await sendOtpLogin({
            userId: otpData.userId,
            location,
          });
          // Reset countdown when OTP is sent
          setResendCountdown(60);
        } catch (err) {
          Logger.log('CardAuthentication::Send OTP login failed', err);
        }
      };

      sendOtp();
    }
  }, [step, otpData?.userId, sendOtpLogin, location]);

  // Countdown timer for resend OTP
  useEffect(() => {
    if (step === 'otp' && resendCountdown > 0) {
      const timer = setInterval(() => {
        setResendCountdown((prev) => prev - 1);
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [step, resendCountdown]);

  const otpInputRef =
    useBlurOnFulfill({
      value: confirmCode,
      cellCount: CELL_COUNT,
    }) || null;

  // Focus OTP input when entering OTP step
  useEffect(() => {
    if (step === 'otp') {
      otpInputRef.current?.focus();
    }
  }, [step, otpInputRef]);

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
          location,
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
      location,
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
      confirmCode.length === CELL_COUNT &&
      latestValueSubmitted !== confirmCode
    ) {
      setLatestValueSubmitted(confirmCode);
      performLogin(confirmCode);
    }
  }, [confirmCode, performLogin, latestValueSubmitted, step]);

  const [props, getCellOnLayoutHandler] = useClearByFocusCell({
    value: confirmCode,
    setValue: handleOtpValueChange,
  });

  const isLoginDisabled = useMemo(
    () => !!error || email.length === 0 || password.length === 0,
    [error, email, password],
  );

  const isOtpDisabled = useMemo(
    () => loading || !confirmCode || confirmCode.length < CELL_COUNT,
    [loading, confirmCode],
  );

  const handleResendOtp = useCallback(async () => {
    if (resendCountdown > 0 || !otpData?.userId) {
      return;
    }

    try {
      await sendOtpLogin({
        userId: otpData.userId,
        location,
      });
      setResendCountdown(60);
    } catch (err) {
      Logger.log('CardAuthentication::Resend OTP failed', err);
    }
  }, [resendCountdown, otpData?.userId, sendOtpLogin, location]);

  const handleBackToLogin = useCallback(() => {
    setStep('login');
    setConfirmCode('');
    setLatestValueSubmitted(null);
    setOtpData(null);
    setResendCountdown(60);
    clearOtpError();
  }, [clearOtpError]);

  return (
    <SafeAreaView
      style={tw.style('flex-1 bg-background-default')}
      edges={['bottom']}
    >
      <KeyboardAwareScrollView
        contentContainerStyle={tw.style('flex-grow px-4')}
        showsVerticalScrollIndicator={false}
        alwaysBounceVertical={false}
        enableOnAndroid
        enableAutomaticScroll
        extraScrollHeight={Platform.OS === 'android' ? 20 : 0}
      >
        {step === 'otp' ? (
          <Box style={styles.containerSpaceAround}>
            <Box>
              <Box style={styles.imageWrapper}>
                <Image
                  source={FoxImage}
                  style={styles.image}
                  resizeMode="contain"
                  testID={CardAuthenticationSelectors.FOX_IMAGE}
                />
              </Box>
              <Text variant={TextVariant.HeadingMd} style={styles.title}>
                {strings('card.card_otp_authentication.title')}
              </Text>
              <Text variant={TextVariant.BodyMd} style={styles.title}>
                {otpData?.maskedPhoneNumber
                  ? strings(
                      'card.card_otp_authentication.description_with_phone_number',
                      { maskedPhoneNumber: otpData.maskedPhoneNumber },
                    )
                  : strings(
                      'card.card_otp_authentication.description_without_phone_number',
                    )}
              </Text>
              <Box style={styles.textFieldsContainer}>
                <Box>
                  <Label style={styles.label}>
                    {strings('card.card_otp_authentication.confirm_code_label')}
                  </Label>
                  <CodeField
                    ref={otpInputRef as React.RefObject<TextInput>}
                    {...props}
                    value={confirmCode}
                    onChangeText={handleOtpValueChange}
                    cellCount={CELL_COUNT}
                    rootStyle={otpStyles.codeFieldRoot}
                    keyboardType="number-pad"
                    textContentType="oneTimeCode"
                    autoComplete={autoComplete}
                    renderCell={({ index, symbol, isFocused }) => (
                      <View
                        onLayout={getCellOnLayoutHandler(index)}
                        key={index}
                        style={[
                          otpStyles.cellRoot,
                          isFocused && otpStyles.focusCell,
                        ]}
                      >
                        <Text
                          variant={TextVariant.BodyLg}
                          twClassName="text-text-default font-bold text-center"
                        >
                          {symbol || (isFocused ? <Cursor /> : null)}
                        </Text>
                      </View>
                    )}
                  />
                </Box>
                {otpError && (
                  <Box style={styles.errorBox}>
                    <Text
                      variant={TextVariant.BodySm}
                      style={{ color: theme.colors.error.default }}
                    >
                      {otpError}
                    </Text>
                  </Box>
                )}
                <Box twClassName="mt-4 items-center">
                  {resendCountdown > 0 ? (
                    <Text
                      variant={TextVariant.BodyMd}
                      twClassName="text-text-alternative"
                    >
                      {strings('card.card_otp_authentication.resend_timer', {
                        seconds: resendCountdown,
                      })}
                    </Text>
                  ) : (
                    <TouchableOpacity
                      onPress={handleResendOtp}
                      disabled={otpLoading}
                    >
                      <Text
                        variant={TextVariant.BodyMd}
                        twClassName="text-primary-default font-medium"
                      >
                        {strings('card.card_otp_authentication.resend_code')}
                      </Text>
                    </TouchableOpacity>
                  )}
                </Box>
              </Box>
            </Box>
            <Box twClassName="gap-2">
              <Button
                variant={ButtonVariants.Primary}
                label={strings('card.card_otp_authentication.confirm_button')}
                size={ButtonSize.Lg}
                onPress={() => performLogin(confirmCode)}
                loading={loading || otpLoading}
                disabled={isOtpDisabled}
                width={ButtonWidthTypes.Full}
              />
              <Button
                variant={ButtonVariants.Secondary}
                label={strings(
                  'card.card_otp_authentication.back_to_login_button',
                )}
                size={ButtonSize.Lg}
                onPress={handleBackToLogin}
                disabled={loading || otpLoading}
                width={ButtonWidthTypes.Full}
              />
            </Box>
          </Box>
        ) : (
          <Box style={styles.container}>
            <Box style={styles.imageWrapper}>
              <Image
                source={FoxImage}
                style={styles.image}
                resizeMode="contain"
                testID={CardAuthenticationSelectors.FOX_IMAGE}
              />
            </Box>
            <Text
              variant={TextVariant.HeadingMd}
              testID={CardAuthenticationSelectors.WELCOME_TO_CARD_TITLE_TEXT}
              style={styles.title}
            >
              {strings('card.card_authentication.title')}
            </Text>
            <Box style={styles.locationButtonsContainer}>
              <TouchableOpacity
                style={[
                  styles.locationButton,
                  location === 'international' && styles.locationButtonSelected,
                ]}
                onPress={() => setLocation('international')}
              >
                <Icon
                  name={IconName.Global}
                  size={IconSize.Lg}
                  color={
                    location === 'international'
                      ? theme.colors.primary.default
                      : theme.colors.text.alternative
                  }
                />
                <Text
                  style={[
                    styles.locationButtonText,
                    {
                      color:
                        location === 'international'
                          ? theme.colors.primary.default
                          : theme.colors.text.alternative,
                    },
                  ]}
                  variant={TextVariant.BodySm}
                >
                  {strings('card.card_authentication.location_button_text')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.locationButton,
                  location === 'us' && styles.locationButtonSelected,
                ]}
                onPress={() => setLocation('us')}
              >
                <Text style={styles.usFlag}>🇺🇸</Text>
                <Text
                  style={[
                    styles.locationButtonText,
                    {
                      color:
                        location === 'us'
                          ? theme.colors.primary.default
                          : theme.colors.text.alternative,
                    },
                  ]}
                  variant={TextVariant.BodySm}
                >
                  {strings('card.card_authentication.location_button_text_us')}
                </Text>
              </TouchableOpacity>
            </Box>
            <Box style={styles.textFieldsContainer}>
              <Box>
                <Label style={styles.label}>
                  {strings('card.card_authentication.email_label')}
                </Label>
                <TextField
                  autoCapitalize={'none'}
                  onChangeText={handleEmailChange}
                  placeholder={strings(
                    'card.card_authentication.email_placeholder',
                  )}
                  numberOfLines={1}
                  size={TextFieldSize.Lg}
                  value={email}
                  returnKeyType={'next'}
                  keyboardType="email-address"
                  maxLength={255}
                  accessibilityLabel={strings(
                    'card.card_authentication.email_label',
                  )}
                />
              </Box>
              <Box>
                <Label style={styles.label}>
                  {strings('card.card_authentication.password_label')}
                </Label>
                <TextField
                  autoCapitalize={'none'}
                  onChangeText={handlePasswordChange}
                  placeholder={strings(
                    'card.card_authentication.password_placeholder',
                  )}
                  numberOfLines={1}
                  size={TextFieldSize.Lg}
                  value={password}
                  maxLength={255}
                  returnKeyType={'done'}
                  onSubmitEditing={() => performLogin()}
                  secureTextEntry
                  accessibilityLabel={strings(
                    'card.card_authentication.password_label',
                  )}
                />
              </Box>
            </Box>
            {error && (
              <Box style={styles.errorBox}>
                <Text
                  variant={TextVariant.BodySm}
                  style={{ color: theme.colors.error.default }}
                >
                  {error}
                </Text>
              </Box>
            )}
            <Box style={styles.buttonsContainer}>
              <Button
                variant={ButtonVariants.Primary}
                label={strings('card.card_authentication.login_button')}
                size={ButtonSize.Lg}
                testID={CardAuthenticationSelectors.VERIFY_ACCOUNT_BUTTON}
                onPress={() => performLogin()}
                loading={loading}
                style={[isLoginDisabled && styles.buttonDisabled]}
                width={ButtonWidthTypes.Full}
                disabled={isLoginDisabled || loading}
              />
              <TouchableOpacity
                onPress={() =>
                  navigation.navigate(Routes.CARD.ONBOARDING.ROOT, {
                    screen: Routes.CARD.ONBOARDING.SIGN_UP,
                  })
                }
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
        )}
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
};

export default CardAuthentication;

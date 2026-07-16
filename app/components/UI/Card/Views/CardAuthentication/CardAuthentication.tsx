import {
  useNavigation,
  useRoute,
  RouteProp,
  CommonActions,
} from '@react-navigation/native';
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
  TextField,
} from '@metamask/design-system-react-native';
import { useTheme } from '../../../../../util/theme';
import { useCardAuth } from '../../hooks/useCardAuth';
import { CardAuthenticationSelectors } from './CardAuthentication.testIds';
import Routes from '../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../locales/i18n';
import CardMessageBox from '../../components/CardMessageBox/CardMessageBox';
import Logger from '../../../../../util/Logger';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { useDispatch, useSelector } from 'react-redux';
import { setOnboardingId } from '../../../../../core/redux/slices/card';
import { selectCardUserLocation } from '../../../../../selectors/cardController';
import {
  selectCardForgotPasswordFeatureEnabled,
  selectImmersveOnboardingEnabled,
} from '../../../../../selectors/featureFlagController/card';
import { CardMessageBoxType, type CardLocation } from '../../types';
import { CardActions, CardScreens } from '../../util/metrics';
import OnboardingStep from '../../components/Onboarding/OnboardingStep';
import SelectField from '../../components/Onboarding/SelectField';
import NavigationService from '../../../../../core/NavigationService';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { countryCodeToFlag } from '../../util/countryCodeToFlag';
import { selectSelectedInternalAccountByScope } from '../../../../../selectors/multichainAccounts/accounts';
import { safeToChecksumAddress } from '../../../../../util/address';
import { useAccountGroupName } from '../../../../hooks/multichainAccounts/useAccountGroupName';
import { createAccountSelectorNavDetails } from '../../../../Views/AccountSelector';
import { useImmersveResumeOnboarding } from '../../hooks/useImmersveResumeOnboarding';
import { getCardProviderErrorMessage } from '../../util/getCardProviderErrorMessage';

type LocationSelection = CardLocation | 'uk';
const IMMERSVE_UK_COUNTRY_KEY = 'GB';

const CODE_LENGTH = 6;
const autoComplete = Platform.select<TextInputProps['autoComplete']>({
  android: 'sms-otp',
  default: 'one-time-code',
});

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type CardAuthenticationParams = {
  CardAuthentication:
    | {
        showAuthPrompt?: boolean;
        postAuthRedirect?: { screen: string; params?: object };
      }
    | undefined;
};

const CardAuthentication = () => {
  const tw = useTailwind();
  const { trackEvent, createEventBuilder } = useAnalytics();
  const navigation = useNavigation();
  const route =
    useRoute<RouteProp<CardAuthenticationParams, 'CardAuthentication'>>();
  const showAuthPrompt = route.params?.showAuthPrompt ?? false;
  const postAuthRedirect = route.params?.postAuthRedirect;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const persistedLocation = useSelector(selectCardUserLocation);
  const isForgotPasswordEnabled = useSelector(
    selectCardForgotPasswordFeatureEnabled,
  );
  const immersveEnabled = useSelector(selectImmersveOnboardingEnabled);
  const [selection, setSelection] = useState<LocationSelection>(
    persistedLocation ?? 'international',
  );
  const isUkMode = selection === 'uk';
  const selectedLocation: CardLocation =
    selection === 'uk' ? 'international' : selection;

  const accountName = useAccountGroupName();
  const selectAccountByScope = useSelector(
    selectSelectedInternalAccountByScope,
  );
  const immersveAddress = safeToChecksumAddress(
    selectAccountByScope('eip155:0')?.address,
  );
  const resumeImmersveOnboarding = useImmersveResumeOnboarding();
  const [isUkSubmitting, setIsUkSubmitting] = useState(false);
  const [ukError, setUkError] = useState<string | null>(null);
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
          await initiate.mutateAsync(selectedLocation);
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

        if (postAuthRedirect) {
          if (postAuthRedirect.screen === Routes.HOME_TABS) {
            NavigationService.navigation?.navigate(
              postAuthRedirect.screen,
              postAuthRedirect.params,
            );
          } else {
            navigation.dispatch(
              CommonActions.navigate(
                postAuthRedirect.screen,
                postAuthRedirect.params,
              ),
            );
          }
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
      selectedLocation,
      password,
      navigation,
      dispatch,
      trackEvent,
      createEventBuilder,
      postAuthRedirect,
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
    () => !!error || email.length === 0 || password.length === 0,
    [error, email, password],
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

  const handleForgotPassword = useCallback(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
        .addProperties({
          action: CardActions.AUTHENTICATION_FORGOT_PASSWORD,
        })
        .build(),
    );
    navigation.navigate(Routes.CARD.MODALS.ID, {
      screen: Routes.CARD.MODALS.FORGOT_PASSWORD,
      params: { location: selectedLocation },
    });
  }, [navigation, trackEvent, createEventBuilder, selectedLocation]);

  const openAccountSelector = useCallback(() => {
    navigation.navigate(
      ...createAccountSelectorNavDetails({
        isEvmOnly: true,
        isSelectOnly: true,
        disableAddAccountButton: true,
      }),
    );
  }, [navigation]);

  const handleUkSignIn = useCallback(async () => {
    if (!immersveAddress) return;
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
        .addProperties({
          action: CardActions.AUTHENTICATION_LOGIN_BUTTON,
        })
        .build(),
    );
    setUkError(null);
    setIsUkSubmitting(true);
    try {
      await resumeImmersveOnboarding({
        country: IMMERSVE_UK_COUNTRY_KEY,
        address: immersveAddress,
        showAccountExistsToast: false,
        navigateFromRoot: true,
      });
    } catch (err) {
      setUkError(getCardProviderErrorMessage(err));
    } finally {
      setIsUkSubmitting(false);
    }
  }, [
    immersveAddress,
    resumeImmersveOnboarding,
    trackEvent,
    createEventBuilder,
  ]);

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
        : undefined,
    [maskedPhoneNumber, isOtpStep],
  );

  const formFields = useMemo(
    () =>
      isOtpStep ? (
        <>
          <Box>
            <TextField
              onChangeText={handleOtpValueChange}
              value={confirmCode}
              isError={!!error}
              autoFocus
              inputProps={{
                autoCapitalize: 'none',
                numberOfLines: 1,
                keyboardType: 'number-pad',
                textContentType: 'oneTimeCode',
                autoComplete,
                maxLength: CODE_LENGTH,
                accessibilityLabel: strings(
                  'card.card_otp_authentication.confirm_code_label',
                ),
                testID: CardAuthenticationSelectors.OTP_CODE_FIELD,
              }}
            />
            {error && (
              <Text
                testID={CardAuthenticationSelectors.OTP_CODE_FIELD_ERROR}
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
              testID={CardAuthenticationSelectors.OTP_RESEND_VERIFICATION}
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
                testID={CardAuthenticationSelectors.OTP_ERROR_TEXT}
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
          {showAuthPrompt && (
            <CardMessageBox messageType={CardMessageBoxType.AuthPrompt} />
          )}
          <Box twClassName="flex-row justify-between gap-2">
            <TouchableOpacity
              onPress={() => setSelection('international')}
              style={tw.style(
                `flex flex-col items-center justify-center flex-1 bg-background-muted rounded-lg ${selection === 'international' ? 'border border-text-default' : ''}`,
              )}
            >
              <Box
                twClassName="flex flex-col items-center justify-center w-full p-4"
                testID={CardAuthenticationSelectors.INTERNATIONAL_LOCATION_BOX}
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
              onPress={() => setSelection('us')}
              style={tw.style(
                `flex flex-col items-center justify-center flex-1 bg-background-muted rounded-lg ${selection === 'us' ? 'border border-text-default' : ''}`,
              )}
            >
              <Box
                twClassName="flex flex-col items-center justify-center flex-1 w-full p-4"
                testID={CardAuthenticationSelectors.US_LOCATION_BOX}
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
            {immersveEnabled && (
              <TouchableOpacity
                onPress={() => setSelection('uk')}
                style={tw.style(
                  `flex flex-col items-center justify-center flex-1 bg-background-muted rounded-lg ${selection === 'uk' ? 'border border-text-default' : ''}`,
                )}
              >
                <Box
                  twClassName="flex flex-col items-center justify-center flex-1 w-full p-4"
                  testID={CardAuthenticationSelectors.UK_LOCATION_BOX}
                >
                  <Text twClassName="text-center">
                    {countryCodeToFlag('GB')}
                  </Text>
                  <Text
                    twClassName="text-center text-body-sm font-medium"
                    variant={TextVariant.BodySm}
                  >
                    {strings(
                      'card.card_authentication.location_button_text_uk',
                    )}
                  </Text>
                </Box>
              </TouchableOpacity>
            )}
          </Box>

          {isUkMode ? (
            <Box>
              <Label>
                {strings('card.card_onboarding.sign_up.account_label')}
              </Label>
              <SelectField
                value={accountName ?? undefined}
                onPress={openAccountSelector}
                testID={CardAuthenticationSelectors.UK_ACCOUNT_SELECT}
              />
              <Text
                variant={TextVariant.BodySm}
                twClassName="text-text-alternative mt-1"
              >
                {strings('card.card_onboarding.sign_up.account_description')}
              </Text>
              {ukError ? (
                <Text
                  variant={TextVariant.BodySm}
                  twClassName="text-error-default mt-1"
                  testID={CardAuthenticationSelectors.UK_LOGIN_ERROR_TEXT}
                >
                  {ukError}
                </Text>
              ) : null}
            </Box>
          ) : (
            <>
              <Box>
                <Label>{strings('card.card_authentication.email_label')}</Label>
                <TextField
                  onChangeText={handleEmailChange}
                  value={email}
                  inputProps={{
                    autoCapitalize: 'none',
                    autoComplete: 'username',
                    numberOfLines: 1,
                    returnKeyType: 'next',
                    keyboardType: 'email-address',
                    maxLength: 255,
                    accessibilityLabel: strings(
                      'card.card_authentication.email_label',
                    ),
                    testID: CardAuthenticationSelectors.EMAIL_FIELD,
                  }}
                />
              </Box>
              <Box>
                <Label>
                  {strings('card.card_authentication.password_label')}
                </Label>
                <TextField
                  onChangeText={handlePasswordChange}
                  value={password}
                  endAccessory={
                    <TouchableOpacity
                      onPress={() => setIsPasswordVisible(!isPasswordVisible)}
                      testID={
                        CardAuthenticationSelectors.PASSWORD_VISIBILITY_TOGGLE
                      }
                    >
                      <Icon
                        name={
                          isPasswordVisible ? IconName.EyeSlash : IconName.Eye
                        }
                        size={IconSize.Md}
                      />
                    </TouchableOpacity>
                  }
                  inputProps={{
                    autoCapitalize: 'none',
                    autoComplete: 'password',
                    numberOfLines: 1,
                    maxLength: 255,
                    returnKeyType: 'done',
                    onSubmitEditing: () => performLogin(),
                    secureTextEntry: !isPasswordVisible,
                    accessibilityLabel: strings(
                      'card.card_authentication.password_label',
                    ),
                    testID: CardAuthenticationSelectors.PASSWORD_FIELD,
                  }}
                />
                {isForgotPasswordEnabled && (
                  <TouchableOpacity
                    onPress={handleForgotPassword}
                    testID={CardAuthenticationSelectors.FORGOT_PASSWORD_BUTTON}
                    style={tw.style('self-end mt-2')}
                  >
                    <Text
                      variant={TextVariant.BodySm}
                      fontWeight={FontWeight.Medium}
                      twClassName="text-default"
                    >
                      {strings(
                        'card.card_authentication.forgot_password_button',
                      )}
                    </Text>
                  </TouchableOpacity>
                )}
              </Box>
            </>
          )}
        </>
      ),
    [
      confirmCode,
      email,
      error,
      handleEmailChange,
      handleForgotPassword,
      handleOtpValueChange,
      handlePasswordChange,
      handleResendOtp,
      isForgotPasswordEnabled,
      isPasswordVisible,
      isOtpStep,
      otpError,
      otpLoading,
      password,
      performLogin,
      resendCooldown,
      showAuthPrompt,
      tw,
      selection,
      isUkMode,
      immersveEnabled,
      accountName,
      openAccountSelector,
      ukError,
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
            testID={CardAuthenticationSelectors.OTP_CONFIRM_BUTTON}
          >
            {strings('card.card_otp_authentication.confirm_button')}
          </Button>
          <TouchableOpacity
            onPress={handleBackToLogin}
            testID={CardAuthenticationSelectors.OTP_BACK_TO_LOGIN_BUTTON}
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
          {error && !isUkMode && (
            <Text
              variant={TextVariant.BodySm}
              style={{ color: theme.colors.error.default }}
              testID={CardAuthenticationSelectors.LOGIN_ERROR_TEXT}
            >
              {error}
            </Text>
          )}
          <Box>
            <Button
              variant={ButtonVariant.Primary}
              size={ButtonSize.Lg}
              testID={CardAuthenticationSelectors.VERIFY_ACCOUNT_BUTTON}
              onPress={isUkMode ? handleUkSignIn : () => performLogin()}
              isLoading={isUkMode ? isUkSubmitting : loading}
              isFullWidth
              isDisabled={
                isUkMode
                  ? isUkSubmitting || !immersveAddress
                  : isLoginDisabled || loading
              }
            >
              {isUkMode
                ? strings('card.card_authentication.uk_login_button')
                : strings('card.card_authentication.login_button')}
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
      isUkMode,
      handleUkSignIn,
      isUkSubmitting,
      immersveAddress,
    ],
  );

  return (
    <OnboardingStep
      title={title}
      description={description}
      formFields={formFields}
      actions={actions}
      headerMode="back"
    />
  );
};

export default CardAuthentication;

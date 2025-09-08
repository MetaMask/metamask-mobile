import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  View,
  SafeAreaView,
  Image,
  BackHandler,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { captureException } from '@sentry/react-native';
import Text, {
  TextColor,
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import StorageWrapper from '../../../store/storage-wrapper';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../component-library/components/Buttons/Button';
import { strings } from '../../../../locales/i18n';
import FadeOutOverlay from '../../UI/FadeOutOverlay';
import {
  OnboardingActionTypes,
  saveOnboardingEvent as saveEvent,
} from '../../../actions/onboarding';
import { setAllowLoginWithRememberMe as setAllowLoginWithRememberMeUtil } from '../../../actions/security';
import { connect } from 'react-redux';
import { Dispatch } from 'redux';
import {
  passcodeType,
  updateAuthTypeStorageFlags,
} from '../../../util/authentication';
import { BiometryButton } from '../../UI/BiometryButton';
import Logger from '../../../util/Logger';
import {
  BIOMETRY_CHOICE_DISABLED,
  TRUE,
  PASSCODE_DISABLED,
  OPTIN_META_METRICS_UI_SEEN,
} from '../../../constants/storage';
import Routes from '../../../constants/navigation/Routes';
import { passwordRequirementsMet } from '../../../util/password';
import ErrorBoundary from '../ErrorBoundary';
import { toLowerCaseEquals } from '../../../util/general';
import { Authentication } from '../../../core';
import AUTHENTICATION_TYPE from '../../../constants/userProperties';

import { LoginOptionsSwitch } from '../../UI/LoginOptionsSwitch';
import { createRestoreWalletNavDetailsNested } from '../RestoreWallet/RestoreWallet';
import { parseVaultValue } from '../../../util/validators';
import { getVaultFromBackup } from '../../../core/BackupVault';
import { containsErrorMessage } from '../../../util/errorHandling';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { LoginViewSelectors } from '../../../../e2e/selectors/wallet/LoginView.selectors';
import trackErrorAsAnalytics from '../../../util/metrics/TrackError/trackErrorAsAnalytics';
import { downloadStateLogs } from '../../../util/logs';
import {
  trace,
  TraceName,
  TraceOperation,
  TraceContext,
  endTrace,
} from '../../../util/trace';
import TextField, {
  TextFieldSize,
} from '../../../component-library/components/Form/TextField';
import Label from '../../../component-library/components/Form/Label';
import HelpText, {
  HelpTextSeverity,
} from '../../../component-library/components/Form/HelpText';
import {
  DENY_PIN_ERROR_ANDROID,
  JSON_PARSE_ERROR_UNEXPECTED_TOKEN,
  PASSWORD_REQUIREMENTS_NOT_MET,
  VAULT_ERROR,
  PASSCODE_NOT_SET_ERROR,
  WRONG_PASSWORD_ERROR,
  WRONG_PASSWORD_ERROR_ANDROID,
  WRONG_PASSWORD_ERROR_ANDROID_2,
} from './constants';
import {
  ParamListBase,
  RouteProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import { useStyles } from '../../../component-library/hooks/useStyles';
import stylesheet from './styles';
import ReduxService from '../../../core/redux';
import { StackNavigationProp } from '@react-navigation/stack';
import { BIOMETRY_TYPE } from 'react-native-keychain';
import METAMASK_NAME from '../../../images/branding/metamask-name.png';
import OAuthService from '../../../core/OAuthService/OAuthService';
import trackOnboarding from '../../../util/metrics/TrackOnboarding/trackOnboarding';
import {
  SeedlessOnboardingControllerErrorMessage,
  RecoveryError as SeedlessOnboardingControllerRecoveryError,
} from '@metamask/seedless-onboarding-controller';
import {
  IMetaMetricsEvent,
  ITrackingEvent,
} from '../../../core/Analytics/MetaMetrics.types';
import { MetricsEventBuilder } from '../../../core/Analytics/MetricsEventBuilder';
import { useMetrics } from '../../hooks/useMetrics';
import {
  SeedlessOnboardingControllerError,
  SeedlessOnboardingControllerErrorType,
} from '../../../core/Engine/controllers/seedless-onboarding-controller/error';
import FOX_LOGO from '../../../images/branding/fox.png';
import { setupSentry } from '../../../util/sentry/utils';

// In android, having {} will cause the styles to update state
// using a constant will prevent this
const EmptyRecordConstant = {};

interface LoginRouteParams {
  locked: boolean;
  oauthLoginSuccess?: boolean;
  onboardingTraceCtx?: unknown;
}

interface LoginProps {
  saveOnboardingEvent: (...eventArgs: [ITrackingEvent]) => void;
}

/**
 * View where returning users can authenticate
 */
const Login: React.FC<LoginProps> = ({ saveOnboardingEvent }) => {
  const [disabledInput, setDisabledInput] = useState(false);
  const { isEnabled: isMetricsEnabled, enable } = useMetrics();

  const fieldRef = useRef<TextInput>(null);

  const [password, setPassword] = useState('');
  const [biometryType, setBiometryType] = useState<
    BIOMETRY_TYPE | AUTHENTICATION_TYPE | string | null
  >(null);
  const [rememberMe, setRememberMe] = useState(false);
  const [biometryChoice, setBiometryChoice] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorToThrow, setErrorToThrow] = useState<Error | null>(null);
  const [biometryPreviouslyDisabled, setBiometryPreviouslyDisabled] =
    useState(false);
  const [hasBiometricCredentials, setHasBiometricCredentials] = useState(false);
  const [rehydrationFailedAttempts, setRehydrationFailedAttempts] = useState(0);
  const navigation = useNavigation<StackNavigationProp<ParamListBase>>();
  const route = useRoute<RouteProp<{ params: LoginRouteParams }, 'params'>>();
  const {
    styles,
    theme: { colors, themeAppearance },
  } = useStyles(stylesheet, EmptyRecordConstant);
  const setAllowLoginWithRememberMe = (enabled: boolean) =>
    setAllowLoginWithRememberMeUtil(enabled);
  const passwordLoginAttemptTraceCtxRef = useRef<TraceContext | null>(null);

  const oauthLoginSuccess = route?.params?.oauthLoginSuccess ?? false;

  const track = (
    event: IMetaMetricsEvent,
    properties: Record<string, string | boolean | number>,
  ) => {
    trackOnboarding(
      MetricsEventBuilder.createEventBuilder(event)
        .addProperties(properties)
        .build(),
      saveOnboardingEvent,
    );
  };

  const handleBackPress = () => {
    if (!oauthLoginSuccess) {
      Authentication.lockApp();
    } else {
      navigation.goBack();
    }
    return false;
  };

  useEffect(() => {
    trace({
      name: TraceName.LoginUserInteraction,
      op: TraceOperation.Login,
    });

    const onboardingTraceCtxFromRoute = route.params?.onboardingTraceCtx;
    if (onboardingTraceCtxFromRoute) {
      passwordLoginAttemptTraceCtxRef.current = trace({
        name: TraceName.OnboardingPasswordLoginAttempt,
        op: TraceOperation.OnboardingUserJourney,
        parentContext: onboardingTraceCtxFromRoute,
      });
    }

    track(MetaMetricsEvents.LOGIN_SCREEN_VIEWED, {});

    BackHandler.addEventListener('hardwareBackPress', handleBackPress);

    const getUserAuthPreferences = async () => {
      const authData = await Authentication.getType();

      //Setup UI to handle Biometric
      const previouslyDisabled = await StorageWrapper.getItem(
        BIOMETRY_CHOICE_DISABLED,
      );
      const passcodePreviouslyDisabled = await StorageWrapper.getItem(
        PASSCODE_DISABLED,
      );

      if (authData.currentAuthType === AUTHENTICATION_TYPE.PASSCODE) {
        setBiometryType(passcodeType(authData.currentAuthType));
        setHasBiometricCredentials(!route?.params?.locked);
        setBiometryChoice(
          !(passcodePreviouslyDisabled && passcodePreviouslyDisabled === TRUE),
        );
        setBiometryPreviouslyDisabled(!!passcodePreviouslyDisabled);
      } else if (authData.currentAuthType === AUTHENTICATION_TYPE.REMEMBER_ME) {
        setHasBiometricCredentials(false);
        setRememberMe(true);
        setAllowLoginWithRememberMe(true);
      } else if (authData.availableBiometryType) {
        Logger.log('authData', authData);
        setBiometryType(authData.availableBiometryType);
        setHasBiometricCredentials(
          authData.currentAuthType === AUTHENTICATION_TYPE.BIOMETRIC,
        );
        setBiometryPreviouslyDisabled(!!previouslyDisabled);
        setBiometryChoice(!(previouslyDisabled && previouslyDisabled === TRUE));
      }
    };

    getUserAuthPreferences();

    return () => {
      BackHandler.removeEventListener('hardwareBackPress', handleBackPress);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleVaultCorruption = async () => {
    const LOGIN_VAULT_CORRUPTION_TAG = 'Login/ handleVaultCorruption:';

    // No need to check password requirements here, it will be checked in onLogin
    try {
      setLoading(true);
      const backupResult = await getVaultFromBackup();
      if (backupResult.vault) {
        const vaultSeed = await parseVaultValue(password, backupResult.vault);
        if (vaultSeed) {
          // get authType
          const authData = await Authentication.componentAuthenticationType(
            biometryChoice,
            rememberMe,
          );
          try {
            await Authentication.storePassword(
              password,
              authData.currentAuthType,
            );
            navigation.replace(
              ...createRestoreWalletNavDetailsNested({
                previousScreen: Routes.ONBOARDING.LOGIN,
              }),
            );
            setLoading(false);
            setError(null);
            return;
          } catch (e) {
            throw new Error(`${LOGIN_VAULT_CORRUPTION_TAG} ${e}`);
          }
        } else {
          throw new Error(`${LOGIN_VAULT_CORRUPTION_TAG} Invalid Password`);
        }
      } else if (backupResult.error) {
        throw new Error(`${LOGIN_VAULT_CORRUPTION_TAG} ${backupResult.error}`);
      }
    } catch (e: unknown) {
      Logger.error(e as Error);
      setLoading(false);
      setError(strings('login.invalid_password'));
    }
  };

  const updateBiometryChoice = async (newBiometryChoice: boolean) => {
    await updateAuthTypeStorageFlags(newBiometryChoice);
    setBiometryChoice(newBiometryChoice);
  };

  const navigateToHome = async () => {
    navigation.replace(Routes.ONBOARDING.HOME_NAV);
  };

  const checkMetricsUISeen = async (): Promise<void> => {
    const isOptinMetaMetricsUISeen = await StorageWrapper.getItem(
      OPTIN_META_METRICS_UI_SEEN,
    );

    if (!isOptinMetaMetricsUISeen && !isMetricsEnabled()) {
      navigation.reset({
        routes: [
          {
            name: Routes.ONBOARDING.ROOT_NAV,
            params: {
              screen: Routes.ONBOARDING.NAV,
              params: {
                screen: Routes.ONBOARDING.OPTIN_METRICS,
              },
            },
          },
        ],
      });
    } else {
      navigateToHome();
    }
  };

  const handleUseOtherMethod = () => {
    navigation.goBack();
    OAuthService.resetOauthState();
  };

  const isMountedRef = useRef(true);

  useEffect(
    () => () => {
      isMountedRef.current = false;
    },
    [],
  );

  const tooManyAttemptsError = async (initialRemainingTime: number) => {
    const lockEnd = Date.now() + initialRemainingTime * 1000;

    setDisabledInput(true);
    while (Date.now() < lockEnd) {
      const remainingTime = Math.floor((lockEnd - Date.now()) / 1000);
      if (remainingTime <= 0) {
        break;
      }

      if (!isMountedRef.current) {
        setError(null);
        setDisabledInput(false);
        return; // Exit early if component unmounted
      }

      const remainingHours = Math.floor(remainingTime / 3600);
      const remainingMinutes = Math.floor((remainingTime % 3600) / 60);
      const remainingSeconds = remainingTime % 60;
      const displayRemainingTime = `${remainingHours}:${remainingMinutes
        .toString()
        .padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;

      setError(
        strings('login.too_many_attempts', {
          remainingTime: displayRemainingTime,
        }),
      );
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    if (isMountedRef.current) {
      setError(null);
      setDisabledInput(false);
    }
  };

  const handleSeedlessOnboardingControllerError = (
    seedlessError:
      | Error
      | SeedlessOnboardingControllerRecoveryError
      | SeedlessOnboardingControllerError,
  ) => {
    setLoading(false);

    if (seedlessError instanceof SeedlessOnboardingControllerRecoveryError) {
      if (
        seedlessError.message ===
        SeedlessOnboardingControllerErrorMessage.IncorrectPassword
      ) {
        setError(strings('login.invalid_password'));
        return;
      } else if (
        seedlessError.message ===
        SeedlessOnboardingControllerErrorMessage.TooManyLoginAttempts
      ) {
        // Synchronize rehydrationFailedAttempts with numberOfAttempts from the error data
        if (seedlessError.data?.numberOfAttempts !== undefined) {
          setRehydrationFailedAttempts(seedlessError.data.numberOfAttempts);
        }
        if (typeof seedlessError.data?.remainingTime === 'number') {
          tooManyAttemptsError(seedlessError.data?.remainingTime).catch(
            () => null,
          );
        }
        return;
      }
    } else if (seedlessError instanceof SeedlessOnboardingControllerError) {
      if (
        seedlessError.code ===
        SeedlessOnboardingControllerErrorType.PasswordRecentlyUpdated
      ) {
        setError(strings('login.seedless_password_outdated'));
        return;
      }
    }
    const errMessage = seedlessError.message.replace(
      'SeedlessOnboardingController - ',
      '',
    );
    setError(errMessage);

    // If user has already consented to analytics, report error using regular Sentry
    if (isMetricsEnabled()) {
      oauthLoginSuccess &&
        captureException(seedlessError, {
          tags: {
            view: 'Login',
            context: 'OAuth rehydration failed - user consented to analytics',
          },
        });
    } else {
      // User hasn't consented to analytics yet, use ErrorBoundary onboarding flow
      oauthLoginSuccess &&
        setErrorToThrow(
          new Error(`OAuth rehydration failed: ${seedlessError.message}`),
        );
    }
  };

  const handlePasswordError = (loginErrorMessage: string) => {
    if (oauthLoginSuccess) {
      track(MetaMetricsEvents.REHYDRATION_PASSWORD_FAILED, {
        account_type: 'social',
        failed_attempts: rehydrationFailedAttempts,
      });
    }

    setLoading(false);
    setError(strings('login.invalid_password'));
    trackErrorAsAnalytics('Login: Invalid Password', loginErrorMessage);
  };

  const handleLoginError = async (loginErr: unknown) => {
    const loginError = loginErr as Error;
    const loginErrorMessage = loginError.toString();

    // Check if we are in the onboarding flow
    const onboardingTraceCtxFromRoute = route.params?.onboardingTraceCtx;
    if (onboardingTraceCtxFromRoute) {
      trace({
        name: TraceName.OnboardingPasswordLoginError,
        op: TraceOperation.OnboardingError,
        tags: { errorMessage: loginErrorMessage },
        parentContext: onboardingTraceCtxFromRoute,
      });
      endTrace({ name: TraceName.OnboardingPasswordLoginError });
    }

    if (loginErrorMessage.includes('SeedlessOnboardingController')) {
      handleSeedlessOnboardingControllerError(loginError);
      return;
    }

    const isPasswordError =
      toLowerCaseEquals(loginErrorMessage, WRONG_PASSWORD_ERROR) ||
      toLowerCaseEquals(loginErrorMessage, WRONG_PASSWORD_ERROR_ANDROID) ||
      toLowerCaseEquals(loginErrorMessage, WRONG_PASSWORD_ERROR_ANDROID_2) ||
      loginErrorMessage.includes(PASSWORD_REQUIREMENTS_NOT_MET);

    if (isPasswordError) {
      handlePasswordError(loginErrorMessage);
      return;
    }

    if (loginErrorMessage === PASSCODE_NOT_SET_ERROR) {
      Alert.alert(
        strings('login.security_alert_title'),
        strings('login.security_alert_desc'),
      );
      setLoading(false);
      return;
    }

    if (
      containsErrorMessage(loginError, VAULT_ERROR) ||
      containsErrorMessage(loginError, JSON_PARSE_ERROR_UNEXPECTED_TOKEN)
    ) {
      await handleVaultCorruption();
      return;
    }

    if (toLowerCaseEquals(loginErrorMessage, DENY_PIN_ERROR_ANDROID)) {
      setLoading(false);
      updateBiometryChoice(false);
      return;
    }

    setLoading(false);
    setError(loginErrorMessage);
  };

  const onLogin = async () => {
    endTrace({ name: TraceName.LoginUserInteraction });
    if (oauthLoginSuccess) {
      track(MetaMetricsEvents.REHYDRATION_PASSWORD_ATTEMPTED, {
        account_type: 'social',
        biometrics: biometryChoice,
      });
    }

    try {
      const locked = !passwordRequirementsMet(password);
      if (locked) {
        throw new Error(PASSWORD_REQUIREMENTS_NOT_MET);
      }
      if (loading || locked) return;

      setLoading(true);

      const authType = await Authentication.componentAuthenticationType(
        biometryChoice,
        rememberMe,
      );
      if (oauthLoginSuccess) {
        authType.oauth2Login = true;
      }

      await trace(
        {
          name: TraceName.AuthenticateUser,
          op: TraceOperation.Login,
        },
        async () => {
          await Authentication.userEntryAuth(password, authType);
        },
      );

      if (oauthLoginSuccess) {
        track(MetaMetricsEvents.REHYDRATION_COMPLETED, {
          account_type: 'social',
          biometrics: biometryChoice,
          failed_attempts: rehydrationFailedAttempts,
        });
      }

      if (passwordLoginAttemptTraceCtxRef.current) {
        endTrace({ name: TraceName.OnboardingPasswordLoginAttempt });
        passwordLoginAttemptTraceCtxRef.current = null;
      }
      endTrace({ name: TraceName.OnboardingExistingSocialLogin });
      endTrace({ name: TraceName.OnboardingJourneyOverall });

      if (oauthLoginSuccess) {
        if (!isMetricsEnabled()) {
          await enable();
        }
        await setupSentry();
        await navigateToHome();
      } else {
        await checkMetricsUISeen();
      }

      // Only way to land back on Login is to log out, which clears credentials (meaning we should not show biometric button)
      setPassword('');
      setLoading(false);
      setHasBiometricCredentials(false);
      setError(null);
      fieldRef.current?.clear();
    } catch (loginErr: unknown) {
      await handleLoginError(loginErr);
      Logger.error(loginErr as Error, 'Failed to unlock');
    }
  };

  const tryBiometric = async () => {
    fieldRef.current?.blur();
    try {
      setLoading(true);
      await trace(
        {
          name: TraceName.LoginBiometricAuthentication,
          op: TraceOperation.Login,
        },
        async () => {
          await Authentication.appTriggeredAuth();
        },
      );

      if (oauthLoginSuccess) {
        await navigateToHome();
      } else {
        await checkMetricsUISeen();
      }

      // Only way to land back on Login is to log out, which clears credentials (meaning we should not show biometric button)
      setPassword('');
      setHasBiometricCredentials(false);
      setLoading(false);
      fieldRef.current?.clear();
    } catch (tryBiometricError) {
      setHasBiometricCredentials(true);
      setLoading(false);
      Logger.log(tryBiometricError);
    }
    fieldRef.current?.blur();
  };

  const toggleWarningModal = () => {
    track(MetaMetricsEvents.FORGOT_PASSWORD_CLICKED, {});

    navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.MODAL.DELETE_WALLET,
      params: {
        oauthLoginSuccess,
      },
    });
  };

  const shouldRenderBiometricLogin =
    biometryType && !biometryPreviouslyDisabled ? biometryType : null;

  const renderSwitch = () => {
    const handleUpdateRememberMe = (rememberMeChoice: boolean) => {
      setRememberMe(rememberMeChoice);
    };

    return (
      <LoginOptionsSwitch
        shouldRenderBiometricOption={shouldRenderBiometricLogin}
        biometryChoiceState={biometryChoice}
        onUpdateBiometryChoice={updateBiometryChoice}
        onUpdateRememberMe={handleUpdateRememberMe}
      />
    );
  };

  const handleDownloadStateLogs = () => {
    const fullState = ReduxService.store.getState();

    track(MetaMetricsEvents.LOGIN_DOWNLOAD_LOGS, {});
    downloadStateLogs(fullState, false);
  };

  const shouldHideBiometricAccessoryButton = !(
    !oauthLoginSuccess &&
    biometryChoice &&
    biometryType &&
    hasBiometricCredentials &&
    !route?.params?.locked
  );

  // Component that throws error if needed (to be caught by ErrorBoundary)
  const ThrowErrorIfNeeded = () => {
    if (errorToThrow) {
      throw errorToThrow;
    }
    return null;
  };

  const handlePasswordChange = (newPassword: string) => {
    setPassword(newPassword);
    setError(null);
  };

  return (
    <ErrorBoundary
      navigation={navigation}
      view="Login"
      useOnboardingErrorHandling={!!errorToThrow && !isMetricsEnabled()}
    >
      <ThrowErrorIfNeeded />
      <SafeAreaView style={styles.mainWrapper}>
        <KeyboardAwareScrollView
          keyboardShouldPersistTaps="handled"
          resetScrollToCoords={{ x: 0, y: 0 }}
          style={styles.wrapper}
        >
          <View testID={LoginViewSelectors.CONTAINER} style={styles.container}>
            <Image
              source={METAMASK_NAME}
              style={styles.metamaskName}
              resizeMethod={'auto'}
            />

            <TouchableOpacity
              style={styles.foxWrapper}
              delayLongPress={10 * 1000} // 10 seconds
              onLongPress={handleDownloadStateLogs}
              activeOpacity={1}
            >
              <Image
                source={FOX_LOGO}
                style={styles.image}
                resizeMethod={'auto'}
              />
            </TouchableOpacity>

            <Text
              variant={TextVariant.DisplayMD}
              color={TextColor.Default}
              style={styles.title}
              testID={LoginViewSelectors.TITLE_ID}
            >
              {strings('login.title')}
            </Text>

            <View style={styles.field}>
              <Label
                variant={TextVariant.BodyMDMedium}
                color={TextColor.Default}
                style={styles.label}
              >
                {strings('login.password')}
              </Label>
              <TextField
                size={TextFieldSize.Lg}
                placeholder={strings('login.password_placeholder')}
                placeholderTextColor={colors.text.alternative}
                testID={LoginViewSelectors.PASSWORD_INPUT}
                returnKeyType={'done'}
                autoCapitalize="none"
                secureTextEntry
                ref={fieldRef}
                onChangeText={handlePasswordChange}
                value={password}
                onSubmitEditing={onLogin}
                endAccessory={
                  <BiometryButton
                    onPress={tryBiometric}
                    hidden={shouldHideBiometricAccessoryButton}
                    biometryType={biometryType as BIOMETRY_TYPE}
                  />
                }
                keyboardAppearance={themeAppearance}
                isDisabled={disabledInput}
                isError={!!error}
              />
            </View>

            <View style={styles.helperTextContainer}>
              {!!error && (
                <HelpText
                  severity={HelpTextSeverity.Error}
                  variant={TextVariant.BodyMD}
                  testID={LoginViewSelectors.PASSWORD_ERROR}
                >
                  {error}
                </HelpText>
              )}
            </View>

            <View style={styles.ctaWrapper}>
              {renderSwitch()}

              <Button
                variant={ButtonVariants.Primary}
                width={ButtonWidthTypes.Full}
                size={ButtonSize.Lg}
                onPress={onLogin}
                label={strings('login.unlock_button')}
                isDisabled={password.length === 0 || disabledInput || loading}
                testID={LoginViewSelectors.LOGIN_BUTTON_ID}
                loading={loading}
              />

              {!oauthLoginSuccess && (
                <Button
                  style={styles.goBack}
                  variant={ButtonVariants.Link}
                  onPress={toggleWarningModal}
                  testID={LoginViewSelectors.RESET_WALLET}
                  label={strings('login.forgot_password')}
                  isDisabled={loading}
                  size={ButtonSize.Lg}
                />
              )}
            </View>

            {oauthLoginSuccess && (
              <View style={styles.footer}>
                <Button
                  style={styles.goBack}
                  variant={ButtonVariants.Link}
                  onPress={handleUseOtherMethod}
                  testID={LoginViewSelectors.OTHER_METHODS_BUTTON}
                  label={strings('login.other_methods')}
                  loading={loading}
                  isDisabled={loading}
                  size={ButtonSize.Lg}
                />
              </View>
            )}
          </View>
        </KeyboardAwareScrollView>
        <FadeOutOverlay />
      </SafeAreaView>
    </ErrorBoundary>
  );
};

const mapDispatchToProps = (dispatch: Dispatch<OnboardingActionTypes>) => ({
  saveOnboardingEvent: (...eventArgs: [ITrackingEvent]) =>
    dispatch(saveEvent(eventArgs)),
});

export default connect(null, mapDispatchToProps)(Login);

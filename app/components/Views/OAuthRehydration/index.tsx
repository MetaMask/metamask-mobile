import React, {
  useEffect,
  useRef,
  useState,
  useMemo,
  useCallback,
} from 'react';
import {
  View,
  SafeAreaView,
  Image,
  BackHandler,
  TouchableOpacity,
  TextInput,
  Platform,
  Alert,
} from 'react-native';
import Text, {
  TextVariant,
  TextColor,
} from '../../../component-library/components/Texts/Text';
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
import { connect, useSelector } from 'react-redux';
import { Dispatch } from 'redux';
import { BiometryButton } from '../../UI/BiometryButton';
import Routes from '../../../constants/navigation/Routes';
import ErrorBoundary from '../ErrorBoundary';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { LoginViewSelectors } from '../../../../e2e/selectors/wallet/LoginView.selectors';
import { downloadStateLogs } from '../../../util/logs';
import {
  trace,
  TraceName,
  TraceOperation,
  TraceContext,
  endTrace,
} from '../../../util/trace';
import { captureException } from '@sentry/react-native';
import Logger from '../../../util/Logger';
import { passwordRequirementsMet } from '../../../util/password';
import { parseVaultValue } from '../../../util/validators';
import { getVaultFromBackup } from '../../../core/BackupVault';
import { containsErrorMessage } from '../../../util/errorHandling';
import trackErrorAsAnalytics from '../../../util/metrics/TrackError/trackErrorAsAnalytics';
import { trackVaultCorruption } from '../../../util/analytics/vaultCorruptionTracking';
import {
  PASSWORD_REQUIREMENTS_NOT_MET,
  VAULT_ERROR,
  PASSCODE_NOT_SET_ERROR,
  WRONG_PASSWORD_ERROR,
  WRONG_PASSWORD_ERROR_ANDROID,
  WRONG_PASSWORD_ERROR_ANDROID_2,
  DENY_PIN_ERROR_ANDROID,
  JSON_PARSE_ERROR_UNEXPECTED_TOKEN,
} from '../Login/constants';
import { createRestoreWalletNavDetailsNested } from '../RestoreWallet/RestoreWallet';
import { toLowerCaseEquals } from '../../../util/general';
import {
  SeedlessOnboardingControllerErrorMessage,
  RecoveryError as SeedlessOnboardingControllerRecoveryError,
} from '@metamask/seedless-onboarding-controller';
import {
  SeedlessOnboardingControllerError,
  SeedlessOnboardingControllerErrorType,
} from '../../../core/Engine/controllers/seedless-onboarding-controller/error';
import { useNetInfo } from '@react-native-community/netinfo';
import { SuccessErrorSheetParams } from '../SuccessErrorSheet/interface';
import { usePromptSeedlessRelogin } from '../../hooks/SeedlessHooks';
import { selectIsSeedlessPasswordOutdated } from '../../../selectors/seedlessOnboardingController';
import { Authentication } from '../../../core';
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
import OAuthService from '../../../core/OAuthService/OAuthService';
import trackOnboarding from '../../../util/metrics/TrackOnboarding/trackOnboarding';
import {
  IMetaMetricsEvent,
  ITrackingEvent,
} from '../../../core/Analytics/MetaMetrics.types';
import { MetricsEventBuilder } from '../../../core/Analytics/MetricsEventBuilder';
import { useMetrics } from '../../hooks/useMetrics';
import { LoginOptionsSwitch } from '../../UI/LoginOptionsSwitch';
import FOX_LOGO from '../../../images/branding/fox.png';
import METAMASK_NAME from '../../../images/branding/metamask-name.png';
import { useUserAuthPreferences } from '../../hooks/useUserAuthPreferences';
import { usePasswordOutdated } from '../Login/hooks/usePasswordOutdated';
import { LoginErrorMessage } from '../Login/components/LoginErrorMessage';
import Label from '../../../component-library/components/Form/Label';
import TextField, {
  TextFieldSize,
} from '../../../component-library/components/Form/TextField';

const EmptyRecordConstant = {};

interface OAuthRehydrationRouteParams {
  locked: boolean;
  oauthLoginSuccess: boolean;
  onboardingTraceCtx?: TraceContext;
}

interface OAuthRehydrationProps {
  saveOnboardingEvent: (...eventArgs: [ITrackingEvent]) => void;
}

const OAuthRehydration: React.FC<OAuthRehydrationProps> = ({
  saveOnboardingEvent,
}) => {
  const { isEnabled: isMetricsEnabled } = useMetrics();

  const fieldRef = useRef<TextInput>(null);

  const [password, setPassword] = useState('');
  const [errorToThrow, setErrorToThrow] = useState<Error | null>(null);
  const [rehydrationFailedAttempts, setRehydrationFailedAttempts] = useState(0);

  const navigation = useNavigation<StackNavigationProp<ParamListBase>>();
  const route =
    useRoute<RouteProp<{ params: OAuthRehydrationRouteParams }, 'params'>>();
  const {
    styles,
    theme: { colors, themeAppearance },
  } = useStyles(stylesheet, EmptyRecordConstant);

  const passwordLoginAttemptTraceCtxRef = useRef<TraceContext | null>(null);

  const track = useCallback(
    (
      event: IMetaMetricsEvent,
      properties: Record<string, string | boolean | number>,
    ) => {
      trackOnboarding(
        MetricsEventBuilder.createEventBuilder(event)
          .addProperties(properties)
          .build(),
        saveOnboardingEvent,
      );
    },
    [saveOnboardingEvent],
  );

  const {
    biometryType,
    rememberMe,
    setRememberMe,
    biometryChoice,
    hasBiometricCredentials,
    setHasBiometricCredentials,
    updateBiometryChoice,
  } = useUserAuthPreferences({
    locked: route?.params?.locked,
  });

  const navigateToHome = useCallback(async () => {
    navigation.replace(Routes.ONBOARDING.HOME_NAV);
  }, [navigation]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [disabledInput, setDisabledInput] = useState(false);

  const { isDeletingInProgress } = usePromptSeedlessRelogin();
  const isSeedlessPasswordOutdated = useSelector(
    selectIsSeedlessPasswordOutdated,
  );
  const netInfo = useNetInfo();
  const isMountedRef = useRef(true);

  const finalLoading = useMemo(
    () => loading || isDeletingInProgress,
    [loading, isDeletingInProgress],
  );

  const tooManyAttemptsError = useCallback(
    async (initialRemainingTime: number) => {
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
          return;
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
    },
    [],
  );

  const handleVaultCorruption = useCallback(async () => {
    const LOGIN_VAULT_CORRUPTION_TAG =
      'OAuthRehydration/ handleVaultCorruption:';

    trackVaultCorruption(VAULT_ERROR, {
      error_type: 'vault_corruption_handling',
      context: 'vault_corruption_recovery_attempt',
      oauth_login: true,
    });

    try {
      setLoading(true);
      const backupResult = await getVaultFromBackup();
      if (backupResult.vault) {
        const vaultSeed = await parseVaultValue(password, backupResult.vault);
        if (vaultSeed) {
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
      trackVaultCorruption((e as Error).message, {
        error_type: 'vault_corruption_handling_failed',
        context: 'vault_corruption_recovery_failed',
        oauth_login: true,
      });

      Logger.error(e as Error);
      setLoading(false);
      setError(strings('login.invalid_password'));
    }
  }, [password, biometryChoice, rememberMe, navigation]);

  const handleSeedlessOnboardingControllerError = useCallback(
    (
      seedlessError:
        | Error
        | SeedlessOnboardingControllerRecoveryError
        | SeedlessOnboardingControllerError,
    ) => {
      setLoading(false);

      if (!netInfo.isConnected || !netInfo.isInternetReachable) {
        const params: SuccessErrorSheetParams = {
          title: strings(`error_sheet.no_internet_connection_title`),
          description: strings(
            `error_sheet.no_internet_connection_description`,
          ),
          descriptionAlign: 'left',
          primaryButtonLabel: strings(
            `error_sheet.no_internet_connection_button`,
          ),
          closeOnPrimaryButtonPress: true,
          type: 'error',
        };
        navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
          screen: Routes.SHEET.SUCCESS_ERROR_SHEET,
          params,
        });
        return;
      }

      if (seedlessError instanceof SeedlessOnboardingControllerRecoveryError) {
        if (
          seedlessError.message ===
          SeedlessOnboardingControllerErrorMessage.IncorrectPassword
        ) {
          track(MetaMetricsEvents.REHYDRATION_PASSWORD_FAILED, {
            account_type: 'social',
            failed_attempts: rehydrationFailedAttempts,
            error_type: 'incorrect_password',
          });
          setError(strings('login.invalid_password'));
          return;
        } else if (
          seedlessError.message ===
          SeedlessOnboardingControllerErrorMessage.TooManyLoginAttempts
        ) {
          if (seedlessError.data?.numberOfAttempts !== undefined) {
            setRehydrationFailedAttempts(seedlessError.data.numberOfAttempts);
          }
          track(MetaMetricsEvents.REHYDRATION_PASSWORD_FAILED, {
            account_type: 'social',
            failed_attempts:
              seedlessError.data?.numberOfAttempts ?? rehydrationFailedAttempts,
            error_type: 'incorrect_password',
          });
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
          track(MetaMetricsEvents.REHYDRATION_PASSWORD_FAILED, {
            account_type: 'social',
            failed_attempts: rehydrationFailedAttempts,
            error_type: 'unknown_error',
          });
          setError(strings('login.seedless_password_outdated'));
          return;
        }
      }

      const errMessage = seedlessError.message.replace(
        'SeedlessOnboardingController - ',
        '',
      );
      setError(errMessage);

      track(MetaMetricsEvents.REHYDRATION_PASSWORD_FAILED, {
        account_type: 'social',
        failed_attempts: rehydrationFailedAttempts,
        error_type: 'unknown_error',
      });

      if (isMetricsEnabled()) {
        captureException(seedlessError, {
          tags: {
            view: 'Login',
            context: 'OAuth rehydration failed - user consented to analytics',
          },
        });
      } else {
        setErrorToThrow(
          new Error(`OAuth rehydration failed: ${seedlessError.message}`),
        );
      }
    },
    [
      rehydrationFailedAttempts,
      setRehydrationFailedAttempts,
      track,
      tooManyAttemptsError,
      isMetricsEnabled,
      netInfo,
      navigation,
      setErrorToThrow,
    ],
  );

  const handlePasswordError = useCallback((loginErrorMessage: string) => {
    setLoading(false);
    setError(strings('login.invalid_password'));
    trackErrorAsAnalytics('Login: Invalid Password', loginErrorMessage);
  }, []);

  const handleLoginError = useCallback(
    async (loginErr: unknown) => {
      const loginError = loginErr as Error;
      const loginErrorMessage = loginError.toString();

      if (route.params?.onboardingTraceCtx) {
        trace({
          name: TraceName.OnboardingPasswordLoginError,
          op: TraceOperation.OnboardingError,
          tags: { errorMessage: loginErrorMessage },
          parentContext: route.params.onboardingTraceCtx,
        });
        endTrace({ name: TraceName.OnboardingPasswordLoginError });
      }

      if (loginErrorMessage.includes('SeedlessOnboardingController')) {
        handleSeedlessOnboardingControllerError(loginError);
        return;
      }

      const isWrongPasswordError =
        toLowerCaseEquals(loginErrorMessage, WRONG_PASSWORD_ERROR) ||
        toLowerCaseEquals(loginErrorMessage, WRONG_PASSWORD_ERROR_ANDROID) ||
        toLowerCaseEquals(loginErrorMessage, WRONG_PASSWORD_ERROR_ANDROID_2);

      if (isWrongPasswordError) {
        track(MetaMetricsEvents.REHYDRATION_PASSWORD_FAILED, {
          account_type: 'social',
          failed_attempts: rehydrationFailedAttempts,
          error_type: 'incorrect_password',
        });
      }

      const isPasswordError =
        isWrongPasswordError ||
        loginErrorMessage.includes(PASSWORD_REQUIREMENTS_NOT_MET);

      if (isPasswordError) {
        handlePasswordError(loginErrorMessage);
        return;
      } else if (loginErrorMessage === PASSCODE_NOT_SET_ERROR) {
        Alert.alert(
          strings('login.security_alert_title'),
          strings('login.security_alert_desc'),
        );
      } else if (
        containsErrorMessage(loginError, VAULT_ERROR) ||
        containsErrorMessage(loginError, JSON_PARSE_ERROR_UNEXPECTED_TOKEN)
      ) {
        trackVaultCorruption(loginErrorMessage, {
          error_type: containsErrorMessage(loginError, VAULT_ERROR)
            ? 'vault_error'
            : 'json_parse_error',
          context: 'login_authentication',
          oauth_login: true,
        });

        await handleVaultCorruption();
      } else if (toLowerCaseEquals(loginErrorMessage, DENY_PIN_ERROR_ANDROID)) {
        updateBiometryChoice(false);
      } else {
        setError(loginErrorMessage);
      }

      track(MetaMetricsEvents.REHYDRATION_PASSWORD_FAILED, {
        account_type: 'social',
        failed_attempts: rehydrationFailedAttempts,
        error_type: 'unknown_error',
      });

      setLoading(false);
      Logger.error(loginErr as Error, 'Failed to rehydrate');
    },
    [
      rehydrationFailedAttempts,
      track,
      handleSeedlessOnboardingControllerError,
      handlePasswordError,
      handleVaultCorruption,
      updateBiometryChoice,
      route.params?.onboardingTraceCtx,
    ],
  );

  const onLogin = useCallback(async () => {
    endTrace({ name: TraceName.LoginUserInteraction });
    track(MetaMetricsEvents.REHYDRATION_PASSWORD_ATTEMPTED, {
      account_type: 'social',
      biometrics: biometryChoice,
    });

    try {
      const locked = !passwordRequirementsMet(password);
      if (locked) {
        throw new Error(PASSWORD_REQUIREMENTS_NOT_MET);
      }
      if (finalLoading || locked) return;

      setLoading(true);

      const authType = await Authentication.componentAuthenticationType(
        biometryChoice,
        rememberMe,
      );
      authType.oauth2Login = true;

      await trace(
        {
          name: TraceName.AuthenticateUser,
          op: TraceOperation.Login,
        },
        async () => {
          await Authentication.userEntryAuth(password, authType);
        },
      );

      track(MetaMetricsEvents.REHYDRATION_COMPLETED, {
        account_type: 'social',
        biometrics: biometryChoice,
        failed_attempts: rehydrationFailedAttempts,
      });

      if (passwordLoginAttemptTraceCtxRef?.current) {
        endTrace({ name: TraceName.OnboardingPasswordLoginAttempt });
        passwordLoginAttemptTraceCtxRef.current = null;
      }
      endTrace({ name: TraceName.OnboardingExistingSocialLogin });
      endTrace({ name: TraceName.OnboardingJourneyOverall });

      await navigateToHome();

      setLoading(false);
      setError(null);
    } catch (loginErr: unknown) {
      await handleLoginError(loginErr);
    }
  }, [
    password,
    biometryChoice,
    rememberMe,
    finalLoading,
    rehydrationFailedAttempts,
    handleLoginError,
    passwordLoginAttemptTraceCtxRef,
    navigateToHome,
    track,
  ]);

  const tryBiometric = useCallback(async () => {
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

      await navigateToHome();

      setLoading(false);
    } catch (tryBiometricError) {
      setLoading(false);
      Logger.log(tryBiometricError);
    }
  }, [navigateToHome]);

  usePasswordOutdated(setError);

  // Cleanup for isMountedRef tracking
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const handleBackPress = () => {
    navigation.goBack();
    return false;
  };

  useEffect(() => {
    trace({
      name: TraceName.LoginUserInteraction,
      op: TraceOperation.Login,
    });
    track(MetaMetricsEvents.LOGIN_SCREEN_VIEWED, {});
    BackHandler.addEventListener('hardwareBackPress', handleBackPress);

    return () => {
      BackHandler.removeEventListener('hardwareBackPress', handleBackPress);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onboardingTraceCtxFromRoute = route.params?.onboardingTraceCtx;
    if (onboardingTraceCtxFromRoute) {
      passwordLoginAttemptTraceCtxRef.current = trace({
        name: TraceName.OnboardingPasswordLoginAttempt,
        op: TraceOperation.OnboardingUserJourney,
        parentContext: onboardingTraceCtxFromRoute,
      });
    }
  }, [route.params?.onboardingTraceCtx]);

  const handleUseOtherMethod = () => {
    track(MetaMetricsEvents.USE_DIFFERENT_LOGIN_METHOD_CLICKED, {
      account_type: 'social',
    });
    navigation.goBack();
    OAuthService.resetOauthState();
  };

  const handleDownloadStateLogs = () => {
    const fullState = ReduxService.store.getState();
    track(MetaMetricsEvents.LOGIN_DOWNLOAD_LOGS, {});
    downloadStateLogs(fullState, false);
  };

  const shouldHideBiometricAccessoryButton = !(
    !isSeedlessPasswordOutdated &&
    biometryChoice &&
    biometryType &&
    hasBiometricCredentials &&
    !route?.params?.locked
  );

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

  const handleUpdateRememberMe = (rememberMeChoice: boolean) => {
    setRememberMe(rememberMeChoice);
  };

  const handleTryBiometric = async () => {
    fieldRef.current?.blur();
    await tryBiometric();
    setPassword('');
    setHasBiometricCredentials(false);
    fieldRef.current?.clear();
  };

  const handleLogin = async () => {
    await onLogin();
    setPassword('');
    setHasBiometricCredentials(false);
    fieldRef.current?.clear();
  };

  const shouldRenderBiometricLogin = biometryType;

  return (
    <ErrorBoundary
      navigation={navigation}
      view="OAuthRehydration"
      useOnboardingErrorHandling={!!errorToThrow && !isMetricsEnabled()}
    >
      <ThrowErrorIfNeeded />
      <SafeAreaView style={styles.mainWrapper}>
        <KeyboardAwareScrollView
          keyboardShouldPersistTaps="handled"
          resetScrollToCoords={{ x: 0, y: 0 }}
          style={styles.wrapper}
          contentContainerStyle={styles.scrollContentContainer}
          extraScrollHeight={Platform.OS === 'android' ? -200 : 0}
          enableResetScrollToCoords={false}
        >
          <View testID={LoginViewSelectors.CONTAINER} style={styles.container}>
            <View style={styles.oauthContentWrapper}>
              <Image
                source={METAMASK_NAME}
                style={styles.metamaskName}
                resizeMode="contain"
                resizeMethod={'auto'}
              />

              <TouchableOpacity
                style={styles.foxWrapper}
                delayLongPress={10 * 1000}
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
                  onSubmitEditing={handleLogin}
                  endAccessory={
                    <BiometryButton
                      onPress={handleTryBiometric}
                      hidden={shouldHideBiometricAccessoryButton}
                      biometryType={biometryType as BIOMETRY_TYPE}
                    />
                  }
                  keyboardAppearance={themeAppearance || undefined}
                  isDisabled={disabledInput}
                  isError={!!error}
                />
              </View>

              <LoginErrorMessage
                error={error}
                testID={LoginViewSelectors.PASSWORD_ERROR}
                style={styles.helperTextContainer}
              />

              <View style={styles.ctaWrapperRehydration}>
                <LoginOptionsSwitch
                  shouldRenderBiometricOption={shouldRenderBiometricLogin}
                  biometryChoiceState={biometryChoice}
                  onUpdateBiometryChoice={updateBiometryChoice}
                  onUpdateRememberMe={handleUpdateRememberMe}
                />
                <Button
                  variant={ButtonVariants.Primary}
                  width={ButtonWidthTypes.Full}
                  size={ButtonSize.Lg}
                  onPress={handleLogin}
                  label={strings('login.unlock_button')}
                  isDisabled={
                    password.length === 0 || disabledInput || finalLoading
                  }
                  testID={LoginViewSelectors.LOGIN_BUTTON_ID}
                  loading={finalLoading}
                />
              </View>

              <View style={styles.footer}>
                <TouchableOpacity
                  onPress={handleUseOtherMethod}
                  disabled={finalLoading}
                  testID={LoginViewSelectors.OTHER_METHODS_BUTTON}
                >
                  <Text
                    variant={TextVariant.BodyMDMedium}
                    color={TextColor.Primary}
                  >
                    {strings('login.other_methods')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
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

export default connect(null, mapDispatchToProps)(OAuthRehydration);

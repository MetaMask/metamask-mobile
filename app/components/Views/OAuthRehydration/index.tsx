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
import { connect } from 'react-redux';
import { Dispatch } from 'redux';
import Routes from '../../../constants/navigation/Routes';
import ErrorBoundary from '../ErrorBoundary';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { LoginViewSelectors } from '../Login/LoginView.testIds';
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
import trackErrorAsAnalytics from '../../../util/metrics/TrackError/trackErrorAsAnalytics';
import {
  PASSWORD_REQUIREMENTS_NOT_MET,
  PASSCODE_NOT_SET_ERROR,
  WRONG_PASSWORD_ERROR,
  WRONG_PASSWORD_ERROR_ANDROID,
  WRONG_PASSWORD_ERROR_ANDROID_2,
  DENY_PIN_ERROR_ANDROID,
} from '../Login/constants';
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
import OAuthService from '../../../core/OAuthService/OAuthService';
import trackOnboarding from '../../../util/metrics/TrackOnboarding/trackOnboarding';
import {
  IMetaMetricsEvent,
  ITrackingEvent,
} from '../../../core/Analytics/MetaMetrics.types';
import { MetricsEventBuilder } from '../../../core/Analytics/MetricsEventBuilder';
import { useMetrics } from '../../hooks/useMetrics';
import FOX_LOGO from '../../../images/branding/fox.png';
import METAMASK_NAME from '../../../images/branding/metamask-name.png';
import Label from '../../../component-library/components/Form/Label';
import TextField, {
  TextFieldSize,
} from '../../../component-library/components/Form/TextField';
import { updateAuthTypeStorageFlags } from '../../../util/authentication';
import HelpText, {
  HelpTextSeverity,
} from '../../../component-library/components/Form/HelpText';

const EmptyRecordConstant = {};

interface OAuthRehydrationRouteParams {
  locked: boolean;
  oauthLoginSuccess: boolean;
  onboardingTraceCtx?: TraceContext;
  isSeedlessPasswordOutdated?: boolean;
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

  const [biometryChoice, setBiometryChoice] = useState(true);
  const updateBiometryChoice = useCallback(
    async (newBiometryChoice: boolean) => {
      await updateAuthTypeStorageFlags(newBiometryChoice);
      setBiometryChoice(newBiometryChoice);
    },
    [],
  );

  // default biometric choice to true
  useEffect(() => {
    updateBiometryChoice(true);
  }, [updateBiometryChoice]);

  const navigateToHome = useCallback(async () => {
    navigation.replace(Routes.ONBOARDING.HOME_NAV);
  }, [navigation]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [disabledInput, setDisabledInput] = useState(false);

  const isSeedlessPasswordOutdated = route?.params?.isSeedlessPasswordOutdated;
  const isComingFromOauthOnboarding = route?.params?.oauthLoginSuccess;

  const { isDeletingInProgress, promptSeedlessRelogin } =
    usePromptSeedlessRelogin();
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
          if (isComingFromOauthOnboarding) {
            track(MetaMetricsEvents.REHYDRATION_PASSWORD_FAILED, {
              account_type: 'social',
              failed_attempts: rehydrationFailedAttempts,
              error_type: 'incorrect_password',
            });
          }
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
          if (isComingFromOauthOnboarding) {
            track(MetaMetricsEvents.REHYDRATION_PASSWORD_FAILED, {
              account_type: 'social',
              failed_attempts:
                seedlessError.data?.numberOfAttempts ??
                rehydrationFailedAttempts,
              error_type: 'incorrect_password',
            });
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
          if (isComingFromOauthOnboarding) {
            track(MetaMetricsEvents.REHYDRATION_PASSWORD_FAILED, {
              account_type: 'social',
              failed_attempts: rehydrationFailedAttempts,
              error_type: 'unknown_error',
            });
          }
          setError(strings('login.seedless_password_outdated'));
          return;
        }
      } else if (!isComingFromOauthOnboarding) {
        // new password relogin failed
        // for non oauth login (rehydration) failure, prompt user to reset and rehydrate
        // do we want to capture and report the error?
        if (isMetricsEnabled()) {
          captureException(seedlessError, {
            tags: {
              view: 'Re-login',
              context:
                'seedless flow unlock wallet failed - user consented to analytics',
            },
          });
        }
        Logger.error(seedlessError, 'Error in Unlock Screen');
        promptSeedlessRelogin();
        return;
      }

      const errMessage = seedlessError.message.replace(
        'SeedlessOnboardingController - ',
        '',
      );
      setError(errMessage);

      if (isComingFromOauthOnboarding) {
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
      promptSeedlessRelogin,
      isComingFromOauthOnboarding,
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

      if (isWrongPasswordError && isComingFromOauthOnboarding) {
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
      } else if (toLowerCaseEquals(loginErrorMessage, DENY_PIN_ERROR_ANDROID)) {
        updateBiometryChoice(false);
      } else {
        setError(loginErrorMessage);
      }

      if (isComingFromOauthOnboarding) {
        track(MetaMetricsEvents.REHYDRATION_PASSWORD_FAILED, {
          account_type: 'social',
          failed_attempts: rehydrationFailedAttempts,
          error_type: 'unknown_error',
        });
      }

      setLoading(false);
      Logger.error(loginErr as Error, 'Failed to rehydrate');
    },
    [
      rehydrationFailedAttempts,
      track,
      handleSeedlessOnboardingControllerError,
      handlePasswordError,
      updateBiometryChoice,
      route.params?.onboardingTraceCtx,
      isComingFromOauthOnboarding,
    ],
  );

  const onRehydrateLogin = useCallback(async () => {
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

      // try default with biometric if available and no remember me flag
      const authType = await Authentication.componentAuthenticationType(
        biometryChoice,
        false,
      );

      // Only set oauth2Login for normal rehydration, not when password is outdated
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
    finalLoading,
    rehydrationFailedAttempts,
    handleLoginError,
    passwordLoginAttemptTraceCtxRef,
    navigateToHome,
    track,
  ]);

  const newGlobalPasswordLogin = useCallback(async () => {
    try {
      const locked = !passwordRequirementsMet(password);
      if (locked) {
        throw new Error(PASSWORD_REQUIREMENTS_NOT_MET);
      }
      if (finalLoading || locked) return;

      setLoading(true);

      // try default with biometric if available and no remember me flag
      const authType = await Authentication.componentAuthenticationType(
        biometryChoice,
        false,
      );

      // Only set oauth2Login for normal rehydration, not when password is outdated
      authType.oauth2Login = false;

      await trace(
        {
          name: TraceName.AuthenticateUser,
          op: TraceOperation.Login,
        },
        async () => {
          await Authentication.userEntryAuth(password, authType);
        },
      );
      await navigateToHome();

      setLoading(false);
      setError(null);
    } catch (loginErr: unknown) {
      await handleLoginError(loginErr);
    }
  }, [
    password,
    biometryChoice,
    finalLoading,
    handleLoginError,
    navigateToHome,
  ]);

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

  // Handle password outdated state
  useEffect(() => {
    if (isSeedlessPasswordOutdated) {
      setError(strings('login.seedless_password_outdated'));
      Authentication.resetPassword().catch((e) => {
        Logger.error(e);
      });
    }
  }, [isSeedlessPasswordOutdated]);

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

  const handleLogin = async () => {
    if (isSeedlessPasswordOutdated) {
      await newGlobalPasswordLogin();
    } else {
      await onRehydrateLogin();
    }
    setPassword('');
    fieldRef.current?.clear();
  };

  const toggleWarningModal = () => {
    track(MetaMetricsEvents.FORGOT_PASSWORD_CLICKED, {});

    navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.MODAL.DELETE_WALLET,
      params: {
        oauthLoginSuccess: isComingFromOauthOnboarding,
      },
    });
  };
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
                  keyboardAppearance={themeAppearance || undefined}
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

              <View style={styles.ctaWrapperRehydration}>
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

              {isSeedlessPasswordOutdated ? (
                <Button
                  style={styles.goBack}
                  variant={ButtonVariants.Link}
                  onPress={toggleWarningModal}
                  testID={LoginViewSelectors.RESET_WALLET}
                  label={strings('login.forgot_password')}
                  isDisabled={loading}
                  size={ButtonSize.Lg}
                />
              ) : (
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
              )}
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

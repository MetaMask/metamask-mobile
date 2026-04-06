import React, {
  useEffect,
  useState,
  useMemo,
  useCallback,
  useContext,
  useRef,
} from 'react';
import {
  SafeAreaView,
  Image,
  BackHandler,
  TouchableOpacity,
  Platform,
  Alert,
  StatusBar,
} from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { strings } from '../../../../locales/i18n';
import FadeOutOverlay from '../../UI/FadeOutOverlay';
import {
  OnboardingActionTypes,
  saveOnboardingEvent as saveEvent,
} from '../../../actions/onboarding';
import { connect, useDispatch, useSelector } from 'react-redux';
import { Dispatch } from 'redux';
import Routes from '../../../constants/navigation/Routes';
import ErrorBoundary from '../ErrorBoundary';
import { MetaMetricsEvents } from '../../../core/Analytics/MetaMetrics.events';
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
import trackErrorAsAnalytics from '../../../util/metrics/TrackError/trackErrorAsAnalytics';
import {
  PASSCODE_NOT_SET_ERROR,
  WRONG_PASSWORD_ERROR,
  WRONG_PASSWORD_ERROR_ANDROID,
  WRONG_PASSWORD_ERROR_ANDROID_2,
} from '../Login/constants';
import { isBiometricUnlockCancelledByUser } from '../../../core/Authentication/utils';
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
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import ReduxService from '../../../core/redux';
import OAuthService from '../../../core/OAuthService/OAuthService';
import trackOnboarding from '../../../util/metrics/TrackOnboarding/trackOnboarding';
import {
  IMetaMetricsEvent,
  ITrackingEvent,
} from '../../../core/Analytics/MetaMetrics.types';
import { AnalyticsEventBuilder } from '../../../util/analytics/AnalyticsEventBuilder';
import { useAnalytics } from '../../hooks/useAnalytics/useAnalytics';
import FOX_LOGO from '../../../images/branding/fox.png';
import METAMASK_NAME from '../../../images/branding/metamask-name.png';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Button,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  TextField,
  Label,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import HelpText, {
  HelpTextSeverity,
} from '../../../component-library/components/Form/HelpText';
import useAuthentication from '../../../core/Authentication/hooks/useAuthentication';
import { containsErrorMessage } from '../../../util/errorHandling';
import { ensureError } from '../../../util/errorUtils';
import AUTHENTICATION_TYPE from '../../../constants/userProperties';
import type { AuthData } from '../../../core/Authentication/Authentication';
import { selectOnboardingAccountType } from '../../../selectors/onboarding';
import { getSocialAccountType } from '../../../constants/onboarding';
import { setDataCollectionForMarketing } from '../../../actions/security';
import { UserProfileProperty } from '../../../util/metrics/UserSettingsAnalyticsMetaData/UserProfileAnalyticsMetaData.types';
import { analytics } from '../../../util/analytics/analytics';
import { selectSeedlessOnboardingAuthConnection } from '../../../selectors/seedlessOnboardingController';
import { ThemeContext } from '../../../util/theme';
import Device from '../../../util/device';
import type { OAuthRehydrationRouteParams } from './OAuthRehydration.types';

const FOX_IMAGE_SIZE = Device.isIos() ? 175 : 150;
const foxImageStyle = {
  alignSelf: 'center' as const,
  width: FOX_IMAGE_SIZE,
  height: FOX_IMAGE_SIZE,
};

interface OAuthRehydrationProps {
  saveOnboardingEvent: (...eventArgs: [ITrackingEvent]) => void;
}

const OAuthRehydration: React.FC<OAuthRehydrationProps> = ({
  saveOnboardingEvent,
}) => {
  const { isEnabled: isMetricsEnabled } = useAnalytics();
  const accountType = useSelector(selectOnboardingAccountType) ?? 'social';
  const dispatch = useDispatch();
  const authConnection =
    useSelector(selectSeedlessOnboardingAuthConnection) ?? '';
  const tw = useTailwind();
  const { colors, themeAppearance } = useContext(ThemeContext);

  const route =
    useRoute<RouteProp<{ params: OAuthRehydrationRouteParams }, 'params'>>();
  const isSeedlessPasswordOutdated = route?.params?.isSeedlessPasswordOutdated;
  const isComingFromOauthOnboarding = route?.params?.oauthLoginSuccess;

  const [password, setPassword] = useState('');
  const [errorToThrow, setErrorToThrow] = useState<Error | null>(null);
  const [rehydrationFailedAttempts, setRehydrationFailedAttempts] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    isSeedlessPasswordOutdated
      ? strings('login.seedless_password_outdated')
      : null,
  );
  const [disabledInput, setDisabledInput] = useState(false);

  const { isDeletingInProgress, promptSeedlessRelogin } =
    usePromptSeedlessRelogin();
  const netInfo = useNetInfo();
  const isMountedRef = useRef(true);

  const finalLoading = useMemo(
    () => loading || isDeletingInProgress,
    [loading, isDeletingInProgress],
  );
  const navigation = useNavigation();

  const passwordLoginAttemptTraceCtxRef = useRef<TraceContext | null>(null);

  const {
    unlockWallet,
    getAuthType,
    requestBiometricsAccessControlForIOS,
    updateAuthPreference,
  } = useAuthentication();

  /**
   * After a successful password unlock, offer device auth / biometrics for keychain storage.
   */
  const upgradeKeychainAuthAfterSuccessfulUnlock = useCallback(async () => {
    try {
      const upgradeAuthType = await requestBiometricsAccessControlForIOS(
        AUTHENTICATION_TYPE.DEVICE_AUTHENTICATION,
      );
      if (upgradeAuthType !== AUTHENTICATION_TYPE.PASSWORD) {
        await updateAuthPreference({
          authType: upgradeAuthType,
          password,
          fallbackToPassword: true,
        });
      }
    } catch (postUnlockAuthErr) {
      Logger.error(
        ensureError(
          postUnlockAuthErr,
          'Post-unlock auth preference update failed',
        ),
        'OAuthRehydration: post-unlock biometric preference',
      );
    }
  }, [password, requestBiometricsAccessControlForIOS, updateAuthPreference]);

  const syncMarketingOptInAfterUnlock = useCallback(async () => {
    try {
      const marketingOptInStatus = await OAuthService.getMarketingOptInStatus();
      dispatch(setDataCollectionForMarketing(marketingOptInStatus.is_opt_in));
      analytics.identify({
        [UserProfileProperty.HAS_MARKETING_CONSENT]:
          marketingOptInStatus.is_opt_in
            ? UserProfileProperty.ON
            : UserProfileProperty.OFF,
      });
      analytics.trackEvent(
        AnalyticsEventBuilder.createEventBuilder(
          MetaMetricsEvents.ANALYTICS_PREFERENCE_SELECTED,
        )
          .addProperties({
            [UserProfileProperty.HAS_MARKETING_CONSENT]:
              marketingOptInStatus.is_opt_in,
            updated_after_onboarding: true,
            location: 'oauth_rehydration',
            account_type: getSocialAccountType(authConnection, true),
          })
          .build(),
      );
    } catch (err) {
      Logger.error(
        ensureError(err, 'Marketing opt-in sync failed'),
        'OAuthRehydration',
      );
    }
  }, [dispatch, authConnection]);

  const track = useCallback(
    (
      event: IMetaMetricsEvent,
      properties: Record<string, string | boolean | number>,
    ) => {
      trackOnboarding(
        AnalyticsEventBuilder.createEventBuilder(event)
          .addProperties(properties)
          .build(),
        saveOnboardingEvent,
      );
    },
    [saveOnboardingEvent],
  );

  const [biometryChoice, setBiometryChoice] = useState(true);

  const promptBiometricFailedAlert = useCallback(async () => {
    let authData: AuthData;
    try {
      authData = await getAuthType();
    } catch (err) {
      throw ensureError(err, 'Get auth type failed');
    }
    if (
      authData.currentAuthType === AUTHENTICATION_TYPE.PASSWORD &&
      authData.availableBiometryType
    ) {
      Alert.alert(
        strings('login.biometric_authentication_cancelled_title'),
        strings('login.biometric_authentication_cancelled_description'),
        [
          {
            text: strings('login.biometric_authentication_cancelled_button'),
          },
        ],
      );
    }
  }, [getAuthType]);

  // default biometric choice to true
  useEffect(() => {
    setBiometryChoice(true);
  }, [setBiometryChoice]);

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
              account_type: accountType,
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
              account_type: accountType,
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
              account_type: accountType,
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
          account_type: accountType,
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
      accountType,
    ],
  );

  const handlePasswordError = useCallback((loginErrorMessage: string) => {
    setLoading(false);
    setError(strings('login.invalid_password'));
    trackErrorAsAnalytics('Login: Invalid Password', loginErrorMessage);
  }, []);

  // Handles login/unlock errors from onRehydrateLogin and newGlobalPasswordLogin.
  // Call chain: onRehydrateLogin/newGlobalPasswordLogin → unlockWallet() →
  // Authentication wraps rethrown errors via ensureError, so loginError is always
  // an Error instance. We still guard against an empty .message with .trim() fallback.
  const handleLoginError = useCallback(
    async (loginError: Error) => {
      const loginErrorMessage =
        loginError.message?.trim() ||
        loginError.name?.trim() ||
        String(loginError);

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
        containsErrorMessage(loginError, WRONG_PASSWORD_ERROR) ||
        containsErrorMessage(loginError, WRONG_PASSWORD_ERROR_ANDROID) ||
        containsErrorMessage(loginError, WRONG_PASSWORD_ERROR_ANDROID_2);

      if (isWrongPasswordError) {
        if (isComingFromOauthOnboarding) {
          track(MetaMetricsEvents.REHYDRATION_PASSWORD_FAILED, {
            account_type: accountType,
            failed_attempts: rehydrationFailedAttempts,
            error_type: 'incorrect_password',
          });
        }
        handlePasswordError(loginErrorMessage);
        return;
      }

      const isBiometricCancellation =
        isBiometricUnlockCancelledByUser(loginError);

      if (isBiometricCancellation) {
        setBiometryChoice(false);
        setLoading(false);
        return;
      }

      const isPasscodeNotSet = loginErrorMessage === PASSCODE_NOT_SET_ERROR;

      if (isPasscodeNotSet) {
        Alert.alert(
          strings('login.security_alert_title'),
          strings('login.security_alert_desc'),
        );
      } else {
        setError(loginErrorMessage);
      }

      if (isComingFromOauthOnboarding) {
        track(MetaMetricsEvents.REHYDRATION_PASSWORD_FAILED, {
          account_type: accountType,
          failed_attempts: rehydrationFailedAttempts,
          error_type: isPasscodeNotSet ? 'passcode_not_set' : 'unknown_error',
        });
      }

      setLoading(false);
      Logger.error(loginError, 'Failed to rehydrate');
    },
    [
      rehydrationFailedAttempts,
      track,
      handleSeedlessOnboardingControllerError,
      handlePasswordError,
      setBiometryChoice,
      route.params?.onboardingTraceCtx,
      isComingFromOauthOnboarding,
      accountType,
    ],
  );

  const onRehydrateLogin = useCallback(async () => {
    endTrace({ name: TraceName.LoginUserInteraction });
    track(MetaMetricsEvents.REHYDRATION_PASSWORD_ATTEMPTED, {
      account_type: accountType,
      biometrics: biometryChoice,
    });

    try {
      if (finalLoading) return;

      setLoading(true);

      // Password first: do not prompt biometrics until unlock succeeds
      const authData: AuthData = {
        currentAuthType: AUTHENTICATION_TYPE.PASSWORD,
        oauth2Login: true,
      };

      await trace(
        {
          name: TraceName.AuthenticateUser,
          op: TraceOperation.Login,
        },
        async () => {
          await unlockWallet({
            password,
            authPreference: authData,
            onBeforeNavigate: upgradeKeychainAuthAfterSuccessfulUnlock,
          });
        },
      );

      // run syncMarketingOptInAfterUnlock in the background
      syncMarketingOptInAfterUnlock();

      // Best-effort post-unlock UX: show biometric cancelled alert if needed.
      // Failure here must not be treated as a login error — unlock already succeeded.
      try {
        await promptBiometricFailedAlert();
      } catch (alertErr) {
        Logger.log(alertErr, 'Failed to prompt biometric alert after unlock');
      }

      track(MetaMetricsEvents.REHYDRATION_COMPLETED, {
        account_type: accountType,
        biometrics: biometryChoice,
        failed_attempts: rehydrationFailedAttempts,
      });

      if (passwordLoginAttemptTraceCtxRef?.current) {
        endTrace({ name: TraceName.OnboardingPasswordLoginAttempt });
        passwordLoginAttemptTraceCtxRef.current = null;
      }
      endTrace({ name: TraceName.OnboardingExistingSocialLogin });
      endTrace({ name: TraceName.OnboardingJourneyOverall });

      setLoading(false);
      setError(null);
    } catch (loginErr) {
      await handleLoginError(ensureError(loginErr, 'Rehydrate login failed'));
    }
  }, [
    password,
    biometryChoice,
    finalLoading,
    rehydrationFailedAttempts,
    handleLoginError,
    passwordLoginAttemptTraceCtxRef,
    track,
    promptBiometricFailedAlert,
    unlockWallet,
    upgradeKeychainAuthAfterSuccessfulUnlock,
    accountType,
    syncMarketingOptInAfterUnlock,
  ]);

  const newGlobalPasswordLogin = useCallback(async () => {
    try {
      if (finalLoading) return;

      setLoading(true);

      track(MetaMetricsEvents.REHYDRATION_PASSWORD_ATTEMPTED, {
        account_type: accountType,
        login_type: 'global_password_update',
        biometrics: biometryChoice,
      });

      // biometrics/passcode preference is applied only after sync succeeds
      const authData: AuthData = {
        currentAuthType: AUTHENTICATION_TYPE.PASSWORD,
        oauth2Login: false,
      };

      await trace(
        {
          name: TraceName.AuthenticateUser,
          op: TraceOperation.Login,
        },
        async () => {
          await unlockWallet({
            password,
            authPreference: authData,
            onBeforeNavigate: upgradeKeychainAuthAfterSuccessfulUnlock,
          });
        },
      );

      // Best-effort post-unlock UX: show biometric cancelled alert if needed.
      // Failure here must not be treated as a login error — unlock already succeeded.
      try {
        await promptBiometricFailedAlert();
      } catch (alertErr) {
        Logger.log(alertErr, 'Failed to prompt biometric alert after unlock');
      }

      track(MetaMetricsEvents.REHYDRATION_COMPLETED, {
        account_type: accountType,
        login_type: 'global_password_update',
        biometrics: biometryChoice,
      });

      setLoading(false);
      setError(null);
    } catch (loginErr) {
      await handleLoginError(
        ensureError(loginErr, 'Global password login failed'),
      );
    }
  }, [
    password,
    finalLoading,
    biometryChoice,
    track,
    handleLoginError,
    promptBiometricFailedAlert,
    unlockWallet,
    upgradeKeychainAuthAfterSuccessfulUnlock,
    accountType,
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
    track(MetaMetricsEvents.LOGIN_SCREEN_VIEWED, {
      login_type: 'seedless_rehydration',
    });
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
      account_type: accountType,
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

  const renderPasswordField = () => (
    <TextField
      placeholder={strings('login.password_placeholder')}
      testID={LoginViewSelectors.PASSWORD_INPUT}
      returnKeyType={'done'}
      autoCapitalize="none"
      secureTextEntry
      onChangeText={handlePasswordChange}
      value={password}
      onSubmitEditing={handleLogin}
      keyboardAppearance={themeAppearance}
      isDisabled={disabledInput}
      isError={!!error}
    />
  );

  const renderHelperText = () =>
    !!error && (
      <HelpText
        severity={HelpTextSeverity.Error}
        testID={LoginViewSelectors.PASSWORD_ERROR}
      >
        {error}
      </HelpText>
    );

  const renderFooterAction = () =>
    isSeedlessPasswordOutdated ? (
      <Button
        variant={ButtonVariant.Tertiary}
        size={ButtonSize.Lg}
        testID={LoginViewSelectors.RESET_WALLET}
        onPress={toggleWarningModal}
        isDisabled={loading}
        twClassName="self-center my-3.5"
      >
        {strings('login.forgot_password')}
      </Button>
    ) : (
      <Button
        variant={ButtonVariant.Tertiary}
        size={ButtonSize.Lg}
        onPress={handleUseOtherMethod}
        isDisabled={finalLoading}
        testID={LoginViewSelectors.OTHER_METHODS_BUTTON}
        twClassName="self-center mt-6"
      >
        {strings('login.other_methods')}
      </Button>
    );
  return (
    <ErrorBoundary
      navigation={navigation}
      view="OAuthRehydration"
      useOnboardingErrorHandling={!!errorToThrow && !isMetricsEnabled()}
    >
      <ThrowErrorIfNeeded />
      <SafeAreaView
        style={[
          tw.style('flex-1'),
          { backgroundColor: colors.background.default },
          Platform.OS === 'android' && {
            paddingTop: StatusBar.currentHeight ?? 0,
          },
        ]}
      >
        <KeyboardAwareScrollView
          keyboardShouldPersistTaps="handled"
          resetScrollToCoords={{ x: 0, y: 0 }}
          style={tw.style('flex-1')}
          contentContainerStyle={tw.style('flex-1')}
          extraScrollHeight={Platform.OS === 'android' ? -200 : 0}
          enableResetScrollToCoords={false}
        >
          <Box
            testID={LoginViewSelectors.CONTAINER}
            alignItems={BoxAlignItems.Center}
            paddingHorizontal={6}
            twClassName="flex-1 w-full"
          >
            <Box
              alignItems={BoxAlignItems.Center}
              twClassName="w-full flex-1 mt-2.5"
            >
              <Image
                source={METAMASK_NAME}
                style={[
                  tw.style('w-20 h-10 self-center mt-2.5'),
                  { tintColor: colors.icon.default },
                ]}
                resizeMode="contain"
                resizeMethod={'auto'}
              />

              <TouchableOpacity
                style={tw.style('self-center mt-12')}
                delayLongPress={10 * 1000}
                onLongPress={handleDownloadStateLogs}
                activeOpacity={1}
              >
                <Image
                  source={FOX_LOGO}
                  style={foxImageStyle}
                  resizeMethod={'auto'}
                />
              </TouchableOpacity>

              <Text
                variant={TextVariant.DisplayMd}
                color={TextColor.TextDefault}
                twClassName="my-6 text-center"
                testID={LoginViewSelectors.TITLE_ID}
              >
                {strings('login.title')}
              </Text>

              <Box gap={2} twClassName="w-full">
                <Label
                  fontWeight={FontWeight.Medium}
                  color={TextColor.TextDefault}
                  twClassName="-mb-1"
                >
                  {strings('login.password')}
                </Label>
                {renderPasswordField()}
              </Box>

              <Box
                flexDirection={BoxFlexDirection.Row}
                twClassName="self-start gap-y-0.5"
              >
                {renderHelperText()}
              </Box>

              <Box
                alignItems={BoxAlignItems.Center}
                twClassName={`w-full mt-4${Platform.OS === 'android' ? ' gap-4' : ''}`}
                pointerEvents="box-none"
              >
                <Button
                  variant={ButtonVariant.Primary}
                  isFullWidth
                  size={ButtonSize.Lg}
                  onPress={handleLogin}
                  isDisabled={
                    password.length === 0 || disabledInput || finalLoading
                  }
                  testID={LoginViewSelectors.LOGIN_BUTTON_ID}
                  isLoading={finalLoading}
                >
                  {strings('login.unlock_button')}
                </Button>

                {renderFooterAction()}
              </Box>
            </Box>
          </Box>
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

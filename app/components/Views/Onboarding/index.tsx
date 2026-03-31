import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
  useContext,
} from 'react';
import {
  ActivityIndicator,
  BackHandler,
  ScrollView,
  InteractionManager,
  Animated,
  Easing,
  Platform,
} from 'react-native';
import { captureException } from '@sentry/react-native';
import { colors as importedColors } from '../../../styles/common';
import { strings } from '../../../../locales/i18n';
import { useSelector, useDispatch } from 'react-redux';
import FadeOutOverlay from '../../UI/FadeOutOverlay';
import Device from '../../../util/device';
import BaseNotification from '../../UI/Notification/BaseNotification';
import ElevatedView from 'react-native-elevated-view';
import { loadingSet, loadingUnset } from '../../../actions/user';
import {
  saveOnboardingEvent as saveEvent,
  setAccountType,
  clearSeedlessOnboarding,
} from '../../../actions/onboarding';
import {
  AccountType,
  getSocialAccountType,
} from '../../../constants/onboarding';
import {
  storePrivacyPolicyClickedOrClosed as storePrivacyPolicyClickedOrClosedAction,
  storePna25Acknowledged as storePna25AcknowledgedAction,
} from '../../../actions/legalNotices';
import { selectIsPna25FlagEnabled } from '../../../selectors/featureFlagController/legalNotices';
import PreventScreenshot from '../../../core/PreventScreenshot';
import { PREVIOUS_SCREEN, ONBOARDING } from '../../../constants/navigation';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { Authentication } from '../../../core';
import { getVaultFromBackup } from '../../../core/BackupVault';
import Logger from '../../../util/Logger';
import FilesystemStorage from 'redux-persist-filesystem-storage';
import { MIGRATION_ERROR_HAPPENED } from '../../../constants/storage';
import {
  markMetricsOptInUISeen,
  resetMetricsOptInUISeen,
} from '../../../util/metrics/metricsOptInUIUtils';
import { ThemeContext } from '../../../util/theme';
import { isE2E } from '../../../util/test/utils';
import { OnboardingSelectorIDs } from './Onboarding.testIds';
import Routes from '../../../constants/navigation/Routes';
import { selectExistingUser } from '../../../reducers/user/selectors';
import trackOnboarding from '../../../util/metrics/TrackOnboarding/trackOnboarding';
import { fetch as netInfoFetch } from '@react-native-community/netinfo';
import {
  useNavigation,
  useRoute,
  RouteProp,
  StackActions,
} from '@react-navigation/native';
import {
  TraceName,
  TraceOperation,
  TraceContext,
  endTrace,
  trace,
  hasMetricsConsent,
  discardBufferedTraces,
} from '../../../util/trace';
import { getTraceTags } from '../../../util/sentry/tags';
import { store } from '../../../store';
import type { RootState } from '../../../reducers';
import { MetricsEventBuilder } from '../../../core/Analytics/MetricsEventBuilder';
import {
  IMetaMetricsEvent,
  ITrackingEvent,
} from '../../../core/Analytics/MetaMetrics.types';
import { JsonMap } from '@segment/analytics-react-native';
import { SEEDLESS_ONBOARDING_ENABLED } from '../../../core/OAuthService/OAuthLoginHandlers/constants';
import OAuthLoginService from '../../../core/OAuthService/OAuthService';
import { OAuthError, OAuthErrorType } from '../../../core/OAuthService/error';
import { createLoginHandler } from '../../../core/OAuthService/OAuthLoginHandlers';
import { AuthConnection } from '../../../core/OAuthService/OAuthInterface';
import { useAnalytics } from '../../hooks/useAnalytics/useAnalytics';
import { setupSentry } from '../../../util/sentry/utils';
import ErrorBoundary from '../ErrorBoundary';
import FastOnboarding from './FastOnboarding';
import { SafeAreaView } from 'react-native-safe-area-context';
import FoxAnimation from '../../UI/FoxAnimation/FoxAnimation';
import OnboardingAnimation from '../../UI/OnboardingAnimation/OnboardingAnimation';
import {
  Box,
  BoxAlignItems,
  BoxJustifyContent,
  Button,
  ButtonSize,
  ButtonVariant,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import {
  Theme,
  ThemeProvider,
  useTailwind,
} from '@metamask/design-system-twrnc-preset';

import { getBuildNumber, getVersion } from 'react-native-device-info';
import { navigateToSuccessErrorSheetPromise } from '../SuccessErrorSheet/utils';
import {
  IconColor,
  IconName,
} from '../../../component-library/components/Icons/Icon';
import { AppNavigationProp } from '../../../core/NavigationService/types';
interface OnboardingState {
  warningModalVisible: boolean;
  loading: boolean;
  existingUser: boolean;
  createWallet: boolean;
  existingWallet: boolean;
  errorSheetVisible: boolean;
  errorToThrow: Error | null;
  startOnboardingAnimation: boolean;
  startFoxAnimation: 'Start' | 'Loader' | undefined;
}

interface OAuthLoginResult {
  type: 'success' | 'error';
  existingUser: boolean;
  accountName?: string;
  error?: Error;
}

interface OnboardingRouteParams {
  [PREVIOUS_SCREEN]: string;
  delete_wallet_toast_visible?: boolean;
  delete?: string;
  showErrorReportSentToast?: boolean;
}

const Onboarding = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const onboardingVersion = useMemo(
    () => `${getVersion()} (${getBuildNumber()})`,
    [],
  );

  const route =
    useRoute<RouteProp<{ params: OnboardingRouteParams }, 'params'>>();
  const dispatch = useDispatch();
  const metrics = useAnalytics();

  const passwordSet = useSelector((state: RootState) => state.user.passwordSet);
  const existingUserProp = useSelector(selectExistingUser);
  const loading = useSelector((state: RootState) => state.user.loadingSet);
  const loadingMsg = useSelector(
    (state: RootState) => state.user.loadingMsg || '',
  );
  const isPna25FlagEnabled = useSelector(selectIsPna25FlagEnabled);

  const setLoading = useCallback(
    (msg?: string) => dispatch(loadingSet(msg || '')),
    [dispatch],
  );
  const unsetLoading = useCallback(() => dispatch(loadingUnset()), [dispatch]);
  const disableNewPrivacyPolicyToast = useCallback(
    () => dispatch(storePrivacyPolicyClickedOrClosedAction()),
    [dispatch],
  );
  const saveOnboardingEvent = useCallback(
    (...eventArgs: [ITrackingEvent]) => dispatch(saveEvent(eventArgs)),
    [dispatch],
  );
  const storePna25Acknowledged = useCallback(
    () => dispatch(storePna25AcknowledgedAction()),
    [dispatch],
  );

  const themeContext = useContext(ThemeContext);
  const tw = useTailwind();

  const [state, setState] = useState<OnboardingState>({
    warningModalVisible: false,
    loading: false,
    existingUser: false,
    createWallet: false,
    existingWallet: false,
    errorSheetVisible: false,
    errorToThrow: null,
    startOnboardingAnimation: false,
    startFoxAnimation: undefined,
  });

  const notificationAnimated = useRef(new Animated.Value(100)).current;

  const onboardingTraceCtx = useRef<TraceContext>(undefined);
  const socialLoginTraceCtx = useRef<TraceContext>(undefined);

  const mounted = useRef<boolean>(false);
  const hasCheckedVaultBackup = useRef<boolean>(false);
  const warningCallback = useRef<() => boolean>(() => true);
  const notificationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const animatedTimingStart = useCallback(
    (animatedRef: Animated.Value, toValue: number): void => {
      Animated.timing(animatedRef, {
        toValue,
        duration: 500,
        easing: Easing.linear,
        useNativeDriver: true,
      }).start();
    },
    [],
  );

  const disableBackPress = useCallback((): void => {
    // Disable back press
    const hardwareBackPress = () => true;
    BackHandler.addEventListener('hardwareBackPress', hardwareBackPress);
  }, []);

  const showNotification = useCallback((): void => {
    animatedTimingStart(notificationAnimated, 0);
    notificationTimer.current = setTimeout(() => {
      animatedTimingStart(notificationAnimated, 200);
    }, 4000);
    disableBackPress();
  }, [animatedTimingStart, notificationAnimated, disableBackPress]);

  const updateNavBar = useCallback((): void => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  const checkIfExistingUser = useCallback(async (): Promise<void> => {
    // Read from Redux state instead of MMKV storage
    if (existingUserProp) {
      setState((prevState) => ({ ...prevState, existingUser: true }));
    }
  }, [existingUserProp]);

  const toggleWarningModal = useCallback((): void => {
    setState((prevState) => ({
      ...prevState,
      warningModalVisible: !prevState.warningModalVisible,
    }));
  }, []);

  const alertExistingUser = useCallback(
    (callback: () => void | Promise<void>): void => {
      warningCallback.current = () => {
        Promise.resolve(callback()).catch((error) => {
          console.error('alertExistingUser callback failed:', error);
        });
        toggleWarningModal();
        return true;
      };
      toggleWarningModal();
    },
    [toggleWarningModal],
  );

  /**
   * Check for migration failure scenario and vault backup availability
   * This detects when a migration has failed and left the user with a corrupted state
   * but a valid vault backup still exists in the secure keychain
   */
  const checkForMigrationFailureAndVaultBackup =
    useCallback(async (): Promise<void> => {
      // Prevent multiple checks - only run once per instance
      if (hasCheckedVaultBackup.current) {
        return;
      }

      hasCheckedVaultBackup.current = true;

      // Skip check in E2E test environment
      // E2E tests start with fresh state but may have vault backups from fixtures/previous runs
      // This would trigger false positive vault recovery redirects and break onboarding tests
      if (isE2E) {
        return;
      }

      // Skip check if this is an intentional wallet reset
      // (route.params.delete is set when user explicitly resets their wallet)
      if (route?.params?.delete) {
        return;
      }

      try {
        // Check for migration error flag
        // Using FilesystemStorage (excluded from iCloud backup) for reliability
        const migrationErrorFlag = await FilesystemStorage.getItem(
          MIGRATION_ERROR_HAPPENED,
        );

        if (migrationErrorFlag === 'true') {
          // Migration failed, check if vault backup exists
          const vaultBackupResult = await getVaultFromBackup();

          if (vaultBackupResult.success && vaultBackupResult.vault) {
            // Both migration error and vault backup exist - trigger recovery
            navigation.reset({
              routes: [{ name: Routes.VAULT_RECOVERY.RESTORE_WALLET }],
            });
          }
        }
      } catch (error) {
        Logger.error(
          error as Error,
          'Failed to check for migration failure and vault backup',
        );
      }
    }, [navigation, route]);

  const onLogin = useCallback(async (): Promise<void> => {
    if (!passwordSet) {
      await Authentication.resetVault();
      navigation.dispatch(StackActions.replace(Routes.ONBOARDING.HOME_NAV));
    } else {
      await Authentication.lockApp({ navigateToLogin: true });
    }
  }, [navigation, passwordSet]);

  const handleExistingUser = useCallback(
    async (action: () => void | Promise<void>): Promise<void> => {
      if (state.existingUser) {
        alertExistingUser(action);
      } else {
        await action();
      }
    },
    [state.existingUser, alertExistingUser],
  );

  const track = useCallback(
    (event: IMetaMetricsEvent, properties: JsonMap = {}): void => {
      trackOnboarding(
        MetricsEventBuilder.createEventBuilder(event)
          .addProperties(properties)
          .build(),
        saveOnboardingEvent,
      );
    },
    [saveOnboardingEvent],
  );

  const onPressCreate = useCallback(async (): Promise<void> => {
    if (SEEDLESS_ONBOARDING_ENABLED) {
      OAuthLoginService.resetOauthState();
    }
    // Reset metrics opt-in UI flag so the user sees the consent screen again.
    // This ensures users starting a new wallet flow are prompted to make a fresh choice.
    await resetMetricsOptInUISeen();

    await metrics.enable(false);
    // need to call hasMetricConset to update the cached consent state
    await hasMetricsConsent();

    trace({ name: TraceName.OnboardingCreateWallet });
    const action = () => {
      trace({
        name: TraceName.OnboardingNewSrpCreateWallet,
        op: TraceOperation.OnboardingUserJourney,
        tags: getTraceTags(store.getState()),
        parentContext: onboardingTraceCtx.current,
      });
      navigation.navigate('ChoosePassword', {
        [PREVIOUS_SCREEN]: ONBOARDING,
        onboardingTraceCtx: onboardingTraceCtx.current,
      });
      dispatch(
        setAccountType({
          accountType: AccountType.Metamask,
          onboardingVersion,
        }),
      );
      track(MetaMetricsEvents.WALLET_SETUP_STARTED, {
        account_type: AccountType.Metamask,
      });
    };

    handleExistingUser(action);
    endTrace({ name: TraceName.OnboardingCreateWallet });
  }, [
    metrics,
    navigation,
    track,
    handleExistingUser,
    dispatch,
    onboardingVersion,
  ]);

  const onPressImport = useCallback(async (): Promise<void> => {
    if (SEEDLESS_ONBOARDING_ENABLED) {
      OAuthLoginService.resetOauthState();
    }
    // Reset metrics opt-in UI flag so the user sees the consent screen again.
    // This ensures users starting a new wallet flow are prompted to make a fresh choice.
    await resetMetricsOptInUISeen();

    await metrics.enable(false);
    await hasMetricsConsent();

    const action = async () => {
      trace({
        name: TraceName.OnboardingExistingSrpImport,
        op: TraceOperation.OnboardingUserJourney,
        tags: getTraceTags(store.getState()),
        parentContext: onboardingTraceCtx.current,
      });
      navigation.navigate(
        Routes.ONBOARDING.IMPORT_FROM_SECRET_RECOVERY_PHRASE,
        {
          [PREVIOUS_SCREEN]: ONBOARDING,
          onboardingTraceCtx: onboardingTraceCtx.current,
        },
      );
      dispatch(
        setAccountType({
          accountType: AccountType.Imported,
          onboardingVersion,
        }),
      );
      track(MetaMetricsEvents.WALLET_IMPORT_STARTED, {
        account_type: AccountType.Imported,
      });
    };
    handleExistingUser(action);
  }, [
    metrics,
    navigation,
    track,
    handleExistingUser,
    dispatch,
    onboardingVersion,
  ]);

  const handlePostSocialLogin = useCallback(
    (
      result: OAuthLoginResult,
      createWallet: boolean,
      provider: string,
    ): void => {
      const isIOS = Platform.OS === 'ios';
      if (socialLoginTraceCtx.current) {
        endTrace({ name: TraceName.OnboardingSocialLoginAttempt });
        socialLoginTraceCtx.current = undefined;
      }

      // Error case (result.type !== 'success') is not handled here because
      // OAuthService.handleOAuthLogin() throws on failure, and the error is
      // caught by the try/catch in onPressContinueWithSocialLogin, which calls
      // handleLoginError → handleOAuthLoginError → captureException (Sentry).
      if (result.type !== 'success') {
        return;
      }

      const accountType = getSocialAccountType(provider, result.existingUser);
      dispatch(setAccountType({ accountType, onboardingVersion }));

      track(MetaMetricsEvents.SOCIAL_LOGIN_COMPLETED, {
        account_type: accountType,
      });
      if (createWallet) {
        if (result.existingUser) {
          navigation.navigate('AccountAlreadyExists', {
            accountName: result.accountName,
            oauthLoginSuccess: true,
            onboardingTraceCtx: onboardingTraceCtx.current,
            provider,
          });
        } else {
          trace({
            name: TraceName.OnboardingNewSocialCreateWallet,
            op: TraceOperation.OnboardingUserJourney,
            tags: getTraceTags(store.getState()),
            parentContext: onboardingTraceCtx.current,
          });

          if (isIOS) {
            // Navigate to SocialLoginSuccess screen first, then  ChoosePassword
            navigation.navigate(
              Routes.ONBOARDING.SOCIAL_LOGIN_SUCCESS_NEW_USER,
              {
                accountName: result.accountName,
                oauthLoginSuccess: true,
                onboardingTraceCtx: onboardingTraceCtx.current,
                provider,
              },
            );
          } else {
            // Direct navigation to ChoosePassword for Android
            navigation.navigate('ChoosePassword', {
              [PREVIOUS_SCREEN]: ONBOARDING,
              oauthLoginSuccess: true,
              onboardingTraceCtx: onboardingTraceCtx.current,
              provider,
            });
          }
        }
      } else if (result.existingUser) {
        trace({
          name: TraceName.OnboardingExistingSocialLogin,
          op: TraceOperation.OnboardingUserJourney,
          tags: getTraceTags(store.getState()),
          parentContext: onboardingTraceCtx.current,
        });
        isIOS
          ? navigation.navigate(
              Routes.ONBOARDING.SOCIAL_LOGIN_SUCCESS_EXISTING_USER,
              {
                [PREVIOUS_SCREEN]: ONBOARDING,
                oauthLoginSuccess: true,
                onboardingTraceCtx: onboardingTraceCtx.current,
              },
            )
          : navigation.navigate('Rehydrate', {
              [PREVIOUS_SCREEN]: ONBOARDING,
              oauthLoginSuccess: true,
              onboardingTraceCtx: onboardingTraceCtx.current,
            });
      } else {
        navigation.navigate('AccountNotFound', {
          accountName: result.accountName,
          oauthLoginSuccess: true,
          onboardingTraceCtx: onboardingTraceCtx.current,
          provider,
        });
      }
    },
    [navigation, track, dispatch, onboardingVersion],
  );

  const handleOAuthLoginError = useCallback(
    (error: OAuthError, provider: string, isFallback: boolean): void => {
      const platform = Platform.OS;
      const errorCode = String(error.code);

      if (metrics.isEnabled()) {
        captureException(error, {
          tags: {
            view: 'Onboarding',
            context: 'OAuth login failed - user consented to analytics',
            oauth_platform: platform,
            oauth_provider: provider,
            oauth_error_code: errorCode,
            oauth_is_fallback: String(isFallback),
          },
          fingerprint: ['oauth-login-error', platform, provider, errorCode],
        });
      } else {
        setState((prevState) => ({
          ...prevState,
          loading: false,
          errorToThrow: new Error(`OAuth login failed: ${error.message}`),
        }));
      }
    },
    [metrics],
  );

  const handleLoginError = useCallback(
    async (
      error: Error,
      socialConnectionType: string,
      createWallet: boolean,
    ): Promise<void> => {
      if (error instanceof OAuthError) {
        // For OAuth API failures (excluding user cancellation/dismissal), handle based on analytics consent
        if (
          error.code === OAuthErrorType.UserCancelled ||
          error.code === OAuthErrorType.UserDismissed ||
          error.code === OAuthErrorType.GoogleLoginError ||
          error.code === OAuthErrorType.AppleLoginError
        ) {
          // QA: do not show error sheet if user cancelled
          return;
        } else if (
          error.code === OAuthErrorType.GoogleLoginNoCredential ||
          error.code === OAuthErrorType.GoogleLoginNoMatchingCredential ||
          // GoogleLoginUserDisabledOneTapFeature: User has disabled One Tap in their Google
          // account settings. While this is a user preference, we still offer browser-based
          // login as an alternative since the user's intent is to sign in - they just prefer
          // not to use the One Tap UI. Browser OAuth provides a familiar login experience.
          error.code === OAuthErrorType.GoogleLoginUserDisabledOneTapFeature ||
          error.code === OAuthErrorType.GoogleLoginOneTapFailure ||
          // GoogleLoginNoProviderDependencies: The Android Credential Manager cannot find
          // required provider dependencies. Fallback to browser-based OAuth.
          error.code === OAuthErrorType.GoogleLoginNoProviderDependencies ||
          (error.code === OAuthErrorType.UnknownError &&
            Platform.OS === 'android' &&
            socialConnectionType === 'google')
        ) {
          // For Android Google, try browser fallback instead of showing error.
          // Note: We intentionally call handleOAuthLoginError (not handleLoginError) in the
          // fallback catch block to prevent nested fallback attempts. The browser-based
          // fallback handler won't throw ACM-specific errors, but this pattern ensures
          // we don't accidentally create infinite fallback loops if the code is refactored.
          if (Platform.OS === 'android' && socialConnectionType === 'google') {
            try {
              setLoading();
              const fallbackHandler = createLoginHandler(
                Platform.OS,
                AuthConnection.Google,
                true, // Use browser fallback
              );
              const result = await OAuthLoginService.handleOAuthLogin(
                fallbackHandler,
                !createWallet,
              );
              handlePostSocialLogin(
                result as OAuthLoginResult,
                createWallet,
                socialConnectionType,
              );

              // delay unset loading to avoid flash of loading state
              setTimeout(() => {
                unsetLoading();
              }, 1000);
              return;
            } catch (fallbackError) {
              unsetLoading();
              if (
                fallbackError instanceof OAuthError &&
                (fallbackError.code === OAuthErrorType.UserCancelled ||
                  fallbackError.code === OAuthErrorType.UserDismissed)
              ) {
                return;
              }
              // Handle both OAuthError and unexpected errors from browser fallback
              if (fallbackError instanceof OAuthError) {
                handleOAuthLoginError(
                  fallbackError,
                  socialConnectionType,
                  true,
                );
              } else {
                // Wrap unexpected errors as OAuthError to ensure they're properly handled
                const wrappedError = new OAuthError(
                  fallbackError instanceof Error
                    ? fallbackError.message
                    : 'Browser fallback failed with unknown error',
                  OAuthErrorType.UnknownError,
                );
                handleOAuthLoginError(wrappedError, socialConnectionType, true);
              }
              return;
            }
          }
          return;
        }
        // unexpected oauth login error
        handleOAuthLoginError(error, socialConnectionType, false);
        return;
      }

      const errorMessage = 'oauth_error';

      trace({
        name: TraceName.OnboardingSocialLoginError,
        op: TraceOperation.OnboardingError,
        tags: { provider: socialConnectionType, errorMessage },
        parentContext: onboardingTraceCtx.current,
      });
      endTrace({ name: TraceName.OnboardingSocialLoginError });

      if (socialLoginTraceCtx.current) {
        endTrace({
          name: TraceName.OnboardingSocialLoginAttempt,
          data: { success: false },
        });
        socialLoginTraceCtx.current = undefined;
      }

      navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
        screen: Routes.SHEET.SUCCESS_ERROR_SHEET,
        params: {
          title: strings(`error_sheet.${errorMessage}_title`),
          description: strings(`error_sheet.${errorMessage}_description`),
          descriptionAlign: 'center',
          buttonLabel: strings(`error_sheet.${errorMessage}_button`),
          type: 'error',
        },
      });
    },
    [
      navigation,
      handleOAuthLoginError,
      setLoading,
      unsetLoading,
      handlePostSocialLogin,
    ],
  );

  const onPressContinueWithSocialLogin = useCallback(
    async (createWallet: boolean, provider: AuthConnection): Promise<void> => {
      // check for internet connection
      try {
        const netState = await netInfoFetch();
        if (!netState.isConnected || netState.isInternetReachable === false) {
          navigation.dispatch(
            StackActions.replace(Routes.MODAL.ROOT_MODAL_FLOW, {
              screen: Routes.SHEET.SUCCESS_ERROR_SHEET,
              params: {
                title: strings(`error_sheet.no_internet_connection_title`),
                description: strings(
                  `error_sheet.no_internet_connection_description`,
                ),
                descriptionAlign: 'left',
                buttonLabel: strings(
                  `error_sheet.no_internet_connection_button`,
                ),
                primaryButtonLabel: strings(
                  `error_sheet.no_internet_connection_button`,
                ),
                closeOnPrimaryButtonPress: true,
                type: 'error',
              },
            }),
          );
          return;
        }
      } catch (error) {
        console.warn('Network check failed:', error);
      }

      // Continue with the social login flow
      navigation.navigate('Onboarding');

      // Enable metrics for OAuth users
      await metrics.enable(true);
      discardBufferedTraces();
      await setupSentry();

      const accountType = getSocialAccountType(provider, !createWallet);
      metrics.trackEvent(
        metrics
          .createEventBuilder(MetaMetricsEvents.METRICS_OPT_IN)
          .addProperties({
            updated_after_onboarding: false,
            location: 'onboarding_social_login',
            account_type: accountType,
          })
          .build(),
      );

      // use new trace instead of buffered trace for social login
      onboardingTraceCtx.current = trace({
        name: TraceName.OnboardingJourneyOverall,
        op: TraceOperation.OnboardingUserJourney,
        tags: getTraceTags(store.getState()),
      });

      if (createWallet) {
        track(MetaMetricsEvents.WALLET_SETUP_STARTED, {
          account_type: accountType,
        });
      } else {
        track(MetaMetricsEvents.WALLET_IMPORT_STARTED, {
          account_type: accountType,
        });
      }

      socialLoginTraceCtx.current = trace({
        name: TraceName.OnboardingSocialLoginAttempt,
        op: TraceOperation.OnboardingUserJourney,
        tags: { ...getTraceTags(store.getState()), provider },
        parentContext: onboardingTraceCtx.current,
      });

      const action = async () => {
        // prompt for ios google login not supported below iOS 17.4
        if (
          provider === AuthConnection.Google &&
          Device.isIos() &&
          Device.comparePlatformVersionTo('17.4') < 0
        ) {
          const description = () => (
            <>
              <Text style={tw.style('text-pretty')}>
                {strings(`error_sheet.ios_need_update_description`)}
                <Text twClassName="font-bold">
                  {strings(`error_sheet.ios_need_update_description_version`)}
                </Text>
                {strings(`error_sheet.ios_need_update_description_end`)}
              </Text>
              <Text style={tw.style('text-pretty')}>
                {strings(`error_sheet.ios_need_update_description2`)}
              </Text>
            </>
          );

          await navigateToSuccessErrorSheetPromise(navigation, {
            type: 'error',
            icon: IconName.Warning,
            iconColor: IconColor.Warning,
            title: strings(`error_sheet.ios_need_update_title`),
            description: description(),
            primaryButtonLabel: strings(`error_sheet.ios_need_update_button`),
            closeOnPrimaryButtonPress: true,
            isInteractable: false,
          });
          track(MetaMetricsEvents.WALLET_GOOGLE_IOS_WARNING_VIEWED, {
            account_type: accountType,
          });
        }
        setLoading();
        const loginHandler = createLoginHandler(Platform.OS, provider);
        try {
          const result = await OAuthLoginService.handleOAuthLogin(
            loginHandler,
            !createWallet,
          );
          handlePostSocialLogin(
            result as OAuthLoginResult,
            createWallet,
            provider,
          );

          // Mark metrics opt-in UI as seen since OAuth users auto-consent to metrics.
          // Set AFTER OAuth succeeds to avoid marking as seen if the flow fails.
          await markMetricsOptInUISeen();

          // delay unset loading to avoid flash of loading state
          setTimeout(() => {
            unsetLoading();
          }, 1000);
        } catch (error) {
          unsetLoading();
          await handleLoginError(error as Error, provider, createWallet);
        }
      };
      handleExistingUser(action);
    },
    [
      tw,
      navigation,
      metrics,
      track,
      setLoading,
      unsetLoading,
      handleLoginError,
      handlePostSocialLogin,
      handleExistingUser,
    ],
  );

  const onPressContinueWithApple = useCallback(
    async (createWallet: boolean): Promise<void> =>
      onPressContinueWithSocialLogin(createWallet, AuthConnection.Apple),
    [onPressContinueWithSocialLogin],
  );

  const onPressContinueWithGoogle = useCallback(
    async (createWallet: boolean): Promise<void> =>
      onPressContinueWithSocialLogin(createWallet, AuthConnection.Google),
    [onPressContinueWithSocialLogin],
  );

  const handleCtaActions = useCallback(
    async (actionType: string): Promise<void> => {
      if (SEEDLESS_ONBOARDING_ENABLED) {
        dispatch(clearSeedlessOnboarding());
        navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
          screen: Routes.SHEET.ONBOARDING_SHEET,
          params: {
            onPressCreate,
            onPressImport,
            onPressContinueWithGoogle,
            onPressContinueWithApple,
            createWallet: actionType === 'create',
          },
        });
      } else if (actionType === 'create') {
        await onPressCreate();
      } else {
        await onPressImport();
      }
    },
    [
      navigation,
      onPressCreate,
      onPressImport,
      onPressContinueWithGoogle,
      onPressContinueWithApple,
      dispatch,
    ],
  );

  const setStartFoxAnimation = useCallback((): void => {
    setState((prevState) => ({ ...prevState, startFoxAnimation: 'Start' }));
  }, []);

  const renderLoader = useCallback(
    (): React.ReactElement => (
      <Box
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Center}
        twClassName="flex-1 gap-y-8 mb-40"
      >
        <Box justifyContent={BoxJustifyContent.Center}>
          <ActivityIndicator size="small" />
          <Text
            variant={TextVariant.BodyMd}
            style={tw.style('mt-[30px] text-center text-default')}
          >
            {loadingMsg}
          </Text>
        </Box>
      </Box>
    ),
    [loadingMsg, tw],
  );

  const renderContent = useCallback(
    (): React.ReactElement => (
      <Box
        justifyContent={BoxJustifyContent.Between}
        alignItems={BoxAlignItems.Center}
        twClassName={`flex-1 w-full px-5 ${Device.isMediumDevice() ? 'gap-y-4' : 'gap-y-6'}`}
      >
        <OnboardingAnimation
          startOnboardingAnimation={state.startOnboardingAnimation}
          setStartFoxAnimation={setStartFoxAnimation}
        >
          {/*
           * These onboarding buttons are intentionally pinned to specific themes regardless of the user's
           * system theme setting: the "Create" button is always dark (black bg, white text) and the
           * "Import" button is always light (white bg, black text). This design choice ensures both
           * buttons remain visually distinct and accessible against the purple onboarding background
           * in all theme contexts.
           */}
          <ThemeProvider
            theme={Theme.Dark} // Keep this button in dark mode regardless of theme
          >
            <Button
              variant={ButtonVariant.Primary}
              onPress={() => handleCtaActions('create')}
              testID={OnboardingSelectorIDs.NEW_WALLET_BUTTON}
              isFullWidth
              size={Device.isMediumDevice() ? ButtonSize.Md : ButtonSize.Lg}
            >
              {strings('onboarding.start_exploring_now')}
            </Button>
          </ThemeProvider>
          <ThemeProvider
            theme={Theme.Light} // Keep this button in light mode regardless of theme
          >
            <Button
              variant={ButtonVariant.Primary}
              onPress={() => handleCtaActions('existing')}
              testID={OnboardingSelectorIDs.EXISTING_WALLET_BUTTON}
              isFullWidth
              size={Device.isMediumDevice() ? ButtonSize.Md : ButtonSize.Lg}
            >
              {SEEDLESS_ONBOARDING_ENABLED
                ? strings('onboarding.import_using_srp_social_login')
                : strings('onboarding.import_using_srp')}
            </Button>
          </ThemeProvider>
        </OnboardingAnimation>
      </Box>
    ),
    [state.startOnboardingAnimation, setStartFoxAnimation, handleCtaActions],
  );

  const handleSimpleNotification =
    useCallback((): React.ReactElement | null => {
      if (!route?.params?.delete && !route?.params?.showErrorReportSentToast)
        return null;

      const notificationData = route?.params?.showErrorReportSentToast
        ? {
            title: strings('wallet_creation_error.error_report_sent_title'),
            description: strings(
              'wallet_creation_error.error_report_sent_description',
            ),
          }
        : {
            title: strings('onboarding.success'),
            description: strings('onboarding.your_wallet'),
          };

      return (
        <Animated.View
          style={[
            tw.style('flex-row items-end', { flex: 0.1 }),
            { transform: [{ translateY: notificationAnimated }] },
          ]}
        >
          <ElevatedView
            style={tw.style(
              'absolute bottom-0 left-0 right-0 bg-transparent',
              Device.isIphoneX() ? 'pb-5' : 'pb-[10px]',
            )}
            elevation={100}
          >
            <BaseNotification status="success" data={notificationData} />
          </ElevatedView>
        </Animated.View>
      );
    }, [
      route?.params?.delete,
      route?.params?.showErrorReportSentToast,
      notificationAnimated,
      tw,
    ]);

  useEffect(() => {
    onboardingTraceCtx.current = trace({
      name: TraceName.OnboardingJourneyOverall,
      op: TraceOperation.OnboardingUserJourney,
      tags: getTraceTags(store.getState()),
    });

    unsetLoading();
    updateNavBar();
    mounted.current = true;
    checkIfExistingUser();
    disableNewPrivacyPolicyToast();

    InteractionManager.runAfterInteractions(() => {
      checkForMigrationFailureAndVaultBackup();
      PreventScreenshot.forbid();
      if (route?.params?.delete || route?.params?.showErrorReportSentToast) {
        showNotification();
      }
      setState((prevState) => ({
        ...prevState,
        startOnboardingAnimation: true,
      }));
    });

    return () => {
      mounted.current = false;
      if (notificationTimer.current) {
        clearTimeout(notificationTimer.current);
      }
      unsetLoading();
      InteractionManager.runAfterInteractions(PreventScreenshot.allow);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    updateNavBar();
  }, [updateNavBar]);

  useEffect(() => {
    // When a new user has onboarded and the PNA25 feature flag is on,
    // set the PNA25 acknowledgement as true to prevent the toast from showing
    if (isPna25FlagEnabled) {
      storePna25Acknowledged();
    }
  }, [isPna25FlagEnabled, storePna25Acknowledged]);

  const { existingUser, errorToThrow, startFoxAnimation } = state;
  const hasFooter = existingUser && !loading;

  const ThrowErrorIfNeeded = () => {
    if (errorToThrow) {
      throw errorToThrow;
    }
    return null;
  };

  return (
    <ErrorBoundary
      navigation={navigation}
      view="Onboarding"
      useOnboardingErrorHandling={!!errorToThrow && !metrics.isEnabled()}
    >
      <ThrowErrorIfNeeded />
      <SafeAreaView
        style={tw.style('flex-1', {
          backgroundColor:
            themeContext.themeAppearance === 'dark'
              ? importedColors.gettingStartedTextColor
              : importedColors.gettingStartedPageBackgroundColorLightMode,
        })}
        testID={OnboardingSelectorIDs.CONTAINER_ID}
      >
        <ScrollView
          style={tw.style('flex-1')}
          contentContainerStyle={tw.style('flex-1')}
        >
          <Box
            alignItems={BoxAlignItems.Center}
            justifyContent={BoxJustifyContent.Center}
            twClassName="flex-1 py-4"
          >
            {renderContent()}

            {loading && (
              <Box
                alignItems={BoxAlignItems.Center}
                justifyContent={BoxJustifyContent.Center}
                twClassName="absolute top-0 left-0 right-0 bottom-0"
                style={tw.style(
                  { zIndex: 1000 },
                  {
                    backgroundColor:
                      themeContext.themeAppearance === 'dark'
                        ? importedColors.gettingStartedTextColor
                        : importedColors.gettingStartedPageBackgroundColorLightMode,
                  },
                )}
              >
                {renderLoader()}
              </Box>
            )}
          </Box>
        </ScrollView>

        <FadeOutOverlay />

        {!isE2E && (
          <FoxAnimation hasFooter={hasFooter} trigger={startFoxAnimation} />
        )}

        <Box>{handleSimpleNotification()}</Box>

        <FastOnboarding
          onPressContinueWithGoogle={onPressContinueWithGoogle}
          onPressContinueWithApple={onPressContinueWithApple}
          onPressImport={onPressImport}
          onPressCreate={onPressCreate}
        />
      </SafeAreaView>
    </ErrorBoundary>
  );
};

export default Onboarding;

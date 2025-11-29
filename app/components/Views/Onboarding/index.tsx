import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useContext,
} from 'react';
import {
  ActivityIndicator,
  BackHandler,
  View,
  ScrollView,
  InteractionManager,
  Animated,
  Easing,
  Platform,
} from 'react-native';
import { captureException } from '@sentry/react-native';
import Text, {
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import { baseStyles, colors as importedColors } from '../../../styles/common';
import { strings } from '../../../../locales/i18n';
import { useSelector, useDispatch } from 'react-redux';
import FadeOutOverlay from '../../UI/FadeOutOverlay';
import Device from '../../../util/device';
import BaseNotification from '../../UI/Notification/BaseNotification';
import ElevatedView from 'react-native-elevated-view';
import { loadingSet, loadingUnset } from '../../../actions/user';
import { saveOnboardingEvent as saveEvent } from '../../../actions/onboarding';
import { storePrivacyPolicyClickedOrClosed as storePrivacyPolicyClickedOrClosedAction } from '../../../reducers/legalNotices';
import PreventScreenshot from '../../../core/PreventScreenshot';
import { PREVIOUS_SCREEN, ONBOARDING } from '../../../constants/navigation';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { Authentication } from '../../../core';
import { getVaultFromBackup } from '../../../core/BackupVault';
import Logger from '../../../util/Logger';
import FilesystemStorage from 'redux-persist-filesystem-storage';
import { MIGRATION_ERROR_HAPPENED } from '../../../constants/storage';
import { ThemeContext, mockTheme } from '../../../util/theme';
import { isE2E } from '../../../util/test/utils';
import { OnboardingSelectorIDs } from '../../../../e2e/selectors/Onboarding/Onboarding.selectors';
import Routes from '../../../constants/navigation/Routes';
import { selectExistingUser } from '../../../reducers/user/selectors';
import trackOnboarding from '../../../util/metrics/TrackOnboarding/trackOnboarding';
import { fetch as netInfoFetch } from '@react-native-community/netinfo';
import {
  useNavigation,
  useRoute,
  RouteProp,
  ParamListBase,
} from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
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
import Button, {
  ButtonVariants,
  ButtonWidthTypes,
  ButtonSize,
} from '../../../component-library/components/Buttons/Button';
import OAuthLoginService from '../../../core/OAuthService/OAuthService';
import { OAuthError, OAuthErrorType } from '../../../core/OAuthService/error';
import { createLoginHandler } from '../../../core/OAuthService/OAuthLoginHandlers';
import { AuthConnection } from '../../../core/OAuthService/OAuthInterface';
import { SEEDLESS_ONBOARDING_ENABLED } from '../../../core/OAuthService/OAuthLoginHandlers/constants';
import { useMetrics } from '../../hooks/useMetrics';
import { setupSentry } from '../../../util/sentry/utils';
import ErrorBoundary from '../ErrorBoundary';
import FastOnboarding from './FastOnboarding';
import { SafeAreaView } from 'react-native-safe-area-context';
import FoxAnimation from '../../UI/FoxAnimation/FoxAnimation';
import OnboardingAnimation from '../../UI/OnboardingAnimation/OnboardingAnimation';
import { createStyles } from './styles';

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
}

const Onboarding = () => {
  const navigation = useNavigation<StackNavigationProp<ParamListBase>>();
  const route =
    useRoute<RouteProp<{ params: OnboardingRouteParams }, 'params'>>();
  const dispatch = useDispatch();
  const metrics = useMetrics();

  const passwordSet = useSelector((state: RootState) => state.user.passwordSet);
  const existingUserProp = useSelector(selectExistingUser);
  const loading = useSelector((state: RootState) => state.user.loadingSet);
  const loadingMsg = useSelector(
    (state: RootState) => state.user.loadingMsg || '',
  );

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

  const themeContext = useContext(ThemeContext);
  const colors = themeContext.colors || mockTheme.colors;
  const styles = createStyles(colors);

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
    // show notification
    animatedTimingStart(notificationAnimated, 0);
    // hide notification
    setTimeout(() => {
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
      navigation.replace(Routes.ONBOARDING.HOME_NAV);
    } else {
      await Authentication.lockApp();
      navigation.replace(Routes.ONBOARDING.LOGIN);
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
      track(MetaMetricsEvents.WALLET_SETUP_STARTED, {
        account_type: 'metamask',
      });
    };

    handleExistingUser(action);
    endTrace({ name: TraceName.OnboardingCreateWallet });
  }, [metrics, navigation, track, handleExistingUser]);

  const onPressImport = useCallback(async (): Promise<void> => {
    if (SEEDLESS_ONBOARDING_ENABLED) {
      OAuthLoginService.resetOauthState();
    }
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
      track(MetaMetricsEvents.WALLET_IMPORT_STARTED, {
        account_type: 'imported',
      });
    };
    handleExistingUser(action);
  }, [metrics, navigation, track, handleExistingUser]);

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

      if (result.type === 'success') {
        // Track social login completed
        track(MetaMetricsEvents.SOCIAL_LOGIN_COMPLETED, {
          account_type: provider,
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
        } else if (!createWallet) {
          if (result.existingUser) {
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
        }
      } else {
        // handle error: show error message in the UI
      }
    },
    [navigation, track],
  );

  const handleOAuthLoginError = useCallback(
    (error: Error): void => {
      // If user has already consented to analytics, report error using regular Sentry
      if (metrics.isEnabled()) {
        captureException(error, {
          tags: {
            view: 'Onboarding',
            context: 'OAuth login failed - user consented to analytics',
          },
        });
      } else {
        // User hasn't consented to analytics yet, use ErrorBoundary onboarding flow
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
    (error: Error, socialConnectionType: string): void => {
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
          error.code === OAuthErrorType.GoogleLoginNoMatchingCredential
        ) {
          // de-escalate google no credential error
          const errorMessage = 'google_login_no_credential';
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
          return;
        }
        // unexpected oauth login error
        handleOAuthLoginError(error);
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
    [navigation, handleOAuthLoginError],
  );

  const onPressContinueWithSocialLogin = useCallback(
    async (createWallet: boolean, provider: AuthConnection): Promise<void> => {
      // check for internet connection
      try {
        const netState = await netInfoFetch();
        if (!netState.isConnected || netState.isInternetReachable === false) {
          navigation.replace(Routes.MODAL.ROOT_MODAL_FLOW, {
            screen: Routes.SHEET.SUCCESS_ERROR_SHEET,
            params: {
              title: strings(`error_sheet.no_internet_connection_title`),
              description: strings(
                `error_sheet.no_internet_connection_description`,
              ),
              descriptionAlign: 'left',
              buttonLabel: strings(`error_sheet.no_internet_connection_button`),
              primaryButtonLabel: strings(
                `error_sheet.no_internet_connection_button`,
              ),
              closeOnPrimaryButtonPress: true,
              type: 'error',
            },
          });
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

      // use new trace instead of buffered trace for social login
      onboardingTraceCtx.current = trace({
        name: TraceName.OnboardingJourneyOverall,
        op: TraceOperation.OnboardingUserJourney,
        tags: getTraceTags(store.getState()),
      });

      if (createWallet) {
        track(MetaMetricsEvents.WALLET_SETUP_STARTED, {
          account_type: `metamask_${provider}`,
        });
      } else {
        track(MetaMetricsEvents.WALLET_IMPORT_STARTED, {
          account_type: `imported_${provider}`,
        });
      }

      socialLoginTraceCtx.current = trace({
        name: TraceName.OnboardingSocialLoginAttempt,
        op: TraceOperation.OnboardingUserJourney,
        tags: { ...getTraceTags(store.getState()), provider },
        parentContext: onboardingTraceCtx.current,
      });

      const action = async () => {
        setLoading();
        const loginHandler = createLoginHandler(Platform.OS, provider);
        const result = await OAuthLoginService.handleOAuthLogin(
          loginHandler,
          !createWallet,
        ).catch((error: Error) => {
          unsetLoading();
          handleLoginError(error, provider);
          return { type: 'error' as const, error, existingUser: false };
        });
        handlePostSocialLogin(
          result as OAuthLoginResult,
          createWallet,
          provider,
        );

        // delay unset loading to avoid flash of loading state
        setTimeout(() => {
          unsetLoading();
        }, 1000);
      };
      handleExistingUser(action);
    },
    [
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
        // else
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
    ],
  );

  const setStartFoxAnimation = useCallback((): void => {
    setState((prevState) => ({ ...prevState, startFoxAnimation: 'Start' }));
  }, []);

  const renderLoader = useCallback(
    (): React.ReactElement => (
      <View style={styles.loaderWrapper}>
        <View style={styles.loader}>
          <ActivityIndicator size="small" />
          <Text style={styles.loadingText}>{loadingMsg}</Text>
        </View>
      </View>
    ),
    [styles, loadingMsg],
  );

  const renderContent = useCallback(
    (): React.ReactElement => (
      <View style={styles.ctas}>
        <OnboardingAnimation
          startOnboardingAnimation={state.startOnboardingAnimation}
          setStartFoxAnimation={setStartFoxAnimation}
        >
          <Button
            variant={ButtonVariants.Primary}
            onPress={() => handleCtaActions('create')}
            testID={OnboardingSelectorIDs.NEW_WALLET_BUTTON}
            label={
              <Text
                variant={TextVariant.BodyMDMedium}
                color={importedColors.applePayBlack}
              >
                {strings('onboarding.start_exploring_now')}
              </Text>
            }
            width={ButtonWidthTypes.Full}
            size={Device.isMediumDevice() ? ButtonSize.Md : ButtonSize.Lg}
            style={styles.blackButton}
          />
          <Button
            variant={ButtonVariants.Secondary}
            onPress={() => handleCtaActions('existing')}
            testID={OnboardingSelectorIDs.EXISTING_WALLET_BUTTON}
            width={ButtonWidthTypes.Full}
            size={Device.isMediumDevice() ? ButtonSize.Md : ButtonSize.Lg}
            label={
              <Text
                variant={TextVariant.BodyMDMedium}
                color={importedColors.white}
              >
                {SEEDLESS_ONBOARDING_ENABLED
                  ? strings('onboarding.import_using_srp_social_login')
                  : strings('onboarding.import_using_srp')}
              </Text>
            }
            style={styles.inverseBlackButton}
          />
        </OnboardingAnimation>
      </View>
    ),
    [
      styles,
      state.startOnboardingAnimation,
      setStartFoxAnimation,
      handleCtaActions,
    ],
  );

  const handleSimpleNotification =
    useCallback((): React.ReactElement | null => {
      if (!route?.params?.delete) return null;
      return (
        <Animated.View
          style={[
            styles.notificationContainer,
            { transform: [{ translateY: notificationAnimated }] },
          ]}
        >
          <ElevatedView style={styles.modalTypeView} elevation={100}>
            <BaseNotification
              status="success"
              data={{
                title: strings('onboarding.success'),
                description: strings('onboarding.your_wallet'),
              }}
            />
          </ElevatedView>
        </Animated.View>
      );
    }, [route?.params?.delete, styles, notificationAnimated]);

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
      if (route?.params?.delete) {
        showNotification();
      }
      setState((prevState) => ({
        ...prevState,
        startOnboardingAnimation: true,
      }));
    });

    return () => {
      mounted.current = false;
      unsetLoading();
      InteractionManager.runAfterInteractions(PreventScreenshot.allow);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    updateNavBar();
  }, [updateNavBar]);

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
        style={[
          baseStyles.flexGrow,
          {
            backgroundColor:
              themeContext.themeAppearance === 'dark'
                ? importedColors.gettingStartedTextColor
                : importedColors.gettingStartedPageBackgroundColorLightMode,
          },
        ]}
        testID={OnboardingSelectorIDs.CONTAINER_ID}
      >
        <ScrollView
          style={baseStyles.flexGrow}
          contentContainerStyle={styles.scroll}
        >
          <View style={styles.wrapper}>
            {renderContent()}

            {loading && (
              <View
                style={[
                  styles.loaderOverlay,
                  {
                    backgroundColor:
                      themeContext.themeAppearance === 'dark'
                        ? importedColors.gettingStartedTextColor
                        : importedColors.gettingStartedPageBackgroundColorLightMode,
                  },
                ]}
              >
                {renderLoader()}
              </View>
            )}
          </View>

          {existingUser && !loading && (
            <View style={styles.footer}>
              <Button
                variant={ButtonVariants.Link}
                onPress={onLogin}
                label={strings('onboarding.unlock')}
                width={ButtonWidthTypes.Full}
                size={Device.isMediumDevice() ? ButtonSize.Md : ButtonSize.Lg}
              />
            </View>
          )}
        </ScrollView>

        <FadeOutOverlay />

        <FoxAnimation hasFooter={hasFooter} trigger={startFoxAnimation} />

        <View>{handleSimpleNotification()}</View>

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

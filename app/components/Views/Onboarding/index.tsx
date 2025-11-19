import React, { PureComponent } from 'react';
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
import { connect, ConnectedProps } from 'react-redux';
import { Dispatch } from 'redux';
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
import { selectAccounts } from '../../../selectors/accountTrackerController';
import { selectExistingUser } from '../../../reducers/user/selectors';
import trackOnboarding from '../../../util/metrics/TrackOnboarding/trackOnboarding';
import { fetch as netInfoFetch } from '@react-native-community/netinfo';
import {
  NavigationProp,
  ParamListBase,
  RouteProp,
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
import { withMetricsAwareness } from '../../hooks/useMetrics';
import type { IUseMetricsHook } from '../../hooks/useMetrics/useMetrics.types';
import type { IWithMetricsAwarenessProps } from '../../hooks/useMetrics/withMetricsAwareness.types';
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

const mapStateToProps = (state: RootState) => ({
  accounts: selectAccounts(state),
  passwordSet: state.user.passwordSet,
  existingUser: selectExistingUser(state),
  loading: state.user.loadingSet,
  loadingMsg: state.user.loadingMsg || '',
});

const mapDispatchToProps = (dispatch: Dispatch) => ({
  setLoading: (msg?: string) => dispatch(loadingSet(msg || '')),
  unsetLoading: () => dispatch(loadingUnset()),
  disableNewPrivacyPolicyToast: () =>
    dispatch(storePrivacyPolicyClickedOrClosedAction()),
  saveOnboardingEvent: (...eventArgs: [ITrackingEvent]) =>
    dispatch(saveEvent(eventArgs)),
});

const connector = connect(mapStateToProps, mapDispatchToProps);

type PropsFromRedux = ConnectedProps<typeof connector>;

interface OwnProps {
  /**
   * Navigation object required to push new views
   */
  navigation: NavigationProp<ParamListBase> & {
    replace: (name: string, params?: object) => void;
  };
  /**
   * Object that represents the current route info like params passed to it
   */
  route: RouteProp<{ params: OnboardingRouteParams }, 'params'>;
  /**
   * Metrics injected by withMetricsAwareness HOC
   */
  metrics: IUseMetricsHook;
}

type OnboardingProps = PropsFromRedux & OwnProps;

export type OnboardingComponentProps = Omit<OwnProps, 'metrics'>;

class Onboarding extends PureComponent<OnboardingProps, OnboardingState> {
  // Helper to get typed context
  private get themeContext() {
    return this.context as React.ContextType<typeof ThemeContext>;
  }

  notificationAnimated: Animated.Value = new Animated.Value(100);
  detailsYAnimated: Animated.Value = new Animated.Value(0);
  actionXAnimated: Animated.Value = new Animated.Value(0);
  detailsAnimated: Animated.Value = new Animated.Value(0);

  onboardingTraceCtx: TraceContext = undefined;
  socialLoginTraceCtx: TraceContext = undefined;

  seedwords: string | null = null;
  importedAccounts: unknown[] | null = null;
  channelName: string | null = null;
  incomingDataStr: string = '';
  dataToSync: unknown = null;
  mounted: boolean = false;
  hasCheckedVaultBackup: boolean = false;

  warningCallback: () => boolean = () => true;

  state: OnboardingState = {
    warningModalVisible: false,
    loading: false,
    existingUser: false,
    createWallet: false,
    existingWallet: false,
    errorSheetVisible: false,
    errorToThrow: null,
    startOnboardingAnimation: false,
    startFoxAnimation: undefined,
  };

  animatedTimingStart = (
    animatedRef: Animated.Value,
    toValue: number,
  ): void => {
    Animated.timing(animatedRef, {
      toValue,
      duration: 500,
      easing: Easing.linear,
      useNativeDriver: true,
    }).start();
  };

  showNotification = (): void => {
    // show notification
    this.animatedTimingStart(this.notificationAnimated, 0);
    // hide notification
    setTimeout(() => {
      this.animatedTimingStart(this.notificationAnimated, 200);
    }, 4000);
    this.disableBackPress();
  };

  disableBackPress = (): void => {
    // Disable back press
    const hardwareBackPress = () => true;
    BackHandler.addEventListener('hardwareBackPress', hardwareBackPress);
  };

  updateNavBar = (): void => {
    const { navigation } = this.props;
    navigation.setOptions({
      headerShown: false,
    });
  };

  componentDidMount(): void {
    this.onboardingTraceCtx = trace({
      name: TraceName.OnboardingJourneyOverall,
      op: TraceOperation.OnboardingUserJourney,
      tags: getTraceTags(store.getState()),
    });

    this.props.unsetLoading();
    this.updateNavBar();
    this.mounted = true;
    this.checkIfExistingUser();
    this.props.disableNewPrivacyPolicyToast();

    InteractionManager.runAfterInteractions(() => {
      this.checkForMigrationFailureAndVaultBackup();
      PreventScreenshot.forbid();
      if (this.props.route.params?.delete) {
        this.showNotification();
      }
      this.setState({ startOnboardingAnimation: true });
    });
  }

  componentWillUnmount(): void {
    this.mounted = false;
    this.props.unsetLoading();
    InteractionManager.runAfterInteractions(PreventScreenshot.allow);
  }

  componentDidUpdate = (): void => {
    this.updateNavBar();
  };

  async checkIfExistingUser(): Promise<void> {
    // Read from Redux state instead of MMKV storage
    const { existingUser } = this.props;
    if (existingUser) {
      this.setState({ existingUser: true });
    }
  }

  /**
   * Check for migration failure scenario and vault backup availability
   * This detects when a migration has failed and left the user with a corrupted state
   * but a valid vault backup still exists in the secure keychain
   */
  async checkForMigrationFailureAndVaultBackup(): Promise<void> {
    // Prevent multiple checks - only run once per instance
    if (this.hasCheckedVaultBackup) {
      return;
    }

    this.hasCheckedVaultBackup = true;

    // Skip check in E2E test environment
    // E2E tests start with fresh state but may have vault backups from fixtures/previous runs
    // This would trigger false positive vault recovery redirects and break onboarding tests
    if (isE2E) {
      return;
    }

    // Skip check if this is an intentional wallet reset
    // (route.params.delete is set when user explicitly resets their wallet)
    if (this.props.route?.params?.delete) {
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
          this.props.navigation.reset({
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
  }

  onLogin = async (): Promise<void> => {
    const { passwordSet } = this.props;
    if (!passwordSet) {
      await Authentication.resetVault();
      this.props.navigation.replace(Routes.ONBOARDING.HOME_NAV);
    } else {
      await Authentication.lockApp();
      this.props.navigation.replace(Routes.ONBOARDING.LOGIN);
    }
  };

  handleExistingUser = (action: () => void | Promise<void>): void => {
    if (this.state.existingUser) {
      this.alertExistingUser(action);
    } else {
      void action();
    }
  };

  onPressCreate = async (): Promise<void> => {
    if (SEEDLESS_ONBOARDING_ENABLED) {
      OAuthLoginService.resetOauthState();
    }
    await this.props.metrics.enableSocialLogin?.(false);
    // need to call hasMetricConset to update the cached consent state
    await hasMetricsConsent();

    trace({ name: TraceName.OnboardingCreateWallet });
    const action = () => {
      trace({
        name: TraceName.OnboardingNewSrpCreateWallet,
        op: TraceOperation.OnboardingUserJourney,
        tags: getTraceTags(store.getState()),
        parentContext: this.onboardingTraceCtx,
      });
      this.props.navigation.navigate('ChoosePassword', {
        [PREVIOUS_SCREEN]: ONBOARDING,
        onboardingTraceCtx: this.onboardingTraceCtx,
      });
      this.track(MetaMetricsEvents.WALLET_SETUP_STARTED, {
        account_type: 'metamask',
      });
    };

    this.handleExistingUser(action);
    endTrace({ name: TraceName.OnboardingCreateWallet });
  };

  onPressImport = async (): Promise<void> => {
    if (SEEDLESS_ONBOARDING_ENABLED) {
      OAuthLoginService.resetOauthState();
    }
    await this.props.metrics.enableSocialLogin?.(false);
    await hasMetricsConsent();

    const action = async () => {
      trace({
        name: TraceName.OnboardingExistingSrpImport,
        op: TraceOperation.OnboardingUserJourney,
        tags: getTraceTags(store.getState()),
        parentContext: this.onboardingTraceCtx,
      });
      this.props.navigation.navigate(
        Routes.ONBOARDING.IMPORT_FROM_SECRET_RECOVERY_PHRASE,
        {
          [PREVIOUS_SCREEN]: ONBOARDING,
          onboardingTraceCtx: this.onboardingTraceCtx,
        },
      );
      this.track(MetaMetricsEvents.WALLET_IMPORT_STARTED, {
        account_type: 'imported',
      });
    };
    this.handleExistingUser(action);
  };

  handlePostSocialLogin = (
    result: OAuthLoginResult,
    createWallet: boolean,
    provider: string,
  ): void => {
    const isIOS = Platform.OS === 'ios';
    if (this.socialLoginTraceCtx) {
      endTrace({ name: TraceName.OnboardingSocialLoginAttempt });
      this.socialLoginTraceCtx = undefined;
    }

    if (result.type === 'success') {
      // Track social login completed
      this.track(MetaMetricsEvents.SOCIAL_LOGIN_COMPLETED, {
        account_type: provider,
      });
      if (createWallet) {
        if (result.existingUser) {
          this.props.navigation.navigate('AccountAlreadyExists', {
            accountName: result.accountName,
            oauthLoginSuccess: true,
            onboardingTraceCtx: this.onboardingTraceCtx,
            provider,
          });
        } else {
          trace({
            name: TraceName.OnboardingNewSocialCreateWallet,
            op: TraceOperation.OnboardingUserJourney,
            tags: getTraceTags(store.getState()),
            parentContext: this.onboardingTraceCtx,
          });

          if (isIOS) {
            // Navigate to SocialLoginSuccess screen first, then  ChoosePassword
            this.props.navigation.navigate(
              Routes.ONBOARDING.SOCIAL_LOGIN_SUCCESS_NEW_USER,
              {
                accountName: result.accountName,
                oauthLoginSuccess: true,
                onboardingTraceCtx: this.onboardingTraceCtx,
                provider,
              },
            );
          } else {
            // Direct navigation to ChoosePassword for Android
            this.props.navigation.navigate('ChoosePassword', {
              [PREVIOUS_SCREEN]: ONBOARDING,
              oauthLoginSuccess: true,
              onboardingTraceCtx: this.onboardingTraceCtx,
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
            parentContext: this.onboardingTraceCtx,
          });
          isIOS
            ? this.props.navigation.navigate(
                Routes.ONBOARDING.SOCIAL_LOGIN_SUCCESS_EXISTING_USER,
                {
                  [PREVIOUS_SCREEN]: ONBOARDING,
                  oauthLoginSuccess: true,
                  onboardingTraceCtx: this.onboardingTraceCtx,
                },
              )
            : this.props.navigation.navigate('Rehydrate', {
                [PREVIOUS_SCREEN]: ONBOARDING,
                oauthLoginSuccess: true,
                onboardingTraceCtx: this.onboardingTraceCtx,
              });
        } else {
          this.props.navigation.navigate('AccountNotFound', {
            accountName: result.accountName,
            oauthLoginSuccess: true,
            onboardingTraceCtx: this.onboardingTraceCtx,
            provider,
          });
        }
      }
    } else {
      // handle error: show error message in the UI
    }
  };

  onPressContinueWithSocialLogin = async (
    createWallet: boolean,
    provider: AuthConnection,
  ): Promise<void> => {
    // check for internet connection
    try {
      const netState = await netInfoFetch();
      if (!netState.isConnected || netState.isInternetReachable === false) {
        this.props.navigation.replace(Routes.MODAL.ROOT_MODAL_FLOW, {
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
    this.props.navigation.navigate('Onboarding');

    // Enable metrics for OAuth users
    await this.props.metrics.enableSocialLogin?.(true);
    discardBufferedTraces();
    await setupSentry();

    // use new trace instead of buffered trace for social login
    this.onboardingTraceCtx = trace({
      name: TraceName.OnboardingJourneyOverall,
      op: TraceOperation.OnboardingUserJourney,
      tags: getTraceTags(store.getState()),
    });

    if (createWallet) {
      this.track(MetaMetricsEvents.WALLET_SETUP_STARTED, {
        account_type: `metamask_${provider}`,
      });
    } else {
      this.track(MetaMetricsEvents.WALLET_IMPORT_STARTED, {
        account_type: `imported_${provider}`,
      });
    }

    this.socialLoginTraceCtx = trace({
      name: TraceName.OnboardingSocialLoginAttempt,
      op: TraceOperation.OnboardingUserJourney,
      tags: { ...getTraceTags(store.getState()), provider },
      parentContext: this.onboardingTraceCtx,
    });

    const action = async () => {
      this.props.setLoading();
      const loginHandler = createLoginHandler(Platform.OS, provider);
      const result = await OAuthLoginService.handleOAuthLogin(
        loginHandler,
        !createWallet,
      ).catch((error: Error) => {
        this.props.unsetLoading();
        this.handleLoginError(error, provider);
        return { type: 'error' as const, error, existingUser: false };
      });
      this.handlePostSocialLogin(
        result as OAuthLoginResult,
        createWallet,
        provider,
      );

      // delay unset loading to avoid flash of loading state
      setTimeout(() => {
        this.props.unsetLoading();
      }, 1000);
    };
    this.handleExistingUser(action);
  };

  onPressContinueWithApple = async (createWallet: boolean): Promise<void> =>
    this.onPressContinueWithSocialLogin(createWallet, AuthConnection.Apple);

  onPressContinueWithGoogle = async (createWallet: boolean): Promise<void> =>
    this.onPressContinueWithSocialLogin(createWallet, AuthConnection.Google);

  handleLoginError = (error: Error, socialConnectionType: string): void => {
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
        this.props.navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
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
      this.handleOAuthLoginError(error);
      return;
    }

    const errorMessage = 'oauth_error';

    trace({
      name: TraceName.OnboardingSocialLoginError,
      op: TraceOperation.OnboardingError,
      tags: { provider: socialConnectionType, errorMessage },
      parentContext: this.onboardingTraceCtx,
    });
    endTrace({ name: TraceName.OnboardingSocialLoginError });

    if (this.socialLoginTraceCtx) {
      endTrace({
        name: TraceName.OnboardingSocialLoginAttempt,
        data: { success: false },
      });
      this.socialLoginTraceCtx = undefined;
    }

    this.props.navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.SHEET.SUCCESS_ERROR_SHEET,
      params: {
        title: strings(`error_sheet.${errorMessage}_title`),
        description: strings(`error_sheet.${errorMessage}_description`),
        descriptionAlign: 'center',
        buttonLabel: strings(`error_sheet.${errorMessage}_button`),
        type: 'error',
      },
    });
  };

  handleOAuthLoginError = (error: Error): void => {
    // If user has already consented to analytics, report error using regular Sentry
    if (this.props.metrics.isEnabled()) {
      captureException(error, {
        tags: {
          view: 'Onboarding',
          context: 'OAuth login failed - user consented to analytics',
        },
      });
    } else {
      // User hasn't consented to analytics yet, use ErrorBoundary onboarding flow
      this.setState({
        loading: false,
        errorToThrow: new Error(`OAuth login failed: ${error.message}`),
      });
    }
  };

  track = (event: IMetaMetricsEvent, properties: JsonMap = {}): void => {
    trackOnboarding(
      MetricsEventBuilder.createEventBuilder(event)
        .addProperties(properties)
        .build(),
      this.props.saveOnboardingEvent,
    );
  };

  alertExistingUser = (callback: () => void | Promise<void>): void => {
    this.warningCallback = () => {
      void callback();
      this.toggleWarningModal();
      return true;
    };
    this.toggleWarningModal();
  };

  toggleWarningModal = (): void => {
    const warningModalVisible = this.state.warningModalVisible;
    this.setState({ warningModalVisible: !warningModalVisible });
  };

  handleCtaActions = async (actionType: string): Promise<void> => {
    if (SEEDLESS_ONBOARDING_ENABLED) {
      this.props.navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
        screen: Routes.SHEET.ONBOARDING_SHEET,
        params: {
          onPressCreate: this.onPressCreate,
          onPressImport: this.onPressImport,
          onPressContinueWithGoogle: this.onPressContinueWithGoogle,
          onPressContinueWithApple: this.onPressContinueWithApple,
          createWallet: actionType === 'create',
        },
      });
      // else
    } else if (actionType === 'create') {
      await this.onPressCreate();
    } else {
      await this.onPressImport();
    }
  };

  setStartFoxAnimation = (): void => {
    this.setState({ startFoxAnimation: 'Start' });
  };

  renderLoader = (): React.ReactElement => {
    const colors = this.themeContext.colors || mockTheme.colors;
    const styles = createStyles(colors);

    return (
      <View style={styles.loaderWrapper}>
        <View style={styles.loader}>
          <ActivityIndicator size="small" />
          <Text style={styles.loadingText}>{this.props.loadingMsg}</Text>
        </View>
      </View>
    );
  };

  renderContent(): React.ReactElement {
    const colors = this.themeContext.colors || mockTheme.colors;
    const styles = createStyles(colors);

    return (
      <View style={styles.ctas}>
        <OnboardingAnimation
          startOnboardingAnimation={this.state.startOnboardingAnimation}
          setStartFoxAnimation={this.setStartFoxAnimation}
        >
          <Button
            variant={ButtonVariants.Primary}
            onPress={() => this.handleCtaActions('create')}
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
            onPress={() => this.handleCtaActions('existing')}
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
    );
  }

  handleSimpleNotification = (): React.ReactElement | null => {
    const colors = this.themeContext.colors || mockTheme.colors;
    const styles = createStyles(colors);

    if (!this.props.route.params?.delete) return null;
    return (
      <Animated.View
        style={[
          styles.notificationContainer,
          { transform: [{ translateY: this.notificationAnimated }] },
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
  };

  render(): React.ReactElement {
    const { loading } = this.props;
    const { existingUser, errorToThrow, startFoxAnimation } = this.state;
    const colors = this.themeContext.colors || mockTheme.colors;
    const styles = createStyles(colors);
    const hasFooter = existingUser && !loading;

    // Component that throws error if needed (to be caught by ErrorBoundary)
    const ThrowErrorIfNeeded = () => {
      if (errorToThrow) {
        throw errorToThrow;
      }
      return null;
    };

    return (
      <ErrorBoundary
        navigation={this.props.navigation}
        view="Onboarding"
        useOnboardingErrorHandling={
          !!errorToThrow && !this.props.metrics.isEnabled()
        }
      >
        <ThrowErrorIfNeeded />
        <SafeAreaView
          style={[
            baseStyles.flexGrow,
            {
              backgroundColor:
                this.themeContext.themeAppearance === 'dark'
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
              {this.renderContent()}

              {loading && (
                <View
                  style={[
                    styles.loaderOverlay,
                    {
                      backgroundColor:
                        this.themeContext.themeAppearance === 'dark'
                          ? importedColors.gettingStartedTextColor
                          : importedColors.gettingStartedPageBackgroundColorLightMode,
                    },
                  ]}
                >
                  {this.renderLoader()}
                </View>
              )}
            </View>

            {existingUser && !loading && (
              <View style={styles.footer}>
                <Button
                  variant={ButtonVariants.Link}
                  onPress={this.onLogin}
                  label={strings('onboarding.unlock')}
                  width={ButtonWidthTypes.Full}
                  size={Device.isMediumDevice() ? ButtonSize.Md : ButtonSize.Lg}
                />
              </View>
            )}
          </ScrollView>

          <FadeOutOverlay />

          <FoxAnimation hasFooter={hasFooter} trigger={startFoxAnimation} />

          <View>{this.handleSimpleNotification()}</View>

          <FastOnboarding
            onPressContinueWithGoogle={this.onPressContinueWithGoogle}
            onPressContinueWithApple={this.onPressContinueWithApple}
            onPressImport={this.onPressImport}
            onPressCreate={this.onPressCreate}
          />
        </SafeAreaView>
      </ErrorBoundary>
    );
  }
}

Onboarding.contextType = ThemeContext;

const ConnectedOnboarding = connector(Onboarding);
const OnboardingWithMetrics = withMetricsAwareness(
  ConnectedOnboarding as unknown as React.ComponentType<IWithMetricsAwarenessProps>,
);

export default OnboardingWithMetrics as React.ComponentType<OnboardingComponentProps>;

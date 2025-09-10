import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import {
  ActivityIndicator,
  BackHandler,
  View,
  ScrollView,
  StyleSheet,
  InteractionManager,
  Animated,
  Easing,
  Platform,
} from 'react-native';
import { captureException } from '@sentry/react-native';
import Text, {
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import {
  fontStyles,
  baseStyles,
  colors as importedColors,
} from '../../../styles/common';
import { strings } from '../../../../locales/i18n';
import { connect } from 'react-redux';
import FadeOutOverlay from '../../UI/FadeOutOverlay';
import { getTransparentOnboardingNavbarOptions } from '../../UI/Navbar';
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
import { ThemeContext, mockTheme } from '../../../util/theme';
import { OnboardingSelectorIDs } from '../../../../e2e/selectors/Onboarding/Onboarding.selectors';
import Routes from '../../../constants/navigation/Routes';
import { selectAccounts } from '../../../selectors/accountTrackerController';
import { selectExistingUser } from '../../../reducers/user/selectors';
import trackOnboarding from '../../../util/metrics/TrackOnboarding/trackOnboarding';
import LottieView from 'lottie-react-native';
import NetInfo from '@react-native-community/netinfo';
import {
  TraceName,
  TraceOperation,
  endTrace,
  trace,
} from '../../../util/trace';
import { getTraceTags } from '../../../util/sentry/tags';
import { store } from '../../../store';
import { MetricsEventBuilder } from '../../../core/Analytics/MetricsEventBuilder';
import Button, {
  ButtonVariants,
  ButtonWidthTypes,
  ButtonSize,
} from '../../../component-library/components/Buttons/Button';
import fox from '../../../animations/Searching_Fox.json';
import OAuthLoginService from '../../../core/OAuthService/OAuthService';
import { OAuthError, OAuthErrorType } from '../../../core/OAuthService/error';
import { createLoginHandler } from '../../../core/OAuthService/OAuthLoginHandlers';
import { SEEDLESS_ONBOARDING_ENABLED } from '../../../core/OAuthService/OAuthLoginHandlers/constants';
import { withMetricsAwareness } from '../../hooks/useMetrics';
import { setupSentry } from '../../../util/sentry/utils';
import ErrorBoundary from '../ErrorBoundary';

const createStyles = (colors) =>
  StyleSheet.create({
    scroll: {
      flex: 1,
    },
    wrapper: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: Device.isMediumDevice() ? 16 : 30,
    },
    loaderWrapper: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      rowGap: 32,
      marginBottom: 160,
    },
    image: {
      alignSelf: 'center',
      width: Device.isMediumDevice() ? 180 : 240,
      height: Device.isMediumDevice() ? 180 : 240,
    },
    largeFoxWrapper: {
      width: Device.isMediumDevice() ? 180 : 240,
      height: Device.isMediumDevice() ? 180 : 240,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      marginHorizontal: 'auto',
      padding: Device.isMediumDevice() ? 30 : 40,
      marginTop: 16,
    },
    foxImage: {
      width: Device.isMediumDevice() ? 110 : 145,
      height: Device.isMediumDevice() ? 110 : 145,
      resizeMode: 'contain',
    },
    title: {
      fontSize: Device.isMediumDevice() ? 30 : 40,
      lineHeight: Device.isMediumDevice() ? 30 : 40,
      textAlign: 'center',
      paddingHorizontal: Device.isMediumDevice() ? 40 : 60,
      fontFamily:
        Platform.OS === 'android' ? 'MM Sans Regular' : 'MMSans-Regular',
      color: importedColors.gettingStartedTextColor,
      width: '100%',
      marginVertical: 16,
    },
    ctas: {
      flex: 1,
      flexDirection: 'column',
      justifyContent: 'space-between',
      alignItems: 'center',
      width: '100%',
      paddingHorizontal: 20,
      rowGap: Device.isMediumDevice() ? 16 : 24,
    },
    titleWrapper: {
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
      flex: 1,
      rowGap: Device.isMediumDevice() ? 24 : 32,
    },
    footer: {
      marginBottom: 40,
      marginTop: -40,
    },
    login: {
      fontSize: 18,
      color: colors.primary.default,
      ...fontStyles.normal,
    },
    buttonDescription: {
      textAlign: 'center',
      marginBottom: 16,
    },
    importWrapper: {
      marginVertical: 16,
    },
    createWrapper: {
      flexDirection: 'column',
      rowGap: Device.isMediumDevice() ? 12 : 16,
      marginBottom: 16,
      width: '100%',
    },
    buttonWrapper: {
      flexDirection: 'column',
      justifyContent: 'flex-end',
      gap: Device.isMediumDevice() ? 12 : 16,
      width: '100%',
    },
    buttonLabel: {
      flexDirection: 'row',
      alignItems: 'center',
      columnGap: 8,
    },
    loader: {
      justifyContent: 'center',
      textAlign: 'center',
    },
    loadingText: {
      marginTop: 30,
      textAlign: 'center',
    },
    modalTypeView: {
      position: 'absolute',
      bottom: 0,
      paddingBottom: Device.isIphoneX() ? 20 : 10,
      left: 0,
      right: 0,
      backgroundColor: importedColors.transparent,
    },
    notificationContainer: {
      flex: 0.1,
      flexDirection: 'row',
      alignItems: 'flex-end',
    },
    divider: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: colors.border.muted,
    },
    bottomSheetContainer: {
      padding: 16,
      flexDirection: 'column',
      rowGap: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    socialBtn: {
      borderColor: colors.border.muted,
      borderWidth: 1,
      color: colors.text.default,
    },
    blackButton: {
      backgroundColor: importedColors.btnBlack,
    },
    blackButtonText: {
      color: importedColors.btnBlackText,
    },
    inverseBlackButton: {
      backgroundColor: importedColors.btnBlackInverse,
    },
  });

/**
 * View that is displayed to first time (new) users
 */
class Onboarding extends PureComponent {
  static propTypes = {
    disableNewPrivacyPolicyToast: PropTypes.func,
    /**
     * The navigator object
     */
    navigation: PropTypes.object,
    /**
     * redux flag that indicates if the user set a password
     */
    passwordSet: PropTypes.bool,
    /**
     * loading status
     */
    loading: PropTypes.bool,
    /**
     * set loading status
     */
    setLoading: PropTypes.func,
    /**
     * unset loading status
     */
    unsetLoading: PropTypes.func,
    /**
     * redux flag that indicates if the user is existing
     */
    existingUser: PropTypes.bool,
    /**
     * Action to save onboarding event
     */
    saveOnboardingEvent: PropTypes.func,
    /**
     * loadings msg
     */
    loadingMsg: PropTypes.string,
    /**
     * Object that represents the current route info like params passed to it
     */
    route: PropTypes.object,
    /**
     * Metrics injected by withMetricsAwareness HOC
     */
    metrics: PropTypes.object,
  };
  notificationAnimated = new Animated.Value(100);
  detailsYAnimated = new Animated.Value(0);
  actionXAnimated = new Animated.Value(0);
  detailsAnimated = new Animated.Value(0);

  onboardingTraceCtx = null;
  socialLoginTraceCtx = null;

  animatedTimingStart = (animatedRef, toValue) => {
    Animated.timing(animatedRef, {
      toValue,
      duration: 500,
      easing: Easing.linear,
      useNativeDriver: true,
    }).start();
  };

  state = {
    warningModalVisible: false,
    loading: false,
    existingUser: false,
    createWallet: false,
    existingWallet: false,
    errorSheetVisible: false,
    errorToThrow: null,
  };

  seedwords = null;
  importedAccounts = null;
  channelName = null;
  incomingDataStr = '';
  dataToSync = null;
  mounted = false;

  warningCallback = () => true;

  showNotification = () => {
    // show notification
    this.animatedTimingStart(this.notificationAnimated, 0);
    // hide notification
    setTimeout(() => {
      this.animatedTimingStart(this.notificationAnimated, 200);
    }, 4000);
    this.disableBackPress();
  };

  disableBackPress = () => {
    // Disable back press
    const hardwareBackPress = () => true;
    BackHandler.addEventListener('hardwareBackPress', hardwareBackPress);
  };

  updateNavBar = () => {
    const { route, navigation } = this.props;
    const colors = this.context.colors || mockTheme.colors;
    navigation.setOptions(
      getTransparentOnboardingNavbarOptions(
        colors,
        importedColors.gettingStartedPageBackgroundColor,
        true,
        importedColors.btnBlack,
      ),
    );
  };

  componentDidMount() {
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
      PreventScreenshot.forbid();
      if (this.props.route.params?.delete) {
        this.props.setLoading(strings('onboarding.delete_current'));
        setTimeout(() => {
          this.showNotification();
          this.props.unsetLoading();
        }, 2000);
      }
    });
  }

  componentWillUnmount() {
    this.mounted = false;
    this.props.unsetLoading();
    InteractionManager.runAfterInteractions(PreventScreenshot.allow);
  }

  componentDidUpdate = () => {
    this.updateNavBar();
  };

  async checkIfExistingUser() {
    // Read from Redux state instead of MMKV storage
    const { existingUser } = this.props;
    if (existingUser) {
      this.setState({ existingUser: true });
    }
  }

  onLogin = async () => {
    const { passwordSet } = this.props;
    if (!passwordSet) {
      await Authentication.resetVault();
      this.props.navigation.replace(Routes.ONBOARDING.HOME_NAV);
    } else {
      await Authentication.lockApp();
      this.props.navigation.replace(Routes.ONBOARDING.LOGIN);
    }
  };

  handleExistingUser = (action) => {
    if (this.state.existingUser) {
      this.alertExistingUser(action);
    } else {
      action();
    }
  };

  onPressCreate = async () => {
    if (SEEDLESS_ONBOARDING_ENABLED) {
      OAuthLoginService.resetOauthState();
    }
    if (OAuthLoginService.getOAuthLoginAttempted()) {
      // Disable metrics
      await this.props.metrics.enable(false);
      OAuthLoginService.setOAuthLoginAttempted(false);
    }

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

  onPressImport = async () => {
    if (SEEDLESS_ONBOARDING_ENABLED) {
      OAuthLoginService.resetOauthState();
    }
    if (OAuthLoginService.getOAuthLoginAttempted()) {
      // Disable metrics
      await this.props.metrics.enable(false);
      OAuthLoginService.setOAuthLoginAttempted(false);
    }
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

  handlePostSocialLogin = (result, createWallet, provider) => {
    if (this.socialLoginTraceCtx) {
      endTrace({ name: TraceName.OnboardingSocialLoginAttempt });
      this.socialLoginTraceCtx = null;
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
          });
        } else {
          trace({
            name: TraceName.OnboardingNewSocialCreateWallet,
            op: TraceOperation.OnboardingUserJourney,
            tags: getTraceTags(store.getState()),
            parentContext: this.onboardingTraceCtx,
          });
          this.props.navigation.navigate('ChoosePassword', {
            [PREVIOUS_SCREEN]: ONBOARDING,
            oauthLoginSuccess: true,
            onboardingTraceCtx: this.onboardingTraceCtx,
          });
        }
      } else if (!createWallet) {
        if (result.existingUser) {
          trace({
            name: TraceName.OnboardingExistingSocialLogin,
            op: TraceOperation.OnboardingUserJourney,
            tags: getTraceTags(store.getState()),
            parentContext: this.onboardingTraceCtx,
          });
          this.props.navigation.navigate('Rehydrate', {
            [PREVIOUS_SCREEN]: ONBOARDING,
            oauthLoginSuccess: true,
            onboardingTraceCtx: this.onboardingTraceCtx,
          });
        } else {
          this.props.navigation.navigate('AccountNotFound', {
            accountName: result.accountName,
            oauthLoginSuccess: true,
            onboardingTraceCtx: this.onboardingTraceCtx,
          });
        }
      }
    } else {
      // handle error: show error message in the UI
    }
  };

  onPressContinueWithSocialLogin = async (createWallet, provider) => {
    // check for internet connection
    try {
      const netState = await NetInfo.fetch();
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
    await this.props.metrics.enable();
    await setupSentry();
    OAuthLoginService.setOAuthLoginAttempted(true);

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
      ).catch((error) => {
        this.props.unsetLoading();
        this.handleLoginError(error, provider);
        return { type: 'error', error, existingUser: false };
      });
      this.handlePostSocialLogin(result, createWallet, provider);

      // delay unset loading to avoid flash of loading state
      setTimeout(() => {
        this.props.unsetLoading();
      }, 1000);
    };
    this.handleExistingUser(action);
  };

  onPressContinueWithApple = async (createWallet) =>
    this.onPressContinueWithSocialLogin(createWallet, 'apple');

  onPressContinueWithGoogle = async (createWallet) =>
    this.onPressContinueWithSocialLogin(createWallet, 'google');

  handleLoginError = (error, socialConnectionType) => {
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
      this.socialLoginTraceCtx = null;
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

  handleOAuthLoginError = (error) => {
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
  track = (event, properties) => {
    trackOnboarding(
      MetricsEventBuilder.createEventBuilder(event)
        .addProperties(properties)
        .build(),
      this.props.saveOnboardingEvent,
    );
  };

  alertExistingUser = (callback) => {
    this.warningCallback = () => {
      callback();
      this.toggleWarningModal();
    };
    this.toggleWarningModal();
  };

  toggleWarningModal = () => {
    const warningModalVisible = this.state.warningModalVisible;
    this.setState({ warningModalVisible: !warningModalVisible });
  };

  handleCtaActions = async (actionType) => {
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

  renderLoader = () => {
    const colors = this.context.colors || mockTheme.colors;
    const styles = createStyles(colors);

    return (
      <View style={styles.loaderWrapper}>
        <View style={styles.largeFoxWrapper}>
          <LottieView
            style={styles.image}
            autoPlay
            loop
            source={fox}
            resizeMode="contain"
          />
        </View>
        <View style={styles.loader}>
          <ActivityIndicator size="small" />
          <Text style={styles.loadingText} color={importedColors.btnBlack}>
            {this.props.loadingMsg}
          </Text>
        </View>
      </View>
    );
  };

  renderContent() {
    const colors = this.context.colors || mockTheme.colors;
    const styles = createStyles(colors);

    return (
      <View style={styles.ctas}>
        <View style={styles.titleWrapper}>
          <View style={styles.largeFoxWrapper}>
            <LottieView
              style={styles.image}
              autoPlay
              loop
              source={fox}
              resizeMode="contain"
            />
          </View>

          <Text
            variant={TextVariant.BodyMD}
            style={styles.title}
            testID={OnboardingSelectorIDs.SCREEN_TITLE}
          >
            {strings('onboarding.title')}
          </Text>
        </View>

        <View style={styles.createWrapper}>
          <Button
            variant={ButtonVariants.Primary}
            onPress={() => this.handleCtaActions('create')}
            testID={OnboardingSelectorIDs.NEW_WALLET_BUTTON}
            label={
              <Text
                variant={TextVariant.BodyMDMedium}
                color={importedColors.btnBlackText}
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
                color={importedColors.btnBlack}
              >
                {SEEDLESS_ONBOARDING_ENABLED
                  ? strings('onboarding.import_using_srp_social_login')
                  : strings('onboarding.import_using_srp')}
              </Text>
            }
            style={styles.inverseBlackButton}
          />
        </View>
      </View>
    );
  }

  handleSimpleNotification = () => {
    const colors = this.context.colors || mockTheme.colors;
    const styles = createStyles(colors);

    if (!this.props.route.params?.delete) return;
    return (
      <Animated.View
        style={[
          styles.notificationContainer,
          { transform: [{ translateY: this.notificationAnimated }] },
        ]}
      >
        <ElevatedView style={styles.modalTypeView} elevation={100}>
          <BaseNotification
            closeButtonDisabled
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

  render() {
    const { loading } = this.props;
    const { existingUser, errorToThrow } = this.state;
    const colors = this.context.colors || mockTheme.colors;
    const styles = createStyles(colors);

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
        <View
          style={[
            baseStyles.flexGrow,
            {
              backgroundColor: importedColors.gettingStartedPageBackgroundColor,
            },
          ]}
          testID={OnboardingSelectorIDs.CONTAINER_ID}
        >
          <ScrollView
            style={baseStyles.flexGrow}
            contentContainerStyle={styles.scroll}
          >
            <View style={styles.wrapper}>
              {loading ? this.renderLoader() : this.renderContent()}
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

          <View>{this.handleSimpleNotification()}</View>
        </View>
      </ErrorBoundary>
    );
  }
}

Onboarding.contextType = ThemeContext;

const mapStateToProps = (state) => ({
  accounts: selectAccounts(state),
  passwordSet: state.user.passwordSet,
  existingUser: selectExistingUser(state),
  loading: state.user.loadingSet,
  loadingMsg: state.user.loadingMsg,
});

const mapDispatchToProps = (dispatch) => ({
  setLoading: (msg) => dispatch(loadingSet(msg)),
  unsetLoading: () => dispatch(loadingUnset()),
  disableNewPrivacyPolicyToast: () =>
    dispatch(storePrivacyPolicyClickedOrClosedAction()),
  saveOnboardingEvent: (...eventArgs) => dispatch(saveEvent(eventArgs)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(withMetricsAwareness(Onboarding));

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
import Text, {
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import StorageWrapper from '../../../store/storage-wrapper';
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
import { MetricsEventBuilder } from '../../../core/Analytics/MetricsEventBuilder';
import Button, {
  ButtonVariants,
  ButtonWidthTypes,
  ButtonSize,
} from '../../../component-library/components/Buttons/Button';
import fox from '../../../animations/Searching_Fox.json';
import { endTrace, trace, TraceName } from '../../../util/trace';

import OAuthLoginService from '../../../core/OAuthService/OAuthService';
import { OAuthError, OAuthErrorType } from '../../../core/OAuthService/error';
import { createLoginHandler } from '../../../core/OAuthService/OAuthLoginHandlers';
import { SEEDLESS_ONBOARDING_ENABLED } from '../../../core/OAuthService/OAuthLoginHandlers/constants';

const createStyles = (colors) =>
  StyleSheet.create({
    scroll: {
      flex: 1,
    },
    wrapper: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 30,
    },
    image: {
      alignSelf: 'center',
      width: 240,
      height: 240,
    },
    largeFoxWrapper: {
      width: 240,
      height: 240,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      marginHorizontal: 'auto',
      padding: 40,
      marginTop: 16,
    },
    foxImage: {
      width: 145,
      height: 145,
      resizeMode: 'contain',
    },
    title: {
      fontSize: 40,
      lineHeight: 40,
      textAlign: 'center',
      paddingHorizontal: 60,
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
      rowGap: 24,
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
      rowGap: 16,
      marginBottom: 16,
      width: '100%',
    },
    buttonWrapper: {
      flexDirection: 'column',
      justifyContent: 'flex-end',
      gap: 16,
      width: '100%',
    },
    buttonLabel: {
      flexDirection: 'row',
      alignItems: 'center',
      columnGap: 8,
    },
    loader: {
      marginTop: 180,
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
  };
  notificationAnimated = new Animated.Value(100);
  detailsYAnimated = new Animated.Value(0);
  actionXAnimated = new Animated.Value(0);
  detailsAnimated = new Animated.Value(0);

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

  onPressCreate = () => {
    if (SEEDLESS_ONBOARDING_ENABLED) {
      OAuthLoginService.resetOauthState();
    }
    trace({ name: TraceName.OnboardingCreateWallet });
    const action = () => {
      this.props.navigation.navigate('ChoosePassword', {
        [PREVIOUS_SCREEN]: ONBOARDING,
      });
      this.track(MetaMetricsEvents.WALLET_SETUP_STARTED, {
        account_type: 'metamask',
      });
    };

    this.handleExistingUser(action);
    endTrace({ name: TraceName.OnboardingCreateWallet });
  };

  onPressImport = () => {
    if (SEEDLESS_ONBOARDING_ENABLED) {
      OAuthLoginService.resetOauthState();
    }
    const action = async () => {
      this.props.navigation.navigate(
        Routes.ONBOARDING.IMPORT_FROM_SECRET_RECOVERY_PHRASE,
        {
          [PREVIOUS_SCREEN]: ONBOARDING,
        },
      );
      this.track(MetaMetricsEvents.WALLET_IMPORT_STARTED, {
        account_type: 'imported',
      });
    };
    this.handleExistingUser(action);
  };

  handlePostSocialLogin = (result, createWallet) => {
    if (result.type === 'success') {
      if (createWallet) {
        if (result.existingUser) {
          this.props.navigation.navigate('AccountAlreadyExists', {
            accountName: result.accountName,
            oauthLoginSuccess: true,
          });
        } else {
          this.props.navigation.navigate('ChoosePassword', {
            [PREVIOUS_SCREEN]: ONBOARDING,
            oauthLoginSuccess: true,
          });
          this.track(MetaMetricsEvents.WALLET_SETUP_STARTED);
        }
      } else if (!createWallet) {
        if (result.existingUser) {
          this.props.navigation.navigate('Rehydrate', {
            [PREVIOUS_SCREEN]: ONBOARDING,
            oauthLoginSuccess: true,
          });
          this.track(MetaMetricsEvents.WALLET_IMPORT_STARTED);
        } else {
          this.props.navigation.navigate('AccountNotFound', {
            accountName: result.accountName,
            oauthLoginSuccess: true,
          });
        }
      }
    } else {
      // handle error: show error message in the UI
    }
  };

  onPressContinueWithApple = async (createWallet) => {
    this.props.navigation.navigate('Onboarding');
    const action = async () => {
      const loginHandler = createLoginHandler(Platform.OS, 'apple');
      const result = await OAuthLoginService.handleOAuthLogin(
        loginHandler,
      ).catch((e) => {
        this.handleLoginError(e);
        return { type: 'error', error: e, existingUser: false };
      });
      this.handlePostSocialLogin(result, createWallet);
    };
    this.handleExistingUser(action);
  };

  onPressContinueWithGoogle = async (createWallet) => {
    this.props.navigation.navigate('Onboarding');
    const action = async () => {
      const loginHandler = createLoginHandler(Platform.OS, 'google');
      const result = await OAuthLoginService.handleOAuthLogin(
        loginHandler,
      ).catch((error) => {
        this.handleLoginError(error);
        return { type: 'error', error, existingUser: false };
      });
      this.handlePostSocialLogin(result, createWallet);
    };
    this.handleExistingUser(action);
  };

  handleLoginError = (error) => {
    let errorMessage;
    if (error instanceof OAuthError) {
      if (error.code === OAuthErrorType.UserCancelled) {
        errorMessage = 'user_cancelled';
      } else {
        errorMessage = 'oauth_error';
      }
    } else {
      errorMessage = 'oauth_error';
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

  handleCtaActions = (actionType) => {
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
      this.onPressCreate();
    } else {
      this.onPressImport();
    }
  };

  renderLoader = () => {
    const colors = this.context.colors || mockTheme.colors;
    const styles = createStyles(colors);

    return (
      <View style={styles.wrapper}>
        <View style={styles.loader}>
          <ActivityIndicator size="small" />
          <Text style={styles.loadingText}>{this.props.loadingMsg}</Text>
        </View>
      </View>
    );
  };

  renderContent() {
    const colors = this.context.colors || mockTheme.colors;
    const styles = createStyles(colors);

    return (
      <View style={styles.ctas}>
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

        <View style={styles.createWrapper}>
          <Button
            variant={ButtonVariants.Primary}
            onPress={() => this.handleCtaActions('create')}
            testID={OnboardingSelectorIDs.NEW_WALLET_BUTTON}
            label={strings('onboarding.start_exploring_now')}
            width={ButtonWidthTypes.Full}
            size={ButtonSize.Lg}
          />
          <Button
            variant={ButtonVariants.Secondary}
            onPress={() => this.handleCtaActions('existing')}
            testID={OnboardingSelectorIDs.IMPORT_SEED_BUTTON}
            width={ButtonWidthTypes.Full}
            size={ButtonSize.Lg}
            label={
              <Text
                variant={TextVariant.BodyMDMedium}
                color={importedColors.btnBlack}
              >
                {strings('onboarding.import_using_srp')}
              </Text>
            }
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
    const { existingUser } = this.state;
    const colors = this.context.colors || mockTheme.colors;
    const styles = createStyles(colors);

    return (
      <View
        style={[
          baseStyles.flexGrow,
          { backgroundColor: importedColors.gettingStartedPageBackgroundColor },
        ]}
        testID={OnboardingSelectorIDs.CONTAINER_ID}
      >
        <ScrollView
          style={baseStyles.flexGrow}
          contentContainerStyle={styles.scroll}
        >
          <View style={styles.wrapper}>
            {loading && (
              <View style={styles.largeFoxWrapper}>
                <LottieView
                  style={styles.image}
                  autoPlay
                  loop
                  source={fox}
                  resizeMode="contain"
                />
              </View>
            )}
            {loading ? this.renderLoader() : this.renderContent()}
          </View>

          {existingUser && !loading && (
            <View style={styles.footer}>
              <Button
                variant={ButtonVariants.Link}
                onPress={this.onLogin}
                label={strings('onboarding.unlock')}
                width={ButtonWidthTypes.Full}
                size={ButtonSize.Lg}
              />
            </View>
          )}
        </ScrollView>

        <FadeOutOverlay />

        <View>{this.handleSimpleNotification()}</View>
      </View>
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

export default connect(mapStateToProps, mapDispatchToProps)(Onboarding);

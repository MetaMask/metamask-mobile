import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import {
  ActivityIndicator,
  BackHandler,
  View,
  ScrollView,
  StyleSheet,
  Image,
  InteractionManager,
  Animated,
  Easing,
} from 'react-native';
import Text, {
  TextVariant,
  TextColor,
} from '../../../component-library/components/Texts/Text';
import StorageWrapper from '../../../store/storage-wrapper';
import {
  fontStyles,
  baseStyles,
  colors as importedColors,
} from '../../../styles/common';
import { strings } from '../../../../locales/i18n';
import ButtonRN from '@metamask/react-native-button';
import { connect } from 'react-redux';
import FadeOutOverlay from '../../UI/FadeOutOverlay';
import {
  getTransparentBackOnboardingNavbarOptions,
  getTransparentOnboardingNavbarOptions,
} from '../../UI/Navbar';
import Device from '../../../util/device';
import BaseNotification from '../../UI/Notification/BaseNotification';
import ElevatedView from 'react-native-elevated-view';
import { loadingSet, loadingUnset, UserActionType } from '../../../actions/user';
import { storePrivacyPolicyClickedOrClosed as storePrivacyPolicyClickedOrClosedAction } from '../../../reducers/legalNotices';
import PreventScreenshot from '../../../core/PreventScreenshot';
import WarningExistingUserModal from '../../UI/WarningExistingUserModal';
import { PREVIOUS_SCREEN, ONBOARDING } from '../../../constants/navigation';
import { EXISTING_USER } from '../../../constants/storage';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { withMetricsAwareness } from '../../hooks/useMetrics';
import { Authentication } from '../../../core';
import { ThemeContext, mockTheme } from '../../../util/theme';
import { OnboardingSelectorIDs } from '../../../../e2e/selectors/Onboarding/Onboarding.selectors';
import Routes from '../../../constants/navigation/Routes';
import { selectAccounts } from '../../../selectors/accountTrackerController';
import trackOnboarding from '../../../util/metrics/TrackOnboarding/trackOnboarding';
// import { trace, TraceName, TraceOperation } from '../../../util/trace';
import { MetricsEventBuilder } from '../../../core/Analytics/MetricsEventBuilder';
import Oauth2LoginComponent from '../../Oauth2Login/Oauth2LoginComponent';
import DevLogger from '../../../core/SDKConnect/utils/DevLogger';
import Icon, {
  IconName,
  IconSize,
} from '../../../component-library/components/Icons/Icon';
import Button, {
  ButtonVariants,
  ButtonWidthTypes,
  ButtonSize,
} from '../../../component-library/components/Buttons/Button';
import Oauth2loginService from '../../../core/Oauth2Login/Oauth2loginService';
import BottomSheet from '../../../component-library/components/BottomSheets/BottomSheet';

const createStyles = (colors) =>
  StyleSheet.create({
    scroll: {
      flex: 1,
      marginTop: 100,
    },
    wrapper: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 30,
    },
    foxWrapper: {
      width: Device.isIos() ? 90 : 45,
      height: Device.isIos() ? 90 : 45,
      marginVertical: 20,
    },
    image: {
      alignSelf: 'center',
      width: Device.isIos() ? 90 : 45,
      height: Device.isIos() ? 90 : 45,
    },
    largeFoxWrapper: {
      alignItems: 'center',
      marginVertical: 60,
    },
    foxImage: {
      width: 145,
      height: 145,
      resizeMode: 'contain',
    },
    title: {
      textAlign: 'center',
    },
    ctas: {
      flex: 1,
      position: 'relative',
      width: '100%',
      paddingHorizontal: 20,
    },
    footer: {
      marginTop: -20,
      marginBottom: 20,
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
      flex: 1,
      flexDirection: 'column',
      justifyContent: 'flex-end',
      rowGap: 16,
      marginBottom: 16,
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
     * oauth2LoginReset
     */
    oauth2LoginReset: PropTypes.func,
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
    bottomSheetVisible: false,
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
      route.params?.delete
        ? getTransparentOnboardingNavbarOptions(colors)
        : getTransparentBackOnboardingNavbarOptions(colors),
    );
  };

  componentDidMount() {
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
    const existingUser = await StorageWrapper.getItem(EXISTING_USER);
    if (existingUser !== null) {
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
    this.props.oauth2LoginReset();
    this.setState({ bottomSheetVisible: false });
    const action = () => {
      const { metrics } = this.props;
      if (metrics.isEnabled()) {
        this.props.navigation.navigate('ChoosePassword', {
          [PREVIOUS_SCREEN]: ONBOARDING,
        });
        this.track(MetaMetricsEvents.WALLET_SETUP_STARTED);
      } else {
        this.props.navigation.navigate('OptinMetrics', {
          onContinue: () => {
            this.props.navigation.replace('ChoosePassword', {
              [PREVIOUS_SCREEN]: ONBOARDING,
            });
            this.track(MetaMetricsEvents.WALLET_SETUP_STARTED);
          },
        });
      }
    };

    this.handleExistingUser(action);
  };

  onPressImport = () => {
    this.props.oauth2LoginReset();
    this.setState({ bottomSheetVisible: false });
    const action = async () => {
      const { metrics } = this.props;
      if (metrics.isEnabled()) {
        this.props.navigation.push(
          Routes.ONBOARDING.IMPORT_FROM_SECRET_RECOVERY_PHRASE,
        );
        this.track(MetaMetricsEvents.WALLET_IMPORT_STARTED);
      } else {
        this.props.navigation.navigate('OptinMetrics', {
          onContinue: () => {
            this.props.navigation.replace(
              Routes.ONBOARDING.IMPORT_FROM_SECRET_RECOVERY_PHRASE,
            );
            this.track(MetaMetricsEvents.WALLET_IMPORT_STARTED);
          },
        });
      }
    };
    this.handleExistingUser(action);
  };


  metricNavigationWrapper = (targetRoute, previousScreen, metricEvent) => {
    const { metrics } = this.props;
    if (metrics.isEnabled()) {
      this.props.navigation.push(
        targetRoute,
        {
          [PREVIOUS_SCREEN]: previousScreen,
        }
      );
      this.track(metricEvent === 'import' ? MetaMetricsEvents.WALLET_IMPORT_STARTED : MetaMetricsEvents.WALLET_SETUP_STARTED);
    } else {
      this.props.navigation.navigate('OptinMetrics', {
        onContinue: () => {
          this.props.navigation.replace(
            targetRoute,
            {
              [PREVIOUS_SCREEN]: previousScreen,
            }
          );
          this.track(metricEvent === 'import' ? MetaMetricsEvents.WALLET_IMPORT_STARTED : MetaMetricsEvents.WALLET_SETUP_STARTED);
        },
      });
    }
  };

  handlePostSocialLogin = (result) => {
    if (result.type === 'success') {
      if (this.state.createWallet) {
        if (result.existingUser) {
          this.props.navigation.navigate('AccountAlreadyExists', {
            accountName: result.accountName,
          });
        } else {
          this.metricNavigationWrapper('ChoosePassword', ONBOARDING, 'create');
        }
      } else if (!this.state.createWallet) {
        if (result.existingUser) {
          this.metricNavigationWrapper('Login', ONBOARDING, 'import');
        } else {
          this.props.navigation.navigate('AccountNotFound', {
            accountName: result.accountName,
          });
        }
      }
    } else {
      // handle error: show error message in the UI
    }
  };

  onPressContinueWithApple = async () => {
    const action = async () => {
      const result = await Oauth2loginService.handleOauth2Login('apple').catch((e) => {
        DevLogger.log(e);
        return {type: 'error', error: e, existingUser: false};
      });

      this.handlePostSocialLogin(result);
    };
    this.handleExistingUser(action);
  };

  onPressContinueWithGoogle = async () => {
    const action = async () => {
      const result = await Oauth2loginService.handleOauth2Login('google').catch((e) => {
        DevLogger.log(e);
        return {type: 'error', error: e, existingUser: false};
      });

      this.handlePostSocialLogin(result);
    };
    this.handleExistingUser(action);
  };

  track = (event) => {
    trackOnboarding(MetricsEventBuilder.createEventBuilder(event).build());
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
    this.setState({
      bottomSheetVisible: true,
      existingWallet: actionType === 'existing',
      createWallet: actionType === 'create',
    });
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
          <Image
            source={require('../../../images/branding/fox.png')}
            style={styles.foxImage}
            resizeMethod={'auto'}
          />
        </View>
        <Text
          variant={TextVariant.DisplayMD}
          color={TextColor.Default}
          testID={OnboardingSelectorIDs.SCREEN_TITLE}
          style={styles.title}
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
            label={strings('onboarding.have_existing_wallet')}
            width={ButtonWidthTypes.Full}
            size={ButtonSize.Lg}
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
        style={baseStyles.flexGrow}
        testID={OnboardingSelectorIDs.CONTAINER_ID}
      >
        <ScrollView
          style={baseStyles.flexGrow}
          contentContainerStyle={styles.scroll}
        >
          <View style={styles.wrapper}>
            {loading && (
              <View style={styles.foxWrapper}>
                <Image
                  source={require('../../../images/branding/fox.png')}
                  style={styles.image}
                  resizeMethod={'auto'}
                />
              </View>
            )}
            {loading ? this.renderLoader() : this.renderContent()}
          </View>
          {/* {existingUser && !loading && (
            <View style={styles.footer}>
              <ButtonRN style={styles.login} onPress={this.onLogin}>
                {strings('onboarding.unlock')}
              </ButtonRN>
            </View>
          )} */}
        </ScrollView>

        <FadeOutOverlay />

        <View>{this.handleSimpleNotification()}</View>

        {/* <WarningExistingUserModal
          warningModalVisible={this.state.warningModalVisible}
          onCancelPress={this.warningCallback}
          onRequestClose={this.toggleWarningModal}
          onConfirmPress={this.toggleWarningModal}
        /> */}

        {this.state.bottomSheetVisible && !loading && (
          <BottomSheet
            shouldNavigateBack={false}
            onClose={() =>
              this.setState({
                bottomSheetVisible: false,
                existingWallet: false,
                createWallet: false,
              })
            }
          >
            <View style={styles.bottomSheetContainer}>
              <Text variant={TextVariant.HeadingMD} color={TextColor.Default}>
                {strings('onboarding.bottom_sheet_title')}
              </Text>
              <View style={styles.buttonWrapper}>
                <Button
                  variant={ButtonVariants.Secondary}
                  onPress={this.onPressContinueWithGoogle}
                  testID={OnboardingSelectorIDs.NEW_WALLET_BUTTON}
                  label={
                    <View style={styles.buttonLabel}>
                      <Icon
                        name={IconName.Google}
                        size={IconSize.Lg}
                        color={TextColor.Default}
                      />
                      <Text
                        variant={TextVariant.BodyMDMedium}
                        color={TextColor.Default}
                      >
                        {this.state.createWallet
                          ? strings('onboarding.continue_with_google')
                          : strings('onboarding.sign_in_with_google')}
                      </Text>
                    </View>
                  }
                  width={ButtonWidthTypes.Full}
                  size={ButtonSize.Lg}
                  style={styles.socialBtn}
                />
                <Button
                  variant={ButtonVariants.Secondary}
                  onPress={this.onPressContinueWithApple}
                  testID={OnboardingSelectorIDs.IMPORT_SEED_BUTTON}
                  label={
                    <View style={styles.buttonLabel}>
                      <Icon
                        name={IconName.Apple}
                        size={IconSize.Lg}
                        color={TextColor.Default}
                      />
                      <Text
                        variant={TextVariant.BodyMDMedium}
                        color={TextColor.Default}
                      >
                        {this.state.createWallet
                          ? strings('onboarding.continue_with_apple')
                          : strings('onboarding.sign_in_with_apple')}
                      </Text>
                    </View>
                  }
                  width={ButtonWidthTypes.Full}
                  size={ButtonSize.Lg}
                  style={styles.socialBtn}
                />
              </View>
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text
                  variant={TextVariant.BodyLGMedium}
                  color={TextColor.Muted}
                >
                  {strings('onboarding.or')}
                </Text>
                <View style={styles.dividerLine} />
              </View>
              <View style={styles.buttonWrapper}>
                <Button
                  variant={ButtonVariants.Secondary}
                  onPress={
                    this.state.createWallet
                      ? this.onPressCreate
                      : this.onPressImport
                  }
                  testID={OnboardingSelectorIDs.IMPORT_SEED_BUTTON}
                  label={
                    this.state.createWallet
                      ? strings('onboarding.continue_with_srp')
                      : strings('onboarding.import_srp')
                  }
                  width={ButtonWidthTypes.Full}
                  size={ButtonSize.Lg}
                />
              </View>
            </View>
          </BottomSheet>
        )}
      </View>
    );
  }
}

Onboarding.contextType = ThemeContext;

const mapStateToProps = (state) => ({
  accounts: selectAccounts(state),
  passwordSet: state.user.passwordSet,
  loading: state.user.loadingSet,
  loadingMsg: state.user.loadingMsg,

  oauth2LoginInProgress: state.user.oauth2LoginInProgress,
  oauth2LoginError: state.user.oauth2LoginError,
  oauth2LoginSuccess: state.user.oauth2LoginSuccess,
  oauth2LoginExistingUser: state.user.oauth2LoginExistingUser,
});

const mapDispatchToProps = (dispatch) => ({
  setLoading: (msg) => dispatch(loadingSet(msg)),
  unsetLoading: () => dispatch(loadingUnset()),
  disableNewPrivacyPolicyToast: () =>
    dispatch(storePrivacyPolicyClickedOrClosedAction()),
  oauth2LoginReset: () => dispatch({ type: UserActionType.OAUTH2_LOGIN_RESET }),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(withMetricsAwareness(Onboarding));

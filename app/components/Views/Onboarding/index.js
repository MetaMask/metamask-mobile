import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import {
  ActivityIndicator,
  BackHandler,
  Text,
  View,
  ScrollView,
  StyleSheet,
  Image,
  InteractionManager,
  Platform,
  Animated,
  Easing,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import StyledButton from '../../UI/StyledButton';
import {
  fontStyles,
  baseStyles,
  colors as importedColors,
} from '../../../styles/common';
import OnboardingScreenWithBg from '../../UI/OnboardingScreenWithBg';
import { strings } from '../../../../locales/i18n';
import Button from 'react-native-button';
import { connect } from 'react-redux';
import FadeOutOverlay from '../../UI/FadeOutOverlay';
import Analytics from '../../../core/Analytics/Analytics';
import { saveOnboardingEvent } from '../../../actions/onboarding';
import {
  getTransparentBackOnboardingNavbarOptions,
  getTransparentOnboardingNavbarOptions,
} from '../../UI/Navbar';
import Device from '../../../util/device';
import BaseNotification from '../../UI/Notification/BaseNotification';
import ElevatedView from 'react-native-elevated-view';
import { loadingSet, loadingUnset } from '../../../actions/user';
import PreventScreenshot from '../../../core/PreventScreenshot';
import WarningExistingUserModal from '../../UI/WarningExistingUserModal';
import { PREVIOUS_SCREEN, ONBOARDING } from '../../../constants/navigation';
import { EXISTING_USER, METRICS_OPT_IN } from '../../../constants/storage';
import { MetaMetricsEvents } from '../../../core/Analytics';
import AnalyticsV2 from '../../../util/analyticsV2';

import DefaultPreference from 'react-native-default-preference';
import { Authentication } from '../../../core';
import { ThemeContext, mockTheme } from '../../../util/theme';
import AnimatedFox from 'react-native-animated-fox';
import generateTestId from '../../../../wdio/utils/generateTestId';
import {
  WALLET_SETUP_SCREEN_TITLE_ID,
  WALLET_SETUP_SCREEN_DESCRIPTION_ID,
  WALLET_SETUP_SCREEN_IMPORT_FROM_SEED_BUTTON_ID,
  WALLET_SETUP_CREATE_NEW_WALLET_BUTTON_ID,
} from '../../../../wdio/screen-objects/testIDs/Screens/WalletSetupScreen.testIds';
import Routes from '../../../constants/navigation/Routes';
import { selectAccounts } from '../../../selectors/accountTrackerController';

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
    title: {
      fontSize: 24,
      color: colors.text.default,
      ...fontStyles.bold,
      textAlign: 'center',
    },
    ctas: {
      flex: 1,
      position: 'relative',
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
      ...fontStyles.normal,
      fontSize: 14,
      textAlign: 'center',
      marginBottom: 16,
      color: colors.text.default,
      lineHeight: 20,
    },
    importWrapper: {
      marginVertical: 24,
    },
    createWrapper: {
      flex: 1,
      justifyContent: 'flex-end',
      marginBottom: 24,
    },
    buttonWrapper: {
      marginBottom: 16,
    },
    loader: {
      marginTop: 180,
      justifyContent: 'center',
      textAlign: 'center',
    },
    loadingText: {
      marginTop: 30,
      fontSize: 14,
      textAlign: 'center',
      color: colors.text.default,
      ...fontStyles.normal,
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
  });

/**
 * View that is displayed to first time (new) users
 */
class Onboarding extends PureComponent {
  static propTypes = {
    /**
     * The navigator object
     */
    navigation: PropTypes.object,
    /**
     * redux flag that indicates if the user set a password
     */
    passwordSet: PropTypes.bool,
    /**
     * Save onboarding event to state
     */
    saveOnboardingEvent: PropTypes.func,
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
    const existingUser = await AsyncStorage.getItem(EXISTING_USER);
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
    const action = async () => {
      const metricsOptIn = await DefaultPreference.get(METRICS_OPT_IN);
      if (metricsOptIn) {
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
    const action = async () => {
      const metricsOptIn = await DefaultPreference.get(METRICS_OPT_IN);
      if (metricsOptIn) {
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

  track = (...eventArgs) => {
    InteractionManager.runAfterInteractions(async () => {
      if (Analytics.checkEnabled()) {
        AnalyticsV2.trackEvent(...eventArgs);
        return;
      }
      const metricsOptIn = await DefaultPreference.get(METRICS_OPT_IN);
      if (!metricsOptIn) {
        this.props.saveOnboardingEvent(eventArgs);
      }
    });
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
        <Text
          style={styles.title}
          {...generateTestId(Platform, WALLET_SETUP_SCREEN_TITLE_ID)}
        >
          {strings('onboarding.title')}
        </Text>
        <View style={styles.importWrapper}>
          <Text
            style={styles.buttonDescription}
            {...generateTestId(Platform, WALLET_SETUP_SCREEN_DESCRIPTION_ID)}
          >
            {strings('onboarding.import')}
          </Text>
        </View>
        <View style={styles.createWrapper}>
          <View style={styles.buttonWrapper}>
            <StyledButton
              type={'normal'}
              onPress={this.onPressImport}
              testID={WALLET_SETUP_SCREEN_IMPORT_FROM_SEED_BUTTON_ID}
            >
              {strings('import_wallet.import_from_seed_button')}
            </StyledButton>
          </View>
          <View style={styles.buttonWrapper}>
            <StyledButton
              type={'blue'}
              onPress={this.onPressCreate}
              testID={WALLET_SETUP_CREATE_NEW_WALLET_BUTTON_ID}
            >
              {strings('onboarding.start_exploring_now')}
            </StyledButton>
          </View>
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
      <View style={baseStyles.flexGrow} testID={'onboarding-screen'}>
        <OnboardingScreenWithBg screen={'c'}>
          <ScrollView
            style={baseStyles.flexGrow}
            contentContainerStyle={styles.scroll}
          >
            <View style={styles.wrapper}>
              {loading && (
                <View style={styles.foxWrapper}>
                  {Device.isAndroid() ? (
                    <Image
                      source={require('../../../images/fox.png')}
                      style={styles.image}
                      resizeMethod={'auto'}
                    />
                  ) : (
                    <AnimatedFox bgColor={colors.background.default} />
                  )}
                </View>
              )}
              {loading ? this.renderLoader() : this.renderContent()}
            </View>
            {existingUser && !loading && (
              <View style={styles.footer}>
                <Button style={styles.login} onPress={this.onLogin}>
                  {strings('onboarding.unlock')}
                </Button>
              </View>
            )}
          </ScrollView>
        </OnboardingScreenWithBg>
        <FadeOutOverlay />

        <View>{this.handleSimpleNotification()}</View>

        <WarningExistingUserModal
          warningModalVisible={this.state.warningModalVisible}
          onCancelPress={this.warningCallback}
          onRequestClose={this.toggleWarningModal}
          onConfirmPress={this.toggleWarningModal}
        />
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
});

const mapDispatchToProps = (dispatch) => ({
  setLoading: (msg) => dispatch(loadingSet(msg)),
  unsetLoading: () => dispatch(loadingUnset()),
  saveOnboardingEvent: (event) => dispatch(saveOnboardingEvent(event)),
});

export default connect(mapStateToProps, mapDispatchToProps)(Onboarding);

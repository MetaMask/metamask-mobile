/* eslint-disable import/no-commonjs */
import React, { PureComponent } from 'react';
import {
  StyleSheet,
  Dimensions,
  Animated,
  View,
  AppState,
  Appearance,
} from 'react-native';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import LottieView from 'lottie-react-native';
import { baseStyles } from '../../../styles/common';
import Logger from '../../../util/Logger';
import { trackErrorAsAnalytics } from '../../../util/analyticsV2';
import { Authentication } from '../../../core';
import {
  getAssetFromTheme,
  mockTheme,
  ThemeContext,
} from '../../../util/theme';
import Routes from '../../../constants/navigation/Routes';
import { selectSelectedAddress } from '../../../selectors/preferencesController';

const LOGO_SIZE = 175;
const createStyles = (colors) =>
  StyleSheet.create({
    container: {
      backgroundColor: colors.background.default,
      flex: 1,
    },
    metamaskName: {
      marginTop: 10,
      height: 25,
      width: 170,
      alignSelf: 'center',
      alignItems: 'center',
      justifyContent: 'center',
    },
    logoWrapper: {
      marginTop: Dimensions.get('window').height / 2 - LOGO_SIZE / 2,
      height: LOGO_SIZE,
    },
    foxAndName: {
      alignSelf: 'center',
      alignItems: 'center',
      justifyContent: 'center',
    },
    animation: {
      width: 110,
      height: 110,
      alignSelf: 'center',
      alignItems: 'center',
      justifyContent: 'center',
    },
    fox: {
      width: 110,
      height: 110,
      alignSelf: 'center',
      alignItems: 'center',
      justifyContent: 'center',
    },
  });

const wordmarkLight = require('../../../animations/wordmark-light.json');
const wordmarkDark = require('../../../animations/wordmark-dark.json');

/**
 * Main view component for the Lock screen
 */
class LockScreen extends PureComponent {
  static propTypes = {
    /**
     * The navigator object
     */
    navigation: PropTypes.object,
    /**
     * Boolean flag that determines if password has been set
     */
    passwordSet: PropTypes.bool,
    selectedAddress: PropTypes.string,
    appTheme: PropTypes.string,
  };

  state = {
    ready: false,
  };

  appState = 'active';
  locked = true;
  timedOut = false;
  firstAnimation = React.createRef();
  secondAnimation = React.createRef();
  animationName = React.createRef();
  opacity = new Animated.Value(1);
  unlockAttempts = 0;
  appStateListener;

  componentDidMount() {
    // Check if is the app is launching or it went to background mode
    this.appState = 'background';
    this.appStateListener = AppState.addEventListener(
      'change',
      this.handleAppStateChange,
    );
    this.mounted = true;
  }

  handleAppStateChange = async (nextAppState) => {
    // Try to unlock when coming from the background
    if (
      this.locked &&
      this.appState !== 'active' &&
      nextAppState === 'active'
    ) {
      this.firstAnimation?.play();
      this.appState = nextAppState;
      // Avoid trying to unlock with the app in background
      this.unlockKeychain();
    }
  };

  componentWillUnmount() {
    this.mounted = false;
    this.appStateListener?.remove();
  }

  lock = async () => {
    await Authentication.lockApp(false);
    this.props.navigation.navigate(Routes.ONBOARDING.LOGIN);
  };

  async unlockKeychain() {
    this.unlockAttempts++;
    try {
      // Retreive the credentials
      Logger.log('Lockscreen::unlockKeychain - getting credentials');
      await Authentication.appTriggeredAuth(this.props.selectedAddress);
      this.locked = false;
      this.setState({ ready: true });
      Logger.log('Lockscreen::unlockKeychain - state: ready');
      this.secondAnimation?.play();
      this.animationName?.play();
      Logger.log('Lockscreen::unlockKeychain - playing animations');

      if (!this.props.passwordSet) {
        this.props.navigation.navigate('OnboardingRootNav', {
          screen: Routes.ONBOARDING.NAV,
          params: { screen: 'Onboarding' },
        });
      }
      this.props.navigation.navigate(Routes.ONBOARDING.HOME_NAV);
    } catch (error) {
      if (this.unlockAttempts <= 3) {
        this.unlockKeychain();
      } else {
        trackErrorAsAnalytics(
          'Lockscreen: Max Attempts Reached',
          error?.message,
          `Unlock attempts: ${this.unlockAttempts}`,
        );
        this.lock();
      }
    }
  }

  onAnimationFinished = () => {
    setTimeout(() => {
      Animated.timing(this.opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
        isInteraction: false,
      }).start(() => {
        this.props.navigation.goBack();
      });
    }, 100);
  };

  getStyles = () => {
    const colors = this.context.colors || mockTheme.colors;
    return createStyles(colors);
  };

  renderAnimations() {
    const { appTheme } = this.props;
    const osColorScheme = Appearance.getColorScheme();
    const wordmark = getAssetFromTheme(
      appTheme,
      osColorScheme,
      wordmarkLight,
      wordmarkDark,
    );
    const styles = this.getStyles();

    if (!this.state.ready) {
      return (
        <LottieView
          // eslint-disable-next-line react/jsx-no-bind
          ref={(animation) => {
            this.firstAnimation = animation;
          }}
          style={styles.animation}
          source={require('../../../animations/bounce.json')}
        />
      );
    }

    return (
      <View style={styles.foxAndName}>
        <LottieView
          // eslint-disable-next-line react/jsx-no-bind
          ref={(animation) => {
            this.secondAnimation = animation;
          }}
          style={styles.animation}
          loop={false}
          source={require('../../../animations/fox-in.json')}
          onAnimationFinish={this.onAnimationFinished}
        />
        <LottieView
          // eslint-disable-next-line react/jsx-no-bind
          ref={(animation) => {
            this.animationName = animation;
          }}
          style={styles.metamaskName}
          loop={false}
          source={wordmark}
        />
      </View>
    );
  }

  render() {
    const styles = this.getStyles();

    return (
      <View style={[baseStyles.flexGrow, styles.container]}>
        <Animated.View style={[styles.logoWrapper, { opacity: this.opacity }]}>
          <View style={styles.fox}>{this.renderAnimations()}</View>
        </Animated.View>
      </View>
    );
  }
}

const mapStateToProps = (state) => ({
  passwordSet: state.user.passwordSet,
  selectedAddress: selectSelectedAddress(state),
  appTheme: state.user.appTheme,
});

LockScreen.contextType = ThemeContext;

export default connect(mapStateToProps)(LockScreen);

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
import { Authentication } from '../../../core';
import {
  getAssetFromTheme,
  mockTheme,
  ThemeContext,
} from '../../../util/theme';
import Routes from '../../../constants/navigation/Routes';
import { CommonActions } from '@react-navigation/native';
import trackErrorAsAnalytics from '../../../util/metrics/TrackError/trackErrorAsAnalytics';
import { MetaMetrics, MetaMetricsEvents } from '../../../core/Analytics';
import { MetricsEventBuilder } from '../../../core/Analytics/MetricsEventBuilder';

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
    appTheme: PropTypes.string,
    /**
     * ID associated with each biometric session.
     * This is used by the biometric sagas to handle actions with the matching ID.
     */
    bioStateMachineId: PropTypes.string,
  };

  state = {
    ready: false,
  };

  locked = true;
  timedOut = false;
  firstAnimation = React.createRef();
  secondAnimation = React.createRef();
  animationName = React.createRef();
  opacity = new Animated.Value(1);
  appStateListener;

  componentDidMount() {
    this.appStateListener = AppState.addEventListener(
      'change',
      this.handleAppStateChange,
    );
  }

  handleAppStateChange = async (nextAppState) => {
    // Trigger biometrics
    if (nextAppState === 'active') {
      this.firstAnimation?.play();
      this.unlockKeychain();
      this.appStateListener?.remove();
    }
  };

  componentWillUnmount() {
    this.appStateListener?.remove();
  }

  lock = () => {
    // TODO: Consolidate navigation action for locking app
    // Reset action reverts the nav state back to original state prior to logging in.
    // Reset is used intentionally. Do not use navigate.
    const resetAction = CommonActions.reset({
      index: 0,
      routes: [{ name: Routes.ONBOARDING.LOGIN }],
    });
    this.props.navigation.dispatch(resetAction);
    // Do not need to await since it's the last action.
    Authentication.lockApp({ reset: false });
  };

  async unlockKeychain() {
    const { bioStateMachineId } = this.props;
    try {
      // Retrieve the credentials
      Logger.log('Lockscreen::unlockKeychain - getting credentials');

      await Authentication.appTriggeredAuth({
        bioStateMachineId,
        disableAutoLogout: true,
      });

      this.setState({ ready: true });
      Logger.log('Lockscreen::unlockKeychain - state: ready');
    } catch (error) {
      this.lock();

      if (error?.message) {
        const errorMessage = error.message;
        const isVaultRelated =
          errorMessage.includes('vault') ||
          errorMessage.includes('keyring') ||
          errorMessage.includes('Cannot unlock') ||
          errorMessage.includes('decrypt') ||
          errorMessage.includes('AUTHENTICATION_APP_TRIGGERED_AUTH');

        if (isVaultRelated) {
          MetaMetrics.getInstance().trackEvent(
            MetricsEventBuilder.createEventBuilder(
              MetaMetricsEvents.VAULT_CORRUPTION_DETECTED,
            )
              .addProperties({
                error_type: 'lockscreen_authentication_failure',
                error_message: errorMessage,
                context: 'lockscreen_unlock_failed',
              })
              .build(),
          );
        }
      }

      trackErrorAsAnalytics(
        'Lockscreen: Authentication failed',
        error?.message,
      );
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
        this.props.navigation.navigate(Routes.ONBOARDING.HOME_NAV, {
          screen: Routes.WALLET_VIEW,
        });
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
  appTheme: state.user.appTheme,
});

LockScreen.contextType = ThemeContext;

const ConnectedLockScreen = connect(mapStateToProps)(LockScreen);

// Wrapper that forces LockScreen to re-render when bioStateMachineId changes.
const LockScreenFCWrapper = (props) => {
  const { bioStateMachineId } = props.route.params;
  return (
    <ConnectedLockScreen
      key={bioStateMachineId}
      bioStateMachineId={bioStateMachineId}
      {...props}
    />
  );
};

LockScreenFCWrapper.propTypes = {
  /**
   * Navigation object that holds params including bioStateMachineId.
   */
  route: PropTypes.object,
};

export default LockScreenFCWrapper;

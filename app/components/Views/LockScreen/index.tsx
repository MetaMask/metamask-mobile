import React, { PureComponent, RefObject } from 'react';
import {
  StyleSheet,
  Dimensions,
  Animated,
  View,
  AppState,
  Appearance,
  AppStateStatus,
} from 'react-native';
import { connect } from 'react-redux';
import LottieView from 'lottie-react-native';
import { baseStyles } from '../../../styles/common';
import Logger from '../../../util/Logger';
import { Authentication } from '../../../core';
import { getAssetFromTheme, mockTheme } from '../../../util/theme';
import Routes from '../../../constants/navigation/Routes';
import {
  CommonActions,
  NavigationProp,
  ParamListBase,
} from '@react-navigation/native';
import trackErrorAsAnalytics from '../../../util/metrics/TrackError/trackErrorAsAnalytics';
import { Theme } from '@metamask/design-tokens';
import wordmarkLight from '../../../animations/wordmark-light.json';
import wordmarkDark from '../../../animations/wordmark-dark.json';
import bounceAnimation from '../../../animations/bounce.json';
import foxInAnimation from '../../../animations/fox-in.json';
import { AppThemeKey } from 'app/util/theme/models';
import { RootState } from 'app/reducers';

const LOGO_SIZE = 175;
const createStyles = (colors: Theme['colors']) =>
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

/**
 * Main view component for the Lock screen
 */
interface LockScreenProps {
  /**
   * The navigator object
   */
  navigation: NavigationProp<ParamListBase>;
  appTheme: AppThemeKey;
  /**
   * ID associated with each biometric session.
   * This is used by the biometric sagas to handle actions with the matching ID.
   */
  bioStateMachineId: string;
}

interface LockScreenState {
  ready: boolean;
}

/**
 * Main view component for the Lock screen
 */
class LockScreen extends PureComponent<LockScreenProps, LockScreenState> {
  state: LockScreenState = {
    ready: false,
  };

  locked = true;
  timedOut = false;
  firstAnimation: RefObject<LottieView> = React.createRef();
  secondAnimation: RefObject<LottieView> = React.createRef();
  animationName: RefObject<LottieView> = React.createRef();
  opacity: Animated.Value = new Animated.Value(1);
  appStateListener?: ReturnType<typeof AppState.addEventListener>;

  componentDidMount() {
    this.appStateListener = AppState.addEventListener(
      'change',
      this.handleAppStateChange,
    );
  }

  handleAppStateChange = async (nextAppState: AppStateStatus) => {
    // Trigger biometrics
    if (nextAppState === 'active') {
      this.firstAnimation?.current?.play();
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
    } catch (error: unknown) {
      this.lock();
      trackErrorAsAnalytics(
        'Lockscreen: Authentication failed',
        error instanceof Error ? error.message : 'Unknown error',
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
          ref={this.firstAnimation}
          style={styles.animation}
          source={bounceAnimation}
        />
      );
    }

    return (
      <View style={styles.foxAndName}>
        <LottieView
          ref={this.secondAnimation}
          style={styles.animation}
          loop={false}
          source={foxInAnimation}
          onAnimationFinish={this.onAnimationFinished}
        />
        <LottieView
          ref={this.animationName}
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

const mapStateToProps = (state: RootState) => ({
  appTheme: state.user.appTheme,
});

const ConnectedLockScreen = connect(mapStateToProps)(LockScreen);

/**
 * Wrapper that forces LockScreen to re-render when bioStateMachineId changes.
 */
interface LockScreenFCWrapperProps {
  /**
   * Navigation object that holds params including bioStateMachineId.
   */
  navigation: NavigationProp<ParamListBase>;
  route: {
    params: {
      bioStateMachineId: string;
    };
  };
}

// Wrapper that forces LockScreen to re-render when bioStateMachineId changes.
const LockScreenFCWrapper: React.FC<LockScreenFCWrapperProps> = (props) => {
  const { bioStateMachineId } = props.route.params;
  return (
    <ConnectedLockScreen
      key={bioStateMachineId}
      bioStateMachineId={bioStateMachineId}
      {...props}
    />
  );
};

export default LockScreenFCWrapper;

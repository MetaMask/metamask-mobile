/* eslint-disable import/no-commonjs */
import React, { PureComponent } from 'react';
import { AppState } from 'react-native';
import PropTypes from 'prop-types';
import Logger from '../../../util/Logger';
import { Authentication } from '../../../core';
import Routes from '../../../constants/navigation/Routes';
import { CommonActions } from '@react-navigation/native';
import trackErrorAsAnalytics from '../../../util/metrics/TrackError/trackErrorAsAnalytics';
import FoxLoader from '../../UI/FoxLoader';

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
     * ID associated with each biometric session.
     * This is used by the biometric sagas to handle actions with the matching ID.
     */
    bioStateMachineId: PropTypes.string,
  };

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

      Logger.log('Lockscreen::unlockKeychain - authentication successful');
    } catch (error) {
      this.lock();
      trackErrorAsAnalytics(
        'Lockscreen: Authentication failed',
        error?.message,
      );
    }
  }

  render() {
    return <FoxLoader />;
  }
}

// Wrapper that forces LockScreen to re-render when bioStateMachineId changes.
const LockScreenFCWrapper = (props) => {
  const { bioStateMachineId } = props.route.params;
  return (
    <LockScreen
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

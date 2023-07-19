import { AppState } from 'react-native';
import SecureKeychain from './SecureKeychain';
import BackgroundTimer from 'react-native-background-timer';
import Engine from '../core/Engine';
import Logger from '../util/Logger';
import { store } from '../store';
import { lockApp, interuptBiometrics } from '../actions/user';

export default class LockManager {
  appStateListener;

  constructor(navigation, lockTime) {
    this.navigation = navigation;
    this.lockTime = lockTime;
    this.appState = 'active';
    this.appStateListener = AppState.addEventListener(
      'change',
      this.handleAppStateChange,
    );
  }

  updateLockTime(lockTime) {
    this.lockTime = lockTime;
  }

  clearBackgroundTimer = () => {
    if (!this.lockTimer) {
      return;
    }

    BackgroundTimer.clearTimeout(this.lockTimer);
    this.lockTimer = null;
  };

  handleAppStateChange = async (nextAppState) => {
    // Don't auto-lock.
    if (
      this.lockTime === -1 || // Lock timer isn't set.
      nextAppState === 'inactive' || // Ignore inactive state.
      (this.appState === 'inactive' && nextAppState === 'active') // Ignore going from inactive -> active state.
    ) {
      this.appState = nextAppState;
      return;
    }

    // Handles interruptions in the middle of authentication while lock timer is not zero
    // This is most likely called when the background timer fails to be called while backgrounding the app
    if (!this.lockTimer && this.lockTime !== 0 && nextAppState !== 'active') {
      store.dispatch(interuptBiometrics());
    }

    // Handle lock logic on background.
    if (nextAppState === 'background') {
      if (this.lockTime === 0) {
        this.lockApp();
      } else {
        // Autolock after some time.
        this.clearBackgroundTimer();
        this.lockTimer = BackgroundTimer.setTimeout(() => {
          if (this.lockTimer) {
            this.lockApp();
          }
        }, this.lockTime);
      }
    }

    // App has foregrounded from background.
    // Clear background timer for safe measure.
    if (this.appState !== 'active' && nextAppState === 'active') {
      this.clearBackgroundTimer();
    }

    this.appState = nextAppState;
  };

  setLockedError = (error) => {
    Logger.log('Failed to lock KeyringController', error);
  };

  lockApp = async () => {
    if (!SecureKeychain.getInstance().isAuthenticating) {
      const { KeyringController } = Engine.context;
      try {
        await KeyringController.setLocked();
        store.dispatch(lockApp());
      } catch (e) {
        this.setLockedError(e);
      }
    } else if (this.lockTimer) {
      BackgroundTimer.clearTimeout(this.lockTimer);
      this.lockTimer = null;
    }
  };

  stopListening() {
    this.appStateListener?.remove();
  }
}

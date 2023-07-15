import { AppState, Platform } from 'react-native';
import SecureKeychain from './SecureKeychain';
import BackgroundTimer from 'react-native-background-timer';
import Engine from '../core/Engine';
import Logger from '../util/Logger';
import { store } from '../store';
import { lockApp, tryAction } from '../actions/user';

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
    // Don't auto-lock
    if (this.lockTime === -1) {
      return;
    }

    if (!this.lockTimer && this.lockTime !== 0 && nextAppState !== 'active') {
      store.dispatch(tryAction());
    }

    if (this.lockTime === 0) {
      const shouldLockApp = Platform.select({
        ios: nextAppState !== 'active',
        android: true,
      });
      // Autolock immediately
      shouldLockApp && this.lockApp();
    } else {
      // Autolock after some time
      const shouldSetBackgroundTimer = Platform.select({
        ios: nextAppState !== 'active', // CHECK
        android: nextAppState !== 'active',
      });
      if (shouldSetBackgroundTimer) {
        this.clearBackgroundTimer();

        this.lockTimer = BackgroundTimer.setTimeout(() => {
          if (this.lockTimer) {
            this.lockApp();
          }
        }, this.lockTime);
      }
    }

    if (this.appState !== 'active' && nextAppState === 'active') {
      // Prevent locking since it didnt reach the time threshold
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

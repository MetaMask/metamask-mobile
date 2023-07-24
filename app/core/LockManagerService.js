import { AppState } from 'react-native';
import SecureKeychain from './SecureKeychain';
import BackgroundTimer from 'react-native-background-timer';
import Engine from './Engine';
import Logger from '../util/Logger';
import { lockApp, interuptBiometrics } from '../actions/user';

class LockManagerService {
  appStateListener = 'active';
  lockTime;

  /**
   * Listen to AppState events to control lock state.
   */
  startListening = () => {
    this.appStateListener = AppState.addEventListener(
      'change',
      this.handleAppStateChange,
    );
  };

  // Pause listening to AppState events.
  stopListening = () => {
    this.appStateListener?.remove();
  };

  init = (store) => {
    this.store = store;
  };

  clearBackgroundTimer = () => {
    if (!this.lockTimer) {
      return;
    }
    BackgroundTimer.clearTimeout(this.lockTimer);
    this.lockTimer = null;
  };

  handleAppStateChange = async (nextAppState) => {
    // Don't auto-lock.
    const lockTime = this.store?.getState().settings.lockTime;
    if (
      lockTime === -1 || // Lock timer isn't set.
      nextAppState === 'inactive' || // Ignore inactive state.
      (this.appState === 'inactive' && nextAppState === 'active') // Ignore going from inactive -> active state.
    ) {
      this.appState = nextAppState;
      return;
    }

    // EDGE CASE
    // Handles interruptions in the middle of authentication while lock timer is a non-zero value
    // This is most likely called when the background timer fails to be called while backgrounding the app
    if (!this.lockTimer && lockTime !== 0 && nextAppState !== 'active') {
      this.store.dispatch(interuptBiometrics());
    }

    // Handle lock logic on background.
    if (nextAppState === 'background') {
      if (lockTime === 0) {
        this.lockApp();
      } else {
        // Autolock after some time.
        this.clearBackgroundTimer();
        this.lockTimer = BackgroundTimer.setTimeout(() => {
          if (this.lockTimer) {
            this.lockApp();
          }
        }, lockTime);
      }
    }

    // App has foregrounded from background.
    // Clear background timer for safe measure.
    if (nextAppState === 'active') {
      this.clearBackgroundTimer();
    }

    this.appState = nextAppState;
  };

  lockApp = async () => {
    if (!SecureKeychain.getInstance().isAuthenticating) {
      const { KeyringController } = Engine.context;
      try {
        await KeyringController.setLocked();
        this.store.dispatch(lockApp());
      } catch (error) {
        Logger.log('Failed to lock KeyringController', error);
      }
    } else if (this.lockTimer) {
      BackgroundTimer.clearTimeout(this.lockTimer);
      this.lockTimer = null;
    }
  };
}

export default new LockManagerService();

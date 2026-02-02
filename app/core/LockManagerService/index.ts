import {
  AppState,
  AppStateStatus,
  NativeEventSubscription,
} from 'react-native';
import SecureKeychain from '../SecureKeychain';
import BackgroundTimer from 'react-native-background-timer';
import Engine from '../Engine';
import Logger from '../../util/Logger';
import {
  lockApp,
  interruptBiometrics,
  checkForDeeplink,
} from '../../actions/user';
import ReduxService from '../redux';

export class LockManagerService {
  #appState?: AppStateStatus;
  #appStateListener?: NativeEventSubscription;
  #lockTimer?: number;

  #lockApp = async () => {
    if (!SecureKeychain.getInstance().isAuthenticating) {
      const { KeyringController } = Engine.context;
      try {
        await KeyringController.setLocked();
        ReduxService.store.dispatch(lockApp());
      } catch (error) {
        Logger.log('Failed to lock KeyringController', error);
      }
    } else if (this.#lockTimer) {
      BackgroundTimer.clearTimeout(this.#lockTimer);
      this.#lockTimer = undefined;
    }
  };

  #clearBackgroundTimer = () => {
    if (!this.#lockTimer) {
      return;
    }
    BackgroundTimer.clearTimeout(this.#lockTimer);
    this.#lockTimer = undefined;
  };

  #handleAppStateChange = async (nextAppState: AppStateStatus) => {
    // Don't auto-lock.
    try {
      const lockTime = ReduxService.store.getState().settings.lockTime;
      if (
        lockTime === -1 || // Lock timer isn't set.
        nextAppState === 'inactive' || // Ignore inactive state.
        (this.#appState === 'inactive' && nextAppState === 'active') // Ignore going from inactive -> active state.
      ) {
        // Lets other services know that the lock manager app state event is resolved while active
        if (nextAppState === 'active') {
          ReduxService.store.dispatch(checkForDeeplink());
        }
        this.#appState = nextAppState;
        return;
      }

      // EDGE CASE
      // Handles interruptions in the middle of authentication while lock timer is a non-zero value
      // This is most likely called when the background timer fails to be called while backgrounding the app
      if (!this.#lockTimer && lockTime !== 0 && nextAppState !== 'active') {
        ReduxService.store.dispatch(interruptBiometrics());
      }

      // Handle lock logic on background.
      if (nextAppState === 'background') {
        if (lockTime === 0) {
          this.#lockApp();
        } else {
          // Autolock after some time.
          this.#clearBackgroundTimer();
          this.#lockTimer = BackgroundTimer.setTimeout(() => {
            if (this.#lockTimer) {
              this.#lockApp();
            }
          }, lockTime);
        }
      }

      // App has foregrounded from background.
      // Clear background timer for safe measure.
      if (nextAppState === 'active') {
        this.#clearBackgroundTimer();
      }

      this.#appState = nextAppState;
    } catch (error) {
      Logger.error(
        error as Error,
        'LockManagerService: Error handling app state change',
      );
    }
  };

  /**
   * Listen to AppState events to control lock state.
   */
  startListening = () => {
    if (this.#appStateListener) {
      Logger.log('Already subscribed to app state listener.');
      return;
    }
    this.#appStateListener = AppState.addEventListener(
      'change',
      this.#handleAppStateChange,
    );
  };

  // Pause listening to AppState events.
  stopListening = () => {
    if (!this.#appStateListener) {
      Logger.log('App state listener is not set.');
      return;
    }
    this.#appStateListener.remove();
    this.#appStateListener = undefined;
  };
}

export default new LockManagerService();

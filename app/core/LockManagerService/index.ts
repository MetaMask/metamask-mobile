import {
  AppState,
  AppStateStatus,
  NativeEventSubscription,
} from 'react-native';
import SecureKeychain from '../SecureKeychain';
import BackgroundTimer from 'react-native-background-timer';
import Engine from '../Engine';
import Logger from '../../util/Logger';
import { lockApp, checkForDeeplink } from '../../actions/user';
import ReduxService from '../redux';

export class LockManagerService {
  #appState?: AppStateStatus;
  #appStateListener?: NativeEventSubscription;
  #lockTimer?: number;
  #backgroundedAt?: number;

  #lockApp = async () => {
    if (!SecureKeychain.getInstance().isAuthenticating) {
      this.#backgroundedAt = undefined;
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

  #hasLockTimeElapsed = (lockTime: number) =>
    lockTime > 0 &&
    this.#backgroundedAt !== undefined &&
    Date.now() - this.#backgroundedAt >= lockTime;

  /**
   * Decides on resume whether the configured lock time has elapsed. The
   * background timer cannot be relied on for this: the OS suspends JS while
   * backgrounded, so an overdue timer only fires after the wallet is already
   * visible again.
   */
  #handleForeground = (lockTime: number, previousAppState?: AppStateStatus) => {
    const shouldLock = this.#hasLockTimeElapsed(lockTime);
    this.#clearBackgroundTimer();
    this.#backgroundedAt = undefined;

    if (shouldLock) {
      this.#lockApp();
      return;
    }

    // Lets other services know that the lock manager app state event is resolved while active
    if (lockTime === -1 || previousAppState === 'inactive') {
      ReduxService.store.dispatch(checkForDeeplink());
    }
  };

  #handleAppStateChange = async (nextAppState: AppStateStatus) => {
    try {
      const lockTime = ReduxService.store.getState().settings.lockTime;
      const previousAppState = this.#appState;
      this.#appState = nextAppState;

      if (nextAppState === 'active') {
        this.#handleForeground(lockTime, previousAppState);
        return;
      }

      if (nextAppState !== 'background' || lockTime === -1) {
        return;
      }

      if (lockTime === 0) {
        this.#lockApp();
        return;
      }

      this.#backgroundedAt = Date.now();
      this.#clearBackgroundTimer();
      this.#lockTimer = BackgroundTimer.setTimeout(() => {
        if (this.#lockTimer && this.#hasLockTimeElapsed(lockTime)) {
          this.#lockApp();
        }
      }, lockTime);
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

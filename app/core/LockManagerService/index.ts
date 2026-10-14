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
  #lockAppPromise?: Promise<void>;
  /**
   * Callers currently holding auto-lock off. Background events schedule a lock
   * again only after every hold is released.
   */
  #autoLockSuppressionCount = 0;

  /**
   * True while Auto-lock still has work: a timer is scheduled, or lock has
   * started and not finished. Deeplink parse must wait so a resume cannot
   * consume a URL and then lose it to a lock that lands a tick later.
   */
  isAutoLockPending(): boolean {
    return this.#lockTimer !== undefined || this.#lockAppPromise !== undefined;
  }

  #startLock = () => {
    if (this.#autoLockSuppressionCount > 0 || this.#lockAppPromise) {
      return;
    }
    this.#lockAppPromise = this.#lockApp().finally(() => {
      this.#lockAppPromise = undefined;
    });
  };

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

  /**
   * Cancels a scheduled lock, waits for an in-flight lock, then parses a
   * pending deeplink only if the wallet is still unlocked.
   */
  #settleAutoLockAndMaybeCheckDeeplink = async () => {
    this.#clearBackgroundTimer();
    if (this.#lockAppPromise) {
      await this.#lockAppPromise;
    }
    if (!Engine.context.KeyringController.isUnlocked()) {
      return;
    }
    ReduxService.store.dispatch(checkForDeeplink());
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
          // Android resumes as background -> inactive -> active, which lands
          // here rather than in the `active` branch below. Without this the
          // pending timer survives the resume and locks mid-session.
          await this.#settleAutoLockAndMaybeCheckDeeplink();
        }
        this.#appState = nextAppState;
        return;
      }

      // Handle lock logic on background.
      if (nextAppState === 'background') {
        if (this.#autoLockSuppressionCount > 0) {
          // A native screen such as Sumsub pauses the React Native host on
          // Android. That background event is the user still in the app.
          this.#clearBackgroundTimer();
        } else if (lockTime === 0) {
          this.#startLock();
        } else {
          // Autolock after some time.
          this.#clearBackgroundTimer();
          this.#lockTimer = BackgroundTimer.setTimeout(() => {
            if (!this.#lockTimer) {
              return;
            }
            this.#lockTimer = undefined;
            this.#startLock();
          }, lockTime);
        }
      }

      // App has foregrounded from background.
      if (nextAppState === 'active') {
        await this.#settleAutoLockAndMaybeCheckDeeplink();
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
   * Pauses auto-lock until the returned function is called.
   *
   * Overlapping callers each hold a count, so a background event schedules a
   * lock again only after every hold is released. Calling the same release
   * function twice does nothing. Any timer already scheduled is cancelled.
   *
   * @returns Idempotent function that drops this hold.
   */
  suppressAutoLock = (): (() => void) => {
    this.#autoLockSuppressionCount += 1;
    this.#clearBackgroundTimer();

    let released = false;
    return () => {
      if (released || this.#autoLockSuppressionCount === 0) {
        released = true;
        return;
      }
      released = true;
      this.#autoLockSuppressionCount -= 1;
    };
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

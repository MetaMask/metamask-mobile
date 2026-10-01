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
import {
  getWalletLockedAt,
  setWalletLockedAt,
} from '../../util/navigation/walletLockClock';
import { getWalletLocked } from '../WalletLockLifecycle';
import ReduxService from '../redux';

export class LockManagerService {
  #appState?: AppStateStatus;
  #appStateListener?: NativeEventSubscription;
  #lockTimer?: number;
  #lockAppPromise?: Promise<void>;

  /**
   * True while Auto-lock still has work: a timer is scheduled, or lock has
   * started and not finished. Deeplink parse must wait so a resume cannot
   * consume a URL and then lose it to a lock that lands a tick later.
   */
  isAutoLockPending(): boolean {
    return this.#lockTimer !== undefined || this.#lockAppPromise !== undefined;
  }

  #startLock = () => {
    if (this.#lockAppPromise) {
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
   * pending deeplink only if the wallet is still unlocked and not in an
   * in-session lock. Unlock owns pending links + `lockedAt` via
   * `navigateToPostUnlockHome`; Face ID inactive→active after keyring unlock
   * must not clear them first.
   */
  #settleAutoLockAndMaybeCheckDeeplink = async () => {
    this.#clearBackgroundTimer();
    if (this.#lockAppPromise) {
      await this.#lockAppPromise;
    }
    if (!Engine.context.KeyringController.isUnlocked()) {
      return;
    }
    if (getWalletLocked()) {
      return;
    }
    // Came back before AutoLock fired. Drop the background restore stamp so
    // the next background starts a fresh window.
    setWalletLockedAt(null);
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
        // Restore window starts here, same instant as the AutoLock timer.
        // iOS suspends JS, so the lock dispatch can land only on resume;
        // stamping `lockedAt` then would restart a window that already elapsed.
        // A stamp already set (still locked, or this background) is kept.
        if (getWalletLockedAt() === null) {
          setWalletLockedAt(Date.now());
        }
        if (lockTime === 0) {
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

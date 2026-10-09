import {
  AppState,
  AppStateStatus,
  NativeEventSubscription,
  NativeModules,
  Platform,
} from 'react-native';
import { providerErrors } from '@metamask/rpc-errors';
import Engine from '../Engine';
import Logger from '../../util/Logger';
import ReduxService from '../redux';
import SecureKeychain from '../SecureKeychain';
import NavigationService from '../NavigationService';
import Routes from '../../constants/navigation/Routes';
import { checkForDeeplink } from '../../actions/user';
import { selectLockTime } from '../../selectors/settings';
import trackErrorAsAnalytics from '../../util/metrics/TrackError/trackErrorAsAnalytics';
import PreventScreenshot, { CAPTURE_KEYS } from '../PreventScreenshot';
import Authentication from '../Authentication';

/**
 * `Activity.setRecentsScreenshotEnabled` exists from Android 13. Below that,
 * the only way to blank the Recents card is FLAG_SECURE, and it has to be set
 * before the user leaves. Holding it also blocks screenshots while the app is
 * open, so it is limited to those older versions.
 */
const RECENTS_SCREENSHOT_API = 33;

/**
 * Minimum time the privacy cover stays up. A fast resume otherwise paints and
 * removes the fox in a few frames. A cover already up longer than this
 * dismisses immediately.
 */
export const PRIVACY_COVER_MIN_VISIBLE_MS = 250;

interface PrivacyCoverNativeModule {
  hide: () => void;
  /**
   * Android only. Resolves after `onPostResume` and rejects if `onPause`
   * invalidates that resume before authentication starts.
   */
  waitUntilAuthenticationReady?: () => Promise<void>;
}

const holdsSecureFlagForRecents = (): boolean =>
  Platform.OS === 'android' &&
  Number(Platform.Version) < RECENTS_SCREENSHOT_API;

/**
 * Single owner of the app's background / foreground lock lifecycle.
 *
 * Responsibilities:
 * - Privacy cover: the native view is shown by the OS lifecycle. This class
 * records that on full `background` (not iOS `inactive`) and calls
 * `PrivacyCoverModule.hide` once resume routing has resolved, after the cover
 * has been up for at least 250ms.
 * - Auto-lock: records when the app was backgrounded and, on resume, decides
 * from wall-clock time whether to lock. `settings.lockTime` is `-1` (never),
 * `0` (immediate), or a duration in milliseconds. A timed lock does not run
 * while the app is away; the keys stay until the user returns.
 * - Resume routing: if locked, prompt authentication (biometrics, with Login
 * as the fallback); if still unlocked, let a pending deeplink parse.
 *
 * Lifecycle:
 * - `initialize()` once at startup: subscribes to AppState. The privacy
 * screen works regardless of login state.
 * - `start()` / `stop()` on LOGIN / LOGOUT: enables / disables auto-lock and
 * the auth prompt on resume.
 *
 * Concurrency: a single in-flight resume resolution. Any `active` event that
 * arrives while one is running (e.g. the system biometric sheet toggling
 * `inactive` -> `active` on iOS, or `background` -> `active` on Android)
 * joins it instead of prompting again.
 */
export class AppLockService {
  #appStateSubscription?: NativeEventSubscription;
  #currentAppState: AppStateStatus = AppState.currentState;

  /** True between LOGIN and LOGOUT. */
  #isAutoLockEnabled = false;

  /** `Date.now()` when the app last entered `background`. */
  #backgroundedAt?: number;
  /**
   * True from background until resume has either left the wallet unlocked or
   * finished the unlock prompt. Holds deeplinks across that whole stretch.
   */
  #lockDecisionPending = false;
  #lockPromise?: Promise<void>;
  #resolveForegroundPromise?: Promise<void>;
  /** `Date.now()` when the privacy cover was last shown. */
  #privacyCoverShownAtMs?: number;
  /** Waits out the remainder of the minimum visible time before the native dismiss. */
  #privacyCoverDismissTimer?: ReturnType<typeof setTimeout>;

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  /**
   * Subscribes to AppState. Safe to call more than once.
   */
  initialize = (): void => {
    if (this.#appStateSubscription) {
      return;
    }
    this.#currentAppState = AppState.currentState;
    this.#appStateSubscription = AppState.addEventListener(
      'change',
      this.#handleAppStateChange,
    );
  };

  /**
   * Enables auto-lock and resume authentication. Called on LOGIN.
   * On Android 12 and older, blocks screen capture for the session so the
   * Recents card is blank before the user ever leaves. Android 13+ blanks
   * Recents natively and keeps screenshots working. Released in `stop`.
   */
  start = (): void => {
    this.#isAutoLockEnabled = true;
    if (!holdsSecureFlagForRecents()) {
      return;
    }
    PreventScreenshot.forbid(CAPTURE_KEYS.unlockedWallet).catch((error) => {
      Logger.error(
        error as Error,
        'AppLockService: Failed to block screen capture',
      );
    });
  };

  /**
   * Disables auto-lock and resume authentication. Called on LOGOUT.
   */
  stop = (): void => {
    this.#isAutoLockEnabled = false;
    this.#lockDecisionPending = false;
    this.#backgroundedAt = undefined;
    this.#releaseSecureFlag();
  };

  /**
   * True from background until resume has either left the wallet unlocked or
   * finished the unlock prompt. Deeplink parsing must wait: a lock would
   * reset navigation, and unlock dispatches onboarding-complete before
   * post-unlock navigation reads the pending link.
   */
  isAutoLockPending = (): boolean => this.#lockDecisionPending;

  /**
   * Removes the AppState subscription and resets all state. Test-only.
   */
  destroy = (): void => {
    this.#appStateSubscription?.remove();
    this.#appStateSubscription = undefined;
    this.#lockDecisionPending = false;
    this.#isAutoLockEnabled = false;
    this.#backgroundedAt = undefined;
    this.#lockPromise = undefined;
    this.#resolveForegroundPromise = undefined;
    this.#clearPrivacyCoverDismissTimer();
    this.#privacyCoverShownAtMs = undefined;
    this.#releaseSecureFlag();
  };

  /**
   * Drops the pre-Android 13 capture block. No-op where Recents is suppressed
   * natively, so a release cannot clear FLAG_SECURE for another owner.
   */
  readonly #releaseSecureFlag = (): void => {
    if (!holdsSecureFlagForRecents()) {
      return;
    }
    PreventScreenshot.allow(CAPTURE_KEYS.unlockedWallet).catch((error) => {
      Logger.error(
        error as Error,
        'AppLockService: Failed to release screen capture block',
      );
    });
  };

  /**
   * Records that the native cover is up. Cancels a dismiss that has not fired
   * yet, so backgrounding again during the minimum visible time keeps it up.
   */
  readonly #showPrivacyCover = (): void => {
    const dismissWasPending = this.#privacyCoverDismissTimer !== undefined;
    this.#clearPrivacyCoverDismissTimer();
    if (this.#privacyCoverShownAtMs !== undefined && !dismissWasPending) {
      return;
    }
    this.#privacyCoverShownAtMs = Date.now();
  };

  /**
   * Dismisses the native cover. A cover shown by the OS before this class
   * recorded it is dismissed immediately. Otherwise the dismiss waits until
   * the cover has been up for `PRIVACY_COVER_MIN_VISIBLE_MS`.
   */
  readonly #hidePrivacyCover = (): void => {
    if (this.#privacyCoverDismissTimer !== undefined) {
      return;
    }
    const elapsedMs =
      this.#privacyCoverShownAtMs === undefined
        ? PRIVACY_COVER_MIN_VISIBLE_MS
        : Date.now() - this.#privacyCoverShownAtMs;
    const remainingMs = PRIVACY_COVER_MIN_VISIBLE_MS - elapsedMs;
    if (remainingMs <= 0) {
      this.#dismissPrivacyCoverNow();
      return;
    }
    this.#privacyCoverDismissTimer = setTimeout(() => {
      this.#privacyCoverDismissTimer = undefined;
      this.#privacyCoverShownAtMs = undefined;
      this.#dismissNativePrivacyCover();
    }, remainingMs);
  };

  readonly #dismissPrivacyCoverNow = (): void => {
    this.#clearPrivacyCoverDismissTimer();
    this.#privacyCoverShownAtMs = undefined;
    this.#dismissNativePrivacyCover();
  };

  readonly #clearPrivacyCoverDismissTimer = (): void => {
    if (this.#privacyCoverDismissTimer === undefined) {
      return;
    }
    clearTimeout(this.#privacyCoverDismissTimer);
    this.#privacyCoverDismissTimer = undefined;
  };

  readonly #dismissNativePrivacyCover = (): void => {
    const privacyCoverModule: PrivacyCoverNativeModule | undefined =
      NativeModules.PrivacyCoverModule;
    privacyCoverModule?.hide();
  };

  // ---------------------------------------------------------------------------
  // AppState handling
  // ---------------------------------------------------------------------------

  readonly #handleAppStateChange = (nextAppState: AppStateStatus): void => {
    this.#currentAppState = nextAppState;
    try {
      switch (nextAppState) {
        case 'inactive':
          // iOS only. The app switcher, Control Center, and system sheets
          // (including Face ID) fire `inactive` while the app is still on
          // screen. The cover waits for a full `background`. Android does
          // not emit `inactive`.
          break;
        case 'background':
          this.#showPrivacyCover();
          this.#onBackground();
          break;
        case 'active':
          this.#onForeground();
          break;
        default:
          break;
      }
    } catch (error) {
      Logger.error(
        error as Error,
        'AppLockService: Error handling app state change',
      );
    }
  };

  readonly #onBackground = (): void => {
    this.#backgroundedAt = Date.now();

    if (!this.#isAutoLockEnabled) {
      return;
    }

    const lockTime = selectLockTime(ReduxService.store.getState());
    if (!this.#isLockTimeActive(lockTime)) {
      return;
    }

    // Hold deeplinks until resume decides. The vault stays unlocked until then
    // unless the lock time is immediate.
    this.#lockDecisionPending = true;
    if (lockTime === 0) {
      this.#startLock().catch((error) => {
        Logger.error(
          error as Error,
          'AppLockService: Failed to lock on background',
        );
      });
    }
  };

  /** `settings.lockTime` of `0` or a positive duration. `-1` and non-numbers are off. */
  readonly #isLockTimeActive = (lockTime: number): boolean =>
    Number.isFinite(lockTime) && lockTime >= 0;

  readonly #onForeground = (): void => {
    if (this.#resolveForegroundPromise) {
      if (SecureKeychain.getInstance().isAuthenticating) {
        // Android backgrounds the host Activity for its credential sheet.
        // Returning from that sheet belongs to the current unlock attempt,
        // so it must not become another auto-lock cycle.
        this.#backgroundedAt = undefined;
      }
      // Otherwise do not consume a newer background timestamp. Once the
      // current resolution settles, its `finally` starts a fresh pass.
      return;
    }

    const backgroundedAt = this.#backgroundedAt;
    this.#backgroundedAt = undefined;

    this.#resolveForegroundPromise = this.#resolveForeground(backgroundedAt)
      .catch((error) => {
        Logger.error(
          error as Error,
          'AppLockService: Error resolving foreground',
        );
      })
      .finally(() => {
        this.#resolveForegroundPromise = undefined;
        if (this.#currentAppState !== 'active') {
          return;
        }
        if (this.#backgroundedAt !== undefined) {
          this.#onForeground();
          return;
        }
        this.#hidePrivacyCover();
      });
  };

  // ---------------------------------------------------------------------------
  // Resume resolution
  // ---------------------------------------------------------------------------

  /**
   * Decides where the user goes after resume. The privacy screen stays up for
   * the whole duration (dismissed by the caller once this settles).
   */
  readonly #resolveForeground = async (
    backgroundedAt: number | undefined,
  ): Promise<void> => {
    try {
      // Let a lock that already started finish before reading state.
      if (this.#lockPromise) {
        await this.#lockPromise;
      }

      if (!this.#isAutoLockEnabled) {
        // Logged out / onboarding / cold start: nothing to resolve.
        return;
      }

      if (backgroundedAt === undefined) {
        // inactive -> active without a background (Control Center, Face ID
        // sheet, share sheet): no time was spent in the background.
        return;
      }

      const { KeyringController } = Engine.context;
      const lockTime = selectLockTime(ReduxService.store.getState());

      if (
        KeyringController.isUnlocked() &&
        this.#isLockTimeActive(lockTime) &&
        Date.now() - backgroundedAt >= lockTime
      ) {
        await this.#startLock();
      }

      // A background that started during this resolution owns the next
      // decision. Leave the deeplink hold in place for it.
      if (this.#backgroundedAt !== undefined) {
        return;
      }

      if (KeyringController.isUnlocked()) {
        // Still unlocked: drop the hold before the saga parses the link.
        this.#lockDecisionPending = false;
        ReduxService.store.dispatch(checkForDeeplink());
        return;
      }

      // Stay pending through the prompt so an onboarding-complete dispatch
      // cannot parse a deeplink before authentication finishes.
      const authenticationReady =
        await this.#waitUntilAndroidAuthenticationReady();
      if (
        !authenticationReady ||
        this.#currentAppState !== 'active' ||
        this.#backgroundedAt !== undefined
      ) {
        return;
      }
      await this.#promptUnlock();
      if (
        this.#currentAppState !== 'active' ||
        this.#backgroundedAt !== undefined ||
        !KeyringController.isUnlocked()
      ) {
        return;
      }
      // Resume does not reset navigation. A waiting deeplink is the only
      // thing that may move the user, and the hold must already be clear.
      this.#lockDecisionPending = false;
      ReduxService.store.dispatch(checkForDeeplink());
    } finally {
      if (this.#backgroundedAt === undefined) {
        this.#lockDecisionPending = false;
      }
    }
  };

  /**
   * Android reports `active` from `onResume`, before `onPostResume`. The PIN
   * prompt is only safe after `onPostResume`. `onPause` rejects this wait so
   * a resume that already ended cannot start authentication.
   */
  readonly #waitUntilAndroidAuthenticationReady =
    async (): Promise<boolean> => {
      if (Platform.OS !== 'android') {
        return true;
      }
      const privacyCoverModule: PrivacyCoverNativeModule | undefined =
        NativeModules.PrivacyCoverModule;
      if (!privacyCoverModule?.waitUntilAuthenticationReady) {
        return true;
      }
      try {
        await privacyCoverModule.waitUntilAuthenticationReady();
        return (
          this.#currentAppState === 'active' &&
          this.#backgroundedAt === undefined
        );
      } catch {
        return false;
      }
    };

  /**
   * Prompts authentication, falling back to the Login screen on failure.
   * The privacy screen is the only cover while this runs.
   */
  readonly #promptUnlock = async (): Promise<void> => {
    try {
      await Authentication.tryBiometricUnlock({
        navigationBehavior: 'preserve',
      });
    } catch (error) {
      NavigationService.navigation?.reset({
        routes: [{ name: Routes.ONBOARDING.LOGIN }],
      });
      trackErrorAsAnalytics(
        'Lockscreen: Authentication failed',
        (error as Error)?.message,
      ).catch(() => undefined);
    }
  };

  // ---------------------------------------------------------------------------
  // Locking
  // ---------------------------------------------------------------------------

  readonly #startLock = (): Promise<void> => {
    if (!this.#lockPromise) {
      this.#lockPromise = this.#lockNow().finally(() => {
        this.#lockPromise = undefined;
      });
    }
    return this.#lockPromise;
  };

  /**
   * The only place the wallet is auto-locked. Skipped while a keychain /
   * biometric prompt is in progress: the system sheet backgrounds the app on
   * Android, and locking underneath it would tear down the very unlock the
   * user is completing.
   */
  readonly #lockNow = async (): Promise<void> => {
    if (SecureKeychain.getInstance().isAuthenticating) {
      return;
    }

    const { KeyringController, ApprovalController } = Engine.context;
    try {
      await KeyringController.setLocked();
    } catch (error) {
      Logger.log('AppLockService: Failed to lock KeyringController', error);
      return;
    }

    // Reject pending confirmations so a stale one is not shown after unlock.
    try {
      if (ApprovalController) {
        ApprovalController.clearRequests(providerErrors.userRejectedRequest());
      }
    } catch (error) {
      Logger.error(
        error as Error,
        'AppLockService: Failed to reject pending approvals on app lock',
      );
    }
  };
}

export default new AppLockService();

import {
  AppState,
  AppStateStatus,
  NativeModules,
  Platform,
} from 'react-native';
import { providerErrors } from '@metamask/rpc-errors';
import { AppLockService, PRIVACY_COVER_MIN_VISIBLE_MS } from './AppLockService';
import Authentication from '../Authentication';
import Engine from '../Engine';
import ReduxService, { type ReduxStore } from '../redux';
import SecureKeychain from '../SecureKeychain';
import Logger from '../../util/Logger';
import Routes from '../../constants/navigation/Routes';
import { checkForDeeplink, lockApp } from '../../actions/user';
import trackErrorAsAnalytics from '../../util/metrics/TrackError/trackErrorAsAnalytics';
import PreventScreenshot, { CAPTURE_KEYS } from '../PreventScreenshot';

jest.mock('../Engine', () => ({
  context: {
    KeyringController: {
      setLocked: jest.fn(),
      isUnlocked: jest.fn(),
    },
    ApprovalController: {
      clearRequests: jest.fn(),
    },
  },
}));

const mockSecureKeychainInstance = { isAuthenticating: false };
jest.mock('../SecureKeychain', () => ({
  getInstance: jest.fn(),
}));

const mockNavigate = jest.fn();
const mockReset = jest.fn();
jest.mock('../NavigationService', () => ({
  __esModule: true,
  default: {
    get navigation() {
      return { navigate: mockNavigate, reset: mockReset };
    },
  },
}));

jest.mock('../Authentication', () => ({
  __esModule: true,
  default: {
    tryBiometricUnlock: jest.fn(),
  },
}));

jest.mock('../../util/metrics/TrackError/trackErrorAsAnalytics', () =>
  jest.fn(),
);

jest.mock('../../util/Logger', () => ({
  log: jest.fn(),
  error: jest.fn(),
}));

jest.mock('../PreventScreenshot', () => ({
  __esModule: true,
  CAPTURE_KEYS: { unlockedWallet: 'metamask-unlocked-wallet' },
  default: {
    forbid: jest.fn(() => Promise.resolve()),
    allow: jest.fn(() => Promise.resolve()),
  },
}));

const mockSetLocked = Engine.context.KeyringController.setLocked as jest.Mock;
const mockIsUnlocked = Engine.context.KeyringController.isUnlocked as jest.Mock;
const mockClearRequests = Engine.context.ApprovalController
  .clearRequests as jest.Mock;
const mockTryBiometricUnlock = Authentication.tryBiometricUnlock as jest.Mock;
const mockGetInstance = SecureKeychain.getInstance as jest.Mock;
const mockHidePrivacyCover = jest.fn();

const LOCK_TIME_NEVER = -1;
const LOCK_TIME_IMMEDIATE = 0;
const LOCK_TIME_30S = 30_000;
const START_TIME = 1_700_000_000_000;

const flushPromises = async () => {
  // Several ticks so chained `.finally` / awaited promises settle.
  for (let i = 0; i < 10; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await Promise.resolve();
  }
};

/** Resolves the wallet unlock so the whole resume path can settle. */
const settle = async () => {
  await flushPromises();
};

describe('AppLockService', () => {
  let service: AppLockService;
  let emitAppState: (state: AppStateStatus) => void;
  let mockDispatch: jest.Mock;
  let lockTime: number;
  let nowSpy: jest.SpyInstance<number, []>;
  let currentTime: number;

  const setLockTime = (value: number) => {
    lockTime = value;
  };

  const advanceClock = (ms: number) => {
    currentTime += ms;
    nowSpy.mockReturnValue(currentTime);
  };

  const setCurrentAppState = (state: AppStateStatus) => {
    Object.defineProperty(AppState, 'currentState', {
      value: state,
      configurable: true,
      writable: true,
    });
  };

  /** Simulates the wallet getting locked as a side effect of `setLocked`. */
  const lockKeyringOnSetLocked = () => {
    mockSetLocked.mockImplementation(async () => {
      mockIsUnlocked.mockReturnValue(false);
    });
  };

  const expectPrivacyCoverDismissed = () => {
    jest.advanceTimersByTime(PRIVACY_COVER_MIN_VISIBLE_MS);
    expect(mockHidePrivacyCover).toHaveBeenCalled();
  };

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    NativeModules.PrivacyCoverModule = { hide: mockHidePrivacyCover };
    lockTime = LOCK_TIME_NEVER;
    mockDispatch = jest.fn();
    mockSecureKeychainInstance.isAuthenticating = false;
    mockGetInstance.mockReturnValue(mockSecureKeychainInstance);
    mockIsUnlocked.mockReturnValue(true);
    mockSetLocked.mockResolvedValue(undefined);
    mockTryBiometricUnlock.mockResolvedValue(undefined);
    currentTime = START_TIME;
    nowSpy = jest.spyOn(Date, 'now').mockReturnValue(currentTime);
    jest.spyOn(ReduxService, 'store', 'get').mockReturnValue({
      getState: () => ({ settings: { lockTime } }),
      dispatch: mockDispatch,
    } as unknown as ReduxStore);
    (AppState.addEventListener as jest.Mock).mockImplementation(
      (_type, listener) => {
        emitAppState = (state: AppStateStatus) => {
          setCurrentAppState(state);
          listener(state);
        };
        return { remove: jest.fn() };
      },
    );
    setCurrentAppState('active');
    service = new AppLockService();
    service.initialize();
  });

  afterEach(() => {
    service.destroy();
    delete NativeModules.PrivacyCoverModule;
    jest.useRealTimers();
    nowSpy.mockRestore();
  });

  describe('screen capture', () => {
    const originalOS = Platform.OS;
    const originalVersion = Platform.Version;

    afterEach(() => {
      Platform.OS = originalOS;
      Object.defineProperty(Platform, 'Version', {
        get: () => originalVersion,
        configurable: true,
      });
    });

    it('blocks capture for the wallet session on Android 12 and older', () => {
      Platform.OS = 'android';
      Object.defineProperty(Platform, 'Version', {
        get: () => 31,
        configurable: true,
      });

      service.start();

      expect(PreventScreenshot.forbid).toHaveBeenCalledWith(
        CAPTURE_KEYS.unlockedWallet,
      );
    });

    it('releases the capture block on logout on Android 12 and older', () => {
      Platform.OS = 'android';
      Object.defineProperty(Platform, 'Version', {
        get: () => 31,
        configurable: true,
      });
      service.start();

      service.stop();

      expect(PreventScreenshot.allow).toHaveBeenCalledWith(
        CAPTURE_KEYS.unlockedWallet,
      );
    });

    it('does not block capture on Android 13 and newer', () => {
      Platform.OS = 'android';
      Object.defineProperty(Platform, 'Version', {
        get: () => 33,
        configurable: true,
      });

      service.start();
      service.stop();

      expect(PreventScreenshot.forbid).not.toHaveBeenCalled();
      expect(PreventScreenshot.allow).not.toHaveBeenCalled();
    });
  });

  describe('initialize', () => {
    it('subscribes to AppState changes once', () => {
      service.initialize();

      expect(AppState.addEventListener).toHaveBeenCalledTimes(1);
      expect(AppState.addEventListener).toHaveBeenCalledWith(
        'change',
        expect.any(Function),
      );
    });
  });

  describe('privacy screen', () => {
    it('keeps the privacy screen hidden while the app is only inactive', () => {
      emitAppState('inactive');

      expect(mockHidePrivacyCover).not.toHaveBeenCalled();
    });

    it('shows the privacy screen when the app is backgrounded', () => {
      emitAppState('background');

      expect(mockHidePrivacyCover).not.toHaveBeenCalled();
    });

    it('shows the privacy screen on background even when auto-lock is not started', () => {
      emitAppState('background');

      expect(mockHidePrivacyCover).not.toHaveBeenCalled();
      expect(mockSetLocked).not.toHaveBeenCalled();
    });

    it('waits out the minimum visible time before dismissing the privacy cover', async () => {
      emitAppState('background');

      emitAppState('active');
      await settle();

      expect(mockHidePrivacyCover).not.toHaveBeenCalled();
      jest.advanceTimersByTime(PRIVACY_COVER_MIN_VISIBLE_MS - 1);
      expect(mockHidePrivacyCover).not.toHaveBeenCalled();
      jest.advanceTimersByTime(1);
      expect(mockHidePrivacyCover).toHaveBeenCalledTimes(1);
    });

    it('dismisses the privacy cover immediately once it has been up for the minimum time', async () => {
      emitAppState('background');
      advanceClock(PRIVACY_COVER_MIN_VISIBLE_MS);

      emitAppState('active');
      await settle();

      expect(mockHidePrivacyCover).toHaveBeenCalledTimes(1);
    });

    it('keeps the privacy cover up when the app backgrounds again before the dismiss delay elapses', async () => {
      emitAppState('background');
      emitAppState('active');
      await settle();
      jest.advanceTimersByTime(PRIVACY_COVER_MIN_VISIBLE_MS - 1);

      emitAppState('background');
      jest.advanceTimersByTime(PRIVACY_COVER_MIN_VISIBLE_MS);

      expect(mockHidePrivacyCover).not.toHaveBeenCalled();
    });

    it('hides the privacy screen on resume when auto-lock is not started', async () => {
      emitAppState('background');

      emitAppState('active');
      await settle();

      expectPrivacyCoverDismissed();
      expect(mockDispatch).not.toHaveBeenCalled();
      expect(mockTryBiometricUnlock).not.toHaveBeenCalled();
    });

    it('hides the privacy screen after inactive to active without auth or deeplink check', async () => {
      service.start();
      setLockTime(LOCK_TIME_IMMEDIATE);

      emitAppState('inactive');

      expect(mockHidePrivacyCover).not.toHaveBeenCalled();

      emitAppState('active');
      await settle();

      expectPrivacyCoverDismissed();
      expect(mockSetLocked).not.toHaveBeenCalled();
      expect(mockTryBiometricUnlock).not.toHaveBeenCalled();
      expect(mockDispatch).not.toHaveBeenCalled();
    });
  });

  describe('auto-lock disabled (lockTime -1)', () => {
    beforeEach(() => {
      service.start();
      setLockTime(LOCK_TIME_NEVER);
    });

    it('does not lock or hold deeplinks on background', () => {
      emitAppState('background');

      expect(mockSetLocked).not.toHaveBeenCalled();
      expect(service.isAutoLockPending()).toBe(false);
    });

    it('dispatches checkForDeeplink and hides the privacy screen on resume', async () => {
      emitAppState('background');
      advanceClock(60 * 60_000);

      emitAppState('active');
      await settle();

      expect(mockDispatch).toHaveBeenCalledWith(checkForDeeplink());
      expect(mockTryBiometricUnlock).not.toHaveBeenCalled();
      expectPrivacyCoverDismissed();
    });
  });

  describe('immediate lock (lockTime 0)', () => {
    beforeEach(() => {
      service.start();
      setLockTime(LOCK_TIME_IMMEDIATE);
      lockKeyringOnSetLocked();
    });

    it('locks the keyring, rejects pending approvals and dispatches lockApp on background', async () => {
      emitAppState('background');
      await settle();

      expect(mockSetLocked).toHaveBeenCalledTimes(1);
      expect(mockClearRequests).toHaveBeenCalledWith(
        providerErrors.userRejectedRequest(),
      );
      expect(mockDispatch).toHaveBeenCalledWith(lockApp());
      expect(mockNavigate).not.toHaveBeenCalled();
      expect(service.isAutoLockPending()).toBe(true);
    });

    it('still dispatches lockApp when rejecting approvals throws', async () => {
      mockClearRequests.mockImplementationOnce(() => {
        throw new Error('clear failed');
      });

      emitAppState('background');
      await settle();

      expect(mockDispatch).toHaveBeenCalledWith(lockApp());
      expect(mockNavigate).not.toHaveBeenCalled();
      expect(service.isAutoLockPending()).toBe(true);
      expect(Logger.error).toHaveBeenCalled();
    });

    it('prompts biometric unlock on resume and hides the privacy screen once it resolves', async () => {
      let resolveUnlock: () => void = () => undefined;
      mockTryBiometricUnlock.mockImplementation(
        () =>
          new Promise<void>((resolve) => {
            resolveUnlock = resolve;
          }),
      );
      emitAppState('background');
      await settle();

      emitAppState('active');
      await flushPromises();

      expect(mockTryBiometricUnlock).toHaveBeenCalledTimes(1);
      expect(mockHidePrivacyCover).not.toHaveBeenCalled();
      expect(service.isAutoLockPending()).toBe(true);

      resolveUnlock();
      await settle();

      expect(service.isAutoLockPending()).toBe(false);
      expectPrivacyCoverDismissed();
      expect(mockDispatch).not.toHaveBeenCalledWith(checkForDeeplink());
    });

    it('resets to Login and tracks the error when biometric unlock fails', async () => {
      mockTryBiometricUnlock.mockRejectedValue(new Error('user cancelled'));
      emitAppState('background');
      await settle();

      emitAppState('active');
      await settle();

      expect(mockReset).toHaveBeenCalledWith({
        routes: [{ name: Routes.ONBOARDING.LOGIN }],
      });
      expect(trackErrorAsAnalytics).toHaveBeenCalledWith(
        'Lockscreen: Authentication failed',
        'user cancelled',
      );
      expectPrivacyCoverDismissed();
    });

    it('does not lock while a keychain prompt is in progress and lets a deeplink parse on resume', async () => {
      mockSecureKeychainInstance.isAuthenticating = true;

      emitAppState('background');
      await settle();
      emitAppState('active');
      await settle();

      expect(mockSetLocked).not.toHaveBeenCalled();
      expect(mockDispatch).not.toHaveBeenCalledWith(lockApp());
      expect(mockDispatch).toHaveBeenCalledWith(checkForDeeplink());
      expectPrivacyCoverDismissed();
    });

    it('logs and does not dispatch lockApp when setLocked rejects', async () => {
      mockSetLocked.mockRejectedValue(new Error('keyring busy'));

      emitAppState('background');
      await settle();

      expect(Logger.log).toHaveBeenCalledWith(
        'AppLockService: Failed to lock KeyringController',
        expect.any(Error),
      );
      expect(mockDispatch).not.toHaveBeenCalledWith(lockApp());
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('timed lock (lockTime 30s)', () => {
    beforeEach(() => {
      service.start();
      setLockTime(LOCK_TIME_30S);
      lockKeyringOnSetLocked();
    });

    it('holds deeplinks on background without locking', () => {
      emitAppState('background');

      expect(mockSetLocked).not.toHaveBeenCalled();
      expect(service.isAutoLockPending()).toBe(true);
    });

    it('releases the deeplink hold before parsing a link when resumed before the lock time', async () => {
      emitAppState('background');
      advanceClock(LOCK_TIME_30S - 1);
      mockDispatch.mockImplementation(() => {
        expect(service.isAutoLockPending()).toBe(false);
      });

      emitAppState('active');
      await settle();

      expect(mockSetLocked).not.toHaveBeenCalled();
      expect(mockDispatch).toHaveBeenCalledWith(checkForDeeplink());
      expect(service.isAutoLockPending()).toBe(false);
      expectPrivacyCoverDismissed();
    });

    it('does not lock when Android resumes through background, inactive, active', async () => {
      emitAppState('background');
      emitAppState('inactive');
      expect(service.isAutoLockPending()).toBe(true);

      emitAppState('active');
      await settle();

      expect(mockSetLocked).not.toHaveBeenCalled();
      expect(mockDispatch).toHaveBeenCalledWith(checkForDeeplink());
      expect(service.isAutoLockPending()).toBe(false);
    });

    it('locks on resume from elapsed wall-clock time', async () => {
      emitAppState('background');
      advanceClock(LOCK_TIME_30S);

      emitAppState('active');
      await settle();

      expect(mockSetLocked).toHaveBeenCalledTimes(1);
      expect(mockDispatch).toHaveBeenCalledWith(lockApp());
      expect(mockTryBiometricUnlock).toHaveBeenCalledTimes(1);
      expect(mockDispatch).not.toHaveBeenCalledWith(checkForDeeplink());
      expect(service.isAutoLockPending()).toBe(false);
      expectPrivacyCoverDismissed();
    });

    it('keeps the deeplink hold while the resume lock is in flight', async () => {
      let releaseLock: () => void = () => undefined;
      mockSetLocked.mockImplementation(
        () =>
          new Promise<void>((resolve) => {
            releaseLock = () => {
              mockIsUnlocked.mockReturnValue(false);
              resolve();
            };
          }),
      );
      emitAppState('background');
      advanceClock(LOCK_TIME_30S);
      expect(service.isAutoLockPending()).toBe(true);

      emitAppState('active');
      expect(service.isAutoLockPending()).toBe(true);
      await flushPromises();

      expect(mockTryBiometricUnlock).not.toHaveBeenCalled();
      expect(mockDispatch).not.toHaveBeenCalledWith(checkForDeeplink());
      expect(service.isAutoLockPending()).toBe(true);

      releaseLock();
      await settle();

      expect(mockDispatch).toHaveBeenCalledWith(lockApp());
      expect(mockTryBiometricUnlock).toHaveBeenCalledTimes(1);
      expect(mockDispatch).not.toHaveBeenCalledWith(checkForDeeplink());
      expect(service.isAutoLockPending()).toBe(false);
    });

    it('keeps the deeplink hold when the app backgrounds again before the resume decision finishes', async () => {
      let releaseLock: () => void = () => undefined;
      mockSetLocked.mockImplementation(
        () =>
          new Promise<void>((resolve) => {
            releaseLock = () => {
              mockIsUnlocked.mockReturnValue(false);
              resolve();
            };
          }),
      );
      emitAppState('background');
      advanceClock(LOCK_TIME_30S);
      emitAppState('active');
      await flushPromises();

      emitAppState('background');
      releaseLock();
      await settle();

      expect(service.isAutoLockPending()).toBe(true);
      expect(mockTryBiometricUnlock).not.toHaveBeenCalled();
      expect(mockDispatch).not.toHaveBeenCalledWith(checkForDeeplink());
    });
  });

  describe('resume resolution concurrency', () => {
    let resolveUnlock: () => void;
    let rejectUnlock: (error: Error) => void;

    beforeEach(async () => {
      service.start();
      setLockTime(LOCK_TIME_IMMEDIATE);
      lockKeyringOnSetLocked();
      mockTryBiometricUnlock.mockImplementation(
        () =>
          new Promise<void>((resolve, reject) => {
            resolveUnlock = resolve;
            rejectUnlock = reject;
          }),
      );
      emitAppState('background');
      await settle();
      emitAppState('active');
      await flushPromises();
      expect(mockTryBiometricUnlock).toHaveBeenCalledTimes(1);
    });

    it('does not prompt again when the biometric sheet bounces the app through inactive and active', async () => {
      emitAppState('inactive');
      emitAppState('active');
      await flushPromises();

      expect(mockTryBiometricUnlock).toHaveBeenCalledTimes(1);
      expect(mockHidePrivacyCover).not.toHaveBeenCalled();

      resolveUnlock();
      await settle();

      expectPrivacyCoverDismissed();
    });

    it('does not prompt again when Android backgrounds for the system biometric prompt', async () => {
      mockSecureKeychainInstance.isAuthenticating = true;

      emitAppState('background');
      emitAppState('active');
      await flushPromises();

      expect(mockTryBiometricUnlock).toHaveBeenCalledTimes(1);

      resolveUnlock();
      await settle();

      expectPrivacyCoverDismissed();
    });

    it('keeps the privacy screen up when the prompt fails while backgrounded and resolves on the next resume', async () => {
      emitAppState('background');
      rejectUnlock(new Error('cancelled by system'));
      await settle();

      expect(mockReset).toHaveBeenCalledWith({
        routes: [{ name: Routes.ONBOARDING.LOGIN }],
      });
      expect(mockHidePrivacyCover).not.toHaveBeenCalled();

      // The wallet is still locked when the user comes back.
      mockTryBiometricUnlock.mockResolvedValue(undefined);
      emitAppState('active');
      await settle();

      expect(mockTryBiometricUnlock).toHaveBeenCalledTimes(2);
      expectPrivacyCoverDismissed();
    });

    it('does not lock from a stale background timestamp after a joined resume', async () => {
      // Background during the prompt, then the prompt succeeds and the wallet
      // is unlocked again. A later inactive -> active must not re-lock.
      mockSecureKeychainInstance.isAuthenticating = true;
      emitAppState('background');
      emitAppState('active');
      await flushPromises();
      mockIsUnlocked.mockReturnValue(true);
      mockSecureKeychainInstance.isAuthenticating = false;
      resolveUnlock();
      await settle();
      mockSetLocked.mockClear();
      advanceClock(60_000);

      emitAppState('inactive');
      emitAppState('active');
      await settle();

      expect(mockSetLocked).not.toHaveBeenCalled();
      expectPrivacyCoverDismissed();
    });
  });

  describe('Android authentication resume race', () => {
    const originalOS = Platform.OS;
    let releaseAuthenticationReady: () => void;
    let cancelAuthenticationReady: () => void;

    beforeEach(() => {
      Platform.OS = 'android';
      NativeModules.PrivacyCoverModule.waitUntilAuthenticationReady = jest.fn(
        () =>
          new Promise<void>((resolve, reject) => {
            releaseAuthenticationReady = resolve;
            cancelAuthenticationReady = () => {
              reject(new Error('ACTIVITY_PAUSED'));
            };
          }),
      );
      service.start();
      setLockTime(LOCK_TIME_IMMEDIATE);
      lockKeyringOnSetLocked();
    });

    afterEach(() => {
      Platform.OS = originalOS;
    });

    it('retries the latest foreground after backgrounding before the auth prompt appears', async () => {
      emitAppState('background');
      await settle();
      emitAppState('active');
      await flushPromises();

      expect(mockTryBiometricUnlock).not.toHaveBeenCalled();

      emitAppState('background');
      cancelAuthenticationReady();
      await settle();

      expect(mockTryBiometricUnlock).not.toHaveBeenCalled();
      expect(mockHidePrivacyCover).not.toHaveBeenCalled();

      emitAppState('active');
      await flushPromises();
      releaseAuthenticationReady();
      await settle();

      expect(mockTryBiometricUnlock).toHaveBeenCalledTimes(1);
      expect(service.isAutoLockPending()).toBe(false);
      expectPrivacyCoverDismissed();
    });
  });

  describe('dangerousPauseAutoLock / dangerousResumeAutoLock', () => {
    beforeEach(() => {
      service.start();
      setLockTime(LOCK_TIME_IMMEDIATE);
      lockKeyringOnSetLocked();
    });

    it('still shows the privacy screen but does not lock while paused', async () => {
      service.dangerousPauseAutoLock();

      emitAppState('background');
      await settle();

      expect(mockHidePrivacyCover).not.toHaveBeenCalled();
      expect(mockSetLocked).not.toHaveBeenCalled();
    });

    it('does not lock on resume while paused and lets a deeplink parse', async () => {
      service.dangerousPauseAutoLock();
      emitAppState('background');
      advanceClock(60_000);

      emitAppState('active');
      await settle();

      expect(mockSetLocked).not.toHaveBeenCalled();
      expect(mockDispatch).toHaveBeenCalledWith(checkForDeeplink());
      expectPrivacyCoverDismissed();
    });

    it('locks again on background after dangerousResumeAutoLock', async () => {
      service.dangerousPauseAutoLock();
      service.dangerousResumeAutoLock();

      emitAppState('background');
      await settle();

      expect(mockSetLocked).toHaveBeenCalledTimes(1);
    });

    it('keeps the deeplink hold when paused after the vault is locked', async () => {
      emitAppState('background');
      await settle();

      service.dangerousPauseAutoLock();

      expect(service.isAutoLockPending()).toBe(true);
    });

    it('releases the deeplink hold when paused', () => {
      setLockTime(LOCK_TIME_30S);
      emitAppState('background');

      service.dangerousPauseAutoLock();

      expect(service.isAutoLockPending()).toBe(false);
    });
  });

  describe('stop', () => {
    it('releases the deeplink hold and disables auto-lock', async () => {
      service.start();
      setLockTime(LOCK_TIME_30S);
      emitAppState('background');

      service.stop();

      expect(service.isAutoLockPending()).toBe(false);

      advanceClock(60_000);
      emitAppState('active');
      await settle();

      expect(mockSetLocked).not.toHaveBeenCalled();
      expect(mockDispatch).not.toHaveBeenCalled();
      expectPrivacyCoverDismissed();
    });
  });

  describe('error handling', () => {
    it('logs when reading state throws during background handling', () => {
      service.start();
      jest.spyOn(ReduxService, 'store', 'get').mockImplementation(() => {
        throw new Error('Redux store does not exist!');
      });

      emitAppState('background');

      expect(Logger.error).toHaveBeenCalledWith(
        expect.any(Error),
        'AppLockService: Error handling app state change',
      );
      expect(mockHidePrivacyCover).not.toHaveBeenCalled();
    });

    it('logs and hides the privacy screen when resume resolution throws', async () => {
      service.start();
      setLockTime(LOCK_TIME_IMMEDIATE);
      emitAppState('background');
      await settle();
      mockIsUnlocked.mockImplementation(() => {
        throw new Error('engine not ready');
      });

      emitAppState('active');
      await settle();

      expect(Logger.error).toHaveBeenCalledWith(
        expect.any(Error),
        'AppLockService: Error resolving foreground',
      );
      expect(service.isAutoLockPending()).toBe(false);
      expectPrivacyCoverDismissed();
    });
  });
});

import { AppStateEventProcessor } from '../AppStateEventListener';
import {
  cancelHomepageReadyTrace,
  startHomepageReadyTrace,
} from './HomepageReady';
import {
  cancelDeeplinkNavigatedTrace,
  startDeeplinkNavigatedTrace,
} from './DeeplinkPerformance';
import {
  cancelUnlockHomepageReadyForDeeplink,
  cancelUnlockTraces,
  clearUnlockAppStartType,
  getUnlockAppStartType,
  getUnlockHandBackTimestamps,
  markUnlockCompleted,
  rememberUnlockAppStartType,
  resetUnlockTracesForTesting,
  resumeUnlockDeeplinkNavigatedAfterOptIn,
  startUnlockTraces,
  wasLeg2StartedThisProcess,
} from './unlockTraces';

const MOCK_OFFSET = 1_700_000_000_000;

jest.mock('../../util/trace', () => ({
  getPerformanceTimestampOffset: () => MOCK_OFFSET,
}));

jest.mock('../AppStateEventListener', () => ({
  AppStateEventProcessor: {
    pendingDeeplink: null as string | null,
  },
}));

jest.mock('./HomepageReady', () => ({
  startHomepageReadyTrace: jest.fn(() => 1),
  cancelHomepageReadyTrace: jest.fn(),
}));

jest.mock('./DeeplinkPerformance', () => ({
  startDeeplinkNavigatedTrace: jest.fn(() => 2),
  cancelDeeplinkNavigatedTrace: jest.fn(),
}));

const mockAppState = AppStateEventProcessor as unknown as {
  pendingDeeplink: string | null;
};
const mockStartHomepage = jest.mocked(startHomepageReadyTrace);
const mockStartNavigated = jest.mocked(startDeeplinkNavigatedTrace);
const mockCancelHomepage = jest.mocked(cancelHomepageReadyTrace);
const mockCancelNavigated = jest.mocked(cancelDeeplinkNavigatedTrace);

type StartUnlockTracesOptions = Parameters<typeof startUnlockTraces>[0];

const keychainOptions = (
  overrides: Partial<StartUnlockTracesOptions> = {},
): StartUnlockTracesOptions => ({
  handBack: {
    source: 'keychain',
    credentialReadTimings: {
      requestedAt: 100,
      returnedAt: 2_100,
      empty: false,
      decryptedAt: 2_400,
    },
  },
  unlockEnteredAt: 50,
  existingUser: true,
  beforeNavigate: false,
  ...overrides,
});

describe('unlockTraces', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAppState.pendingDeeplink = null;
    resetUnlockTracesForTesting();
  });

  describe('startUnlockTraces', () => {
    it('starts Homepage Ready when the keychain returns the password, on the trace clock', () => {
      startUnlockTraces(keychainOptions());

      expect(mockStartHomepage).toHaveBeenCalledWith({
        source: 'unlock',
        appStartType: 'cold',
        startTime: MOCK_OFFSET + 2_100,
        tags: { 'unlock.before_navigate': false },
      });
    });

    it('starts Homepage Ready at the typed submit', () => {
      startUnlockTraces(
        keychainOptions({
          handBack: { source: 'typed', submittedAt: 500 },
          unlockEnteredAt: 520,
        }),
      );

      expect(mockStartHomepage).toHaveBeenCalledWith(
        expect.objectContaining({ startTime: MOCK_OFFSET + 500 }),
      );
    });

    it('starts Homepage Ready at unlockWallet entry when a typed password has no submit time', () => {
      startUnlockTraces(
        keychainOptions({
          handBack: { source: 'typed' },
          unlockEnteredAt: 520,
        }),
      );

      expect(mockStartHomepage).toHaveBeenCalledWith(
        expect.objectContaining({ startTime: MOCK_OFFSET + 520 }),
      );
    });

    it('tags unlocks that run onBeforeNavigate', () => {
      startUnlockTraces(keychainOptions({ beforeNavigate: true }));

      expect(mockStartHomepage).toHaveBeenCalledWith(
        expect.objectContaining({
          tags: { 'unlock.before_navigate': true },
        }),
      );
    });

    it('does not start Homepage Ready for rehydration', () => {
      const tokens = startUnlockTraces(
        keychainOptions({ existingUser: false }),
      );

      expect(mockStartHomepage).not.toHaveBeenCalled();
      expect(tokens.homepageReadyTraceToken).toBeNull();
    });

    it('starts only Homepage Ready when no deeplink is pending', () => {
      const tokens = startUnlockTraces(keychainOptions());

      expect(mockStartNavigated).not.toHaveBeenCalled();
      expect(tokens).toEqual({
        homepageReadyTraceToken: 1,
        deeplinkNavigatedTraceToken: null,
      });
    });

    it('starts Deeplink Navigated at the same hand-back when a pending deeplink will divert the launch', () => {
      mockAppState.pendingDeeplink = 'https://link.metamask.io/trending';

      const tokens = startUnlockTraces(keychainOptions());

      expect(mockStartNavigated).toHaveBeenCalledWith({
        url: 'https://link.metamask.io/trending',
        source: 'unlock',
        appStartType: 'cold',
        startTime: MOCK_OFFSET + 2_100,
      });
      expect(tokens).toEqual({
        homepageReadyTraceToken: 1,
        deeplinkNavigatedTraceToken: 2,
      });
    });

    it('still starts Deeplink Navigated for rehydration', () => {
      mockAppState.pendingDeeplink = 'https://link.metamask.io/trending';

      startUnlockTraces(keychainOptions({ existingUser: false }));

      expect(mockStartNavigated).toHaveBeenCalledTimes(1);
    });
  });

  describe('app start type', () => {
    it('stamps the first unlock in the process cold and later ones warm', () => {
      startUnlockTraces(keychainOptions());
      markUnlockCompleted();
      startUnlockTraces(keychainOptions());

      expect(mockStartHomepage).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ appStartType: 'cold' }),
      );
      expect(mockStartHomepage).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ appStartType: 'warm' }),
      );
    });

    it('keeps the next attempt cold when an unlock fails', () => {
      const tokens = startUnlockTraces(keychainOptions());
      cancelUnlockTraces(tokens);
      startUnlockTraces(keychainOptions());

      expect(mockStartHomepage).toHaveBeenLastCalledWith(
        expect.objectContaining({ appStartType: 'cold' }),
      );
    });

    it('remembers the unlock-session app start type for later resolve/parse', () => {
      startUnlockTraces(keychainOptions());
      markUnlockCompleted();

      expect(getUnlockAppStartType()).toBe('cold');
    });

    it('falls back to the process start type when nothing was captured', () => {
      expect(getUnlockAppStartType()).toBe('cold');

      markUnlockCompleted();

      expect(getUnlockAppStartType()).toBe('warm');
    });

    it('clears the captured type after a failed unlock', () => {
      rememberUnlockAppStartType('warm');

      cancelUnlockTraces({
        homepageReadyTraceToken: 1,
        deeplinkNavigatedTraceToken: 2,
      });

      expect(getUnlockAppStartType()).toBe('cold');
    });
  });

  describe('wasLeg2StartedThisProcess', () => {
    it('is false before any unlock', () => {
      expect(wasLeg2StartedThisProcess()).toBe(false);
    });

    it('is true once an unlock starts Homepage Ready', () => {
      startUnlockTraces(keychainOptions());

      expect(wasLeg2StartedThisProcess()).toBe(true);
    });

    it('stays true after that unlock fails', () => {
      cancelUnlockTraces(startUnlockTraces(keychainOptions()));

      expect(wasLeg2StartedThisProcess()).toBe(true);
    });

    it('stays false when another Homepage Ready trace blocks the start', () => {
      mockStartHomepage.mockReturnValueOnce(null);

      startUnlockTraces(keychainOptions());

      expect(wasLeg2StartedThisProcess()).toBe(false);
    });

    it('stays false for rehydration', () => {
      startUnlockTraces(keychainOptions({ existingUser: false }));

      expect(wasLeg2StartedThisProcess()).toBe(false);
    });
  });

  describe('getUnlockHandBackTimestamps', () => {
    it('keeps the keychain marks on the trace clock', () => {
      startUnlockTraces(keychainOptions());

      expect(getUnlockHandBackTimestamps()).toEqual({
        source: 'keychain',
        handBackAt: MOCK_OFFSET + 2_100,
        unlockEnteredAt: MOCK_OFFSET + 50,
        credentialDecryptedAt: MOCK_OFFSET + 2_400,
      });
    });

    it('keeps the typed marks on the trace clock', () => {
      startUnlockTraces(
        keychainOptions({
          handBack: { source: 'typed', submittedAt: 500 },
          unlockEnteredAt: 520,
        }),
      );

      expect(getUnlockHandBackTimestamps()).toEqual({
        source: 'typed',
        handBackAt: MOCK_OFFSET + 500,
        unlockEnteredAt: MOCK_OFFSET + 520,
      });
    });

    it('has no marks when Homepage Ready did not start', () => {
      startUnlockTraces(keychainOptions());
      mockStartHomepage.mockReturnValueOnce(null);

      startUnlockTraces(keychainOptions());

      expect(getUnlockHandBackTimestamps()).toBeNull();
    });

    it('drops the marks after a failed unlock', () => {
      cancelUnlockTraces(startUnlockTraces(keychainOptions()));

      expect(getUnlockHandBackTimestamps()).toBeNull();
    });
  });

  describe('cancelUnlockTraces', () => {
    it('cancels both traces with the tokens the start returned', () => {
      cancelUnlockTraces({
        homepageReadyTraceToken: 1,
        deeplinkNavigatedTraceToken: 2,
      });

      expect(mockCancelHomepage).toHaveBeenCalledWith({
        reason: 'unlock_failed',
        traceToken: 1,
      });
      expect(mockCancelNavigated).toHaveBeenCalledWith({
        reason: 'unlock_failed',
        traceToken: 2,
      });
    });
  });

  describe('cancelUnlockHomepageReadyForDeeplink', () => {
    it('cancels the Homepage Ready of this unlock when a deeplink was pending at hand-back', () => {
      mockAppState.pendingDeeplink = 'https://link.metamask.io/swap';
      startUnlockTraces(keychainOptions());
      // `handleDeeplinkSaga` consumes the live link during `dispatchLogin`.
      mockAppState.pendingDeeplink = null;

      cancelUnlockHomepageReadyForDeeplink();

      expect(mockCancelHomepage).toHaveBeenCalledWith({
        reason: 'deeplink',
        traceToken: 1,
      });
    });

    it('cancels the Homepage Ready of this unlock when a deeplink arrived after hand-back', () => {
      startUnlockTraces(keychainOptions());
      mockAppState.pendingDeeplink = 'https://link.metamask.io/swap';

      cancelUnlockHomepageReadyForDeeplink();

      expect(mockCancelHomepage).toHaveBeenCalledWith({
        reason: 'deeplink',
        traceToken: 1,
      });
    });

    it('keeps Homepage Ready when no deeplink is pending', () => {
      startUnlockTraces(keychainOptions());

      cancelUnlockHomepageReadyForDeeplink();

      expect(mockCancelHomepage).not.toHaveBeenCalled();
    });
  });

  describe('resumeUnlockDeeplinkNavigatedAfterOptIn', () => {
    it('reopens Deeplink Navigated after opt-in using the URL captured at hand-back', () => {
      mockAppState.pendingDeeplink = 'https://link.metamask.io/swap';
      startUnlockTraces(keychainOptions());
      mockStartNavigated.mockClear();
      mockAppState.pendingDeeplink = null;
      clearUnlockAppStartType();

      resumeUnlockDeeplinkNavigatedAfterOptIn({ appStartType: 'cold' });

      expect(getUnlockAppStartType()).toBe('cold');
      expect(mockStartNavigated).toHaveBeenCalledWith({
        url: 'https://link.metamask.io/swap',
        source: 'unlock',
        appStartType: 'cold',
      });
    });

    it('does not reopen Deeplink Navigated after opt-in when unlock had no pending link', () => {
      startUnlockTraces(keychainOptions());
      mockStartNavigated.mockClear();

      resumeUnlockDeeplinkNavigatedAfterOptIn({ appStartType: 'warm' });

      expect(mockStartNavigated).not.toHaveBeenCalled();
      expect(getUnlockAppStartType()).toBe('warm');
    });

    it('does not reopen Deeplink Navigated after a failed unlock', () => {
      mockAppState.pendingDeeplink = 'https://link.metamask.io/swap';
      const tokens = startUnlockTraces(keychainOptions());
      cancelUnlockTraces(tokens);
      mockStartNavigated.mockClear();

      resumeUnlockDeeplinkNavigatedAfterOptIn({ appStartType: 'cold' });

      expect(mockStartNavigated).not.toHaveBeenCalled();
    });
  });
});

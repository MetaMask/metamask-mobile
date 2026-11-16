import { AppState, type AppStateStatus } from 'react-native';
import { TraceName, TraceOperation } from '../../util/trace';
import Logger from '../../util/Logger';
import { AppStateEventProcessor } from '../AppStateEventListener';
import { sendFinishedTransaction } from './finishedTransaction';
import { noteStartupHandBack, noteStartupLeg2Ended } from './startupStageSpans';
import {
  dropUnlockToHomepageReady,
  dropUnlockToHomepageReadyForDeeplink,
  finishUnlockToHomepageReady,
  markUnlockCompleted,
  markUnlockHomeFocused,
  markUnlockNavigate,
  recordUnlockStage,
  resetUnlockToHomepageReadyForTesting,
  startUnlockStage,
  startUnlockToHomepageReady,
  type StartUnlockToHomepageReadyOptions,
  type UnlockStage,
} from './unlockToHomepageReady';

const MOCK_OFFSET = 1_700_000_000_000;

let mockNow = 0;

jest.mock('react-native-performance', () => ({
  __esModule: true,
  default: { now: () => mockNow },
}));

jest.mock('../../util/trace', () => ({
  ...jest.requireActual('../../util/trace'),
  getPerformanceTimestampOffset: () => MOCK_OFFSET,
}));

jest.mock('./finishedTransaction', () => ({
  sendFinishedTransaction: jest.fn(),
}));

jest.mock('../../util/Logger', () => ({
  error: jest.fn(),
  log: jest.fn(),
}));

jest.mock('../AppStateEventListener', () => ({
  AppStateEventProcessor: { pendingDeeplink: null },
}));

jest.mock('./startupStageSpans', () => ({
  getStartupKind: () => 'cold',
  noteStartupHandBack: jest.fn(),
  noteStartupLeg2Ended: jest.fn(),
}));

const mockSend = jest.mocked(sendFinishedTransaction);
const mockLoggerError = jest.mocked(Logger.error);
const mockLoggerLog = jest.mocked(Logger.log);
const mockNoteHandBack = jest.mocked(noteStartupHandBack);
const mockNoteLeg2Ended = jest.mocked(noteStartupLeg2Ended);
const mockAppStateEventProcessor = AppStateEventProcessor as unknown as {
  pendingDeeplink: string | null;
};
const mockRemoveAppStateListener = jest.fn();

let appStateListener: ((state: AppStateStatus) => void) | undefined;

const COLD_TAGS = {
  app_start_type: 'cold',
  'unlock.before_navigate': false,
  'startup.kind': 'cold',
};

const keychainUnlock = (
  overrides: Partial<StartUnlockToHomepageReadyOptions> = {},
): StartUnlockToHomepageReadyOptions => ({
  handBack: {
    source: 'keychain',
    credentialReadTimings: {
      requestedAt: 100,
      returnedAt: 1_000,
      empty: false,
      decryptedAt: 1_040,
    },
  },
  unlockEnteredAt: 50,
  existingUser: true,
  beforeNavigate: false,
  ...overrides,
});

const runAt = <T>(time: number, action: () => T): T => {
  mockNow = time;
  return action();
};

/** Times `stage` from `start` until `end`. */
const timeStage = (stage: UnlockStage, start: number, end: number) => {
  const stop = runAt(start, () => startUnlockStage(stage));
  runAt(end, stop);
};

/** Navigates at 1_600 and focuses the homepage at 1_900. */
const reachHome = () => {
  runAt(1_600, markUnlockNavigate);
  return runAt(1_900, markUnlockHomeFocused);
};

const finishAt = (time: number, contentState: 'filled' | 'error' = 'filled') =>
  runAt(time, () => finishUnlockToHomepageReady({ contentState }));

const getSentTransaction = () => mockSend.mock.calls[0]?.[0];

const getRootData = () => getSentTransaction()?.data;

describe('unlockToHomepageReady', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    resetUnlockToHomepageReadyForTesting();
    mockNow = 1_000;
    mockAppStateEventProcessor.pendingDeeplink = null;
    appStateListener = undefined;
    jest
      .spyOn(AppState, 'addEventListener')
      .mockImplementation((_event, listener) => {
        appStateListener = listener;
        return { remove: mockRemoveAppStateListener };
      });
  });

  describe('sending', () => {
    it('sends the unlock and one child per stage at their marks, on the trace clock', () => {
      startUnlockToHomepageReady(keychainUnlock());
      timeStage('vault_unlock', 1_040, 1_500);
      timeStage('unlock_finalize', 1_500, 1_580);
      reachHome();

      finishAt(2_400);

      const stages: [TraceName, number, number][] = [
        [TraceName.UnlockCredentialDecrypt, 1_000, 1_040],
        [TraceName.UnlockVaultUnlock, 1_040, 1_500],
        [TraceName.UnlockFinalize, 1_500, 1_580],
        [TraceName.UnlockHomeVisible, 1_600, 1_900],
        [TraceName.UnlockHomepageContent, 1_900, 2_400],
      ];
      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(mockSend).toHaveBeenCalledWith(
        {
          name: TraceName.UnlockToHomepageReady,
          op: TraceOperation.UnlockHomepageReady,
          startTime: MOCK_OFFSET + 1_000,
          endTime: MOCK_OFFSET + 2_400,
          tags: COLD_TAGS,
          data: {
            success: true,
            content_state: 'filled',
            'unlock.duration_ms': 1_400,
            'unlock.stage.credential_decrypt_ms': 40,
            'unlock.stage.vault_unlock_ms': 460,
            'unlock.stage.unlock_finalize_ms': 80,
            'unlock.stage.home_visible_ms': 300,
            'unlock.stage.homepage_content_ms': 500,
            'unlock.unattributed_ms': 20,
          },
        },
        stages.map(([name, start, end]) => ({
          name,
          op: TraceOperation.UnlockStage,
          startTime: MOCK_OFFSET + start,
          endTime: MOCK_OFFSET + end,
          tags: COLD_TAGS,
        })),
      );
    });

    it('marks an error homepage as unsuccessful', () => {
      startUnlockToHomepageReady(keychainUnlock());
      reachHome();

      finishAt(2_000, 'error');

      expect(getRootData()).toEqual(
        expect.objectContaining({ success: false, content_state: 'error' }),
      );
    });

    it('lets the startup recorder send once the unlock is sent', () => {
      startUnlockToHomepageReady(keychainUnlock());
      reachHome();

      finishAt(2_000);

      expect(mockNoteLeg2Ended).toHaveBeenCalledTimes(1);
      expect(mockRemoveAppStateListener).toHaveBeenCalledTimes(1);
    });

    it('sends each unlock once', () => {
      startUnlockToHomepageReady(keychainUnlock());
      reachHome();
      finishAt(2_000);
      mockSend.mockClear();

      finishAt(2_500);

      expect(mockSend).not.toHaveBeenCalled();
    });

    it('does nothing when no unlock is in flight', () => {
      const stop = startUnlockStage('vault_unlock');
      recordUnlockStage('credential_decrypt', 1_000, 1_040);
      markUnlockNavigate();

      expect(markUnlockHomeFocused()).toBeNull();
      runAt(1_500, stop);
      finishAt(2_000);

      expect(mockSend).not.toHaveBeenCalled();
    });

    it('logs instead of throwing when sending fails', () => {
      const error = new Error('Sentry failed');
      mockSend.mockImplementation(() => {
        throw error;
      });
      startUnlockToHomepageReady(keychainUnlock());
      reachHome();

      expect(() => finishAt(2_000)).not.toThrow();
      expect(mockLoggerError).toHaveBeenCalledWith(
        error,
        'Unlock To Homepage Ready failed',
      );
    });
  });

  describe('reaching the homepage', () => {
    it('waits until the unlock navigated and the homepage was focused', () => {
      startUnlockToHomepageReady(keychainUnlock());

      finishAt(1_500);
      runAt(1_600, markUnlockNavigate);
      finishAt(1_700);

      expect(mockSend).not.toHaveBeenCalled();

      runAt(1_800, markUnlockHomeFocused);
      finishAt(2_000);

      expect(mockSend).toHaveBeenCalled();
    });

    it('counts the homepage as focused only once the unlock navigated, keeping the first marks', () => {
      startUnlockToHomepageReady(keychainUnlock());

      expect(runAt(1_100, markUnlockHomeFocused)).toBeNull();
      runAt(1_200, markUnlockNavigate);
      runAt(1_250, markUnlockNavigate);
      expect(runAt(1_400, markUnlockHomeFocused)).toBe(1);
      runAt(1_450, markUnlockHomeFocused);
      finishAt(1_600);

      expect(getRootData()).toEqual(
        expect.objectContaining({
          'unlock.stage.home_visible_ms': 200,
          'unlock.stage.homepage_content_ms': 200,
        }),
      );
    });
  });

  describe('starting', () => {
    it('starts a keychain unlock when the keychain returns, and tells the startup recorder', () => {
      const token = startUnlockToHomepageReady(keychainUnlock());

      expect(token).toBe(1);
      expect(mockNoteHandBack).toHaveBeenCalledWith(1_000, {
        leg2Started: true,
        leg2InFlight: true,
      });
    });

    it('starts a typed unlock at the submit and times it until unlockWallet was called', () => {
      startUnlockToHomepageReady(
        keychainUnlock({
          handBack: { source: 'typed', submittedAt: 900 },
          unlockEnteredAt: 930,
        }),
      );
      reachHome();

      finishAt(2_000);

      expect(getSentTransaction()?.startTime).toBe(MOCK_OFFSET + 900);
      expect(getRootData()).toEqual(
        expect.objectContaining({
          'unlock.duration_ms': 1_100,
          'unlock.stage.submit_to_unlock_ms': 30,
        }),
      );
    });

    it('starts a typed unlock without a submit time when unlockWallet was called', () => {
      startUnlockToHomepageReady(
        keychainUnlock({
          handBack: { source: 'typed' },
          unlockEnteredAt: 930,
        }),
      );
      reachHome();

      finishAt(2_000);

      expect(getRootData()).toEqual({
        success: true,
        content_state: 'filled',
        'unlock.duration_ms': 1_070,
        'unlock.stage.home_visible_ms': 300,
        'unlock.stage.homepage_content_ms': 100,
        'unlock.unattributed_ms': 670,
      });
    });

    it('tags unlocks that run onBeforeNavigate', () => {
      startUnlockToHomepageReady(keychainUnlock({ beforeNavigate: true }));
      reachHome();

      finishAt(2_000);

      expect(getSentTransaction()?.tags).toEqual({
        ...COLD_TAGS,
        'unlock.before_navigate': true,
      });
    });

    it('tags later unlocks in the same JS runtime warm, without the startup kind', () => {
      startUnlockToHomepageReady(keychainUnlock());
      markUnlockCompleted();
      startUnlockToHomepageReady(keychainUnlock());
      reachHome();

      finishAt(2_000);

      expect(getSentTransaction()?.tags).toEqual({
        app_start_type: 'warm',
        'unlock.before_navigate': false,
      });
    });

    it('keeps the next attempt cold after a failed unlock', () => {
      const token = startUnlockToHomepageReady(keychainUnlock());
      dropUnlockToHomepageReady('unlock_failed', token);
      startUnlockToHomepageReady(keychainUnlock());
      reachHome();

      finishAt(2_000);

      expect(getSentTransaction()?.tags).toEqual(COLD_TAGS);
    });

    it('does not record rehydrating a wallet onto a new device', () => {
      const token = startUnlockToHomepageReady(
        keychainUnlock({ existingUser: false }),
      );
      reachHome();

      finishAt(2_000);

      expect(token).toBeNull();
      expect(mockSend).not.toHaveBeenCalled();
      expect(mockNoteHandBack).toHaveBeenCalledWith(1_000, {
        leg2Started: false,
        leg2InFlight: false,
      });
    });

    it('replaces an unlock that is still in flight', () => {
      const first = startUnlockToHomepageReady(keychainUnlock());
      runAt(1_200, markUnlockNavigate);
      const second = startUnlockToHomepageReady(keychainUnlock());

      dropUnlockToHomepageReady('navigated_away', first);
      reachHome();
      finishAt(2_000);

      expect(second).toBe(2);
      expect(mockNoteLeg2Ended).toHaveBeenCalledTimes(2);
      expect(getRootData()).toEqual(
        expect.objectContaining({ 'unlock.stage.home_visible_ms': 300 }),
      );
    });
  });

  describe('stages', () => {
    it('keeps the first record of a stage and skips incomplete or negative ones', () => {
      startUnlockToHomepageReady(
        keychainUnlock({
          handBack: { source: 'typed' },
          unlockEnteredAt: 1_000,
        }),
      );
      recordUnlockStage('seedless_password_check', 1_000, undefined);
      recordUnlockStage('seedless_password_sync', undefined, 1_100);
      recordUnlockStage('before_navigate', 1_300, 1_200);
      recordUnlockStage('vault_unlock', 1_000, 1_300);
      recordUnlockStage('vault_unlock', 1_000, 1_500);
      reachHome();

      finishAt(2_000);

      expect(getRootData()).toEqual({
        success: true,
        content_state: 'filled',
        'unlock.duration_ms': 1_000,
        'unlock.stage.vault_unlock_ms': 300,
        'unlock.stage.home_visible_ms': 300,
        'unlock.stage.homepage_content_ms': 100,
        'unlock.unattributed_ms': 300,
      });
    });

    it('keeps the first stop of a stage timer', () => {
      startUnlockToHomepageReady(keychainUnlock());
      const stop = runAt(1_040, () => startUnlockStage('seedless_rehydrate'));
      runAt(1_300, stop);
      runAt(1_500, stop);
      reachHome();

      finishAt(2_000);

      expect(getRootData()).toEqual(
        expect.objectContaining({ 'unlock.stage.seedless_rehydrate_ms': 260 }),
      );
    });

    it('ignores a stage timer that stops after its unlock was dropped', () => {
      const token = startUnlockToHomepageReady(keychainUnlock());
      const stop = runAt(1_040, () => startUnlockStage('vault_unlock'));
      dropUnlockToHomepageReady('unlock_failed', token);
      startUnlockToHomepageReady(keychainUnlock());

      runAt(1_300, stop);
      reachHome();
      finishAt(2_000);

      expect(getRootData()).not.toHaveProperty([
        'unlock.stage.vault_unlock_ms',
      ]);
    });
  });

  describe('dropping', () => {
    it('drops the unlock the token belongs to, and lets the startup recorder send', () => {
      const token = startUnlockToHomepageReady(keychainUnlock());

      dropUnlockToHomepageReady('metrics_opt_in', token);
      reachHome();
      finishAt(2_000);

      expect(mockSend).not.toHaveBeenCalled();
      expect(mockNoteLeg2Ended).toHaveBeenCalledTimes(1);
      expect(mockRemoveAppStateListener).toHaveBeenCalledTimes(1);
    });

    it.each([
      { token: 'another unlock', value: 2 },
      { token: 'no unlock', value: null },
    ])('keeps the unlock when the token is for $token', ({ value }) => {
      startUnlockToHomepageReady(keychainUnlock());

      dropUnlockToHomepageReady('unlock_failed', value);
      reachHome();
      finishAt(2_000);

      expect(mockSend).toHaveBeenCalled();
    });

    it('drops the unlock when the focused homepage is left before its content is usable', () => {
      startUnlockToHomepageReady(keychainUnlock());
      const token = reachHome();

      dropUnlockToHomepageReady('navigated_away', token);
      finishAt(2_000);

      expect(mockSend).not.toHaveBeenCalled();
    });

    it('drops the unlock when the app goes to the background', () => {
      startUnlockToHomepageReady(keychainUnlock());

      appStateListener?.('background');
      reachHome();
      finishAt(2_000);

      expect(mockSend).not.toHaveBeenCalled();
      expect(mockRemoveAppStateListener).toHaveBeenCalledTimes(1);
    });

    it('keeps the unlock while the app is only inactive', () => {
      startUnlockToHomepageReady(keychainUnlock());

      appStateListener?.('inactive');
      appStateListener?.('active');
      reachHome();
      finishAt(2_000);

      expect(mockSend).toHaveBeenCalled();
    });

    it('drops the unlock when a deeplink was pending at the hand-back', () => {
      mockAppStateEventProcessor.pendingDeeplink =
        'https://link.metamask.io/swap';
      startUnlockToHomepageReady(keychainUnlock());
      // `handleDeeplinkSaga` takes the live link during `dispatchLogin`.
      mockAppStateEventProcessor.pendingDeeplink = null;

      dropUnlockToHomepageReadyForDeeplink();
      reachHome();
      finishAt(2_000);

      expect(mockSend).not.toHaveBeenCalled();
    });

    it('drops the unlock when a deeplink arrived after the hand-back', () => {
      startUnlockToHomepageReady(keychainUnlock());
      mockAppStateEventProcessor.pendingDeeplink =
        'https://link.metamask.io/swap';

      dropUnlockToHomepageReadyForDeeplink();
      reachHome();
      finishAt(2_000);

      expect(mockSend).not.toHaveBeenCalled();
    });

    it('keeps the unlock when no deeplink is pending', () => {
      startUnlockToHomepageReady(keychainUnlock());

      dropUnlockToHomepageReadyForDeeplink();
      reachHome();
      finishAt(2_000);

      expect(mockSend).toHaveBeenCalled();
    });
  });

  describe('summary', () => {
    const devGlobal = global as unknown as { __DEV__: boolean };
    const isDev = devGlobal.__DEV__;

    afterEach(() => {
      devGlobal.__DEV__ = isDev;
    });

    it('prints the stages in dev builds', () => {
      devGlobal.__DEV__ = true;
      startUnlockToHomepageReady(keychainUnlock());
      timeStage('vault_unlock', 1_040, 1_500);
      reachHome();

      finishAt(2_400);

      expect(mockLoggerLog).toHaveBeenCalledTimes(1);
      const [summary] = mockLoggerLog.mock.calls[0];
      expect(summary).toContain(
        '[unlock] Unlock To Homepage Ready: 1400ms (app_start_type: cold, content: filled)',
      );
      expect(summary).toContain('\n  vault_unlock: 460ms');
      expect(summary).toContain('\n  unattributed: 100ms');
    });

    it('prints why an unlock was dropped in dev builds', () => {
      devGlobal.__DEV__ = true;
      const token = startUnlockToHomepageReady(keychainUnlock());

      dropUnlockToHomepageReady('metrics_opt_in', token);

      expect(mockLoggerLog).toHaveBeenCalledWith(
        '[unlock] Unlock To Homepage Ready dropped: metrics_opt_in',
      );
    });

    it('prints nothing in release builds', () => {
      devGlobal.__DEV__ = false;
      const token = startUnlockToHomepageReady(keychainUnlock());
      reachHome();
      finishAt(2_000);
      dropUnlockToHomepageReady('metrics_opt_in', token);

      expect(mockLoggerLog).not.toHaveBeenCalled();
    });
  });
});

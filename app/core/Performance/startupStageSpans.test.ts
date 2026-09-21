import { endTrace, trace, TraceName } from '../../util/trace';
import Logger from '../../util/Logger';
import {
  endAppStartToUnlockLaidOut,
  endControllerStateRehydration,
  endPostInitGap,
  endSplashRevealTax,
  resetStartupStageSpansForTesting,
  startAppStartToUnlockLaidOut,
  startControllerStateRehydration,
  startPostInitGap,
  startSplashRevealTax,
} from './startupStageSpans';

jest.mock('../../util/trace', () => ({
  ...jest.requireActual('../../util/trace'),
  trace: jest.fn(),
  endTrace: jest.fn(),
}));

jest.mock('.', () => ({
  Performance: { appLaunchTime: 1_700_000_000_000 },
}));

jest.mock('./UIStartup', () => ({
  __esModule: true,
  default: jest.fn(() => undefined),
}));

jest.mock('../../util/Logger', () => ({
  __esModule: true,
  default: { error: jest.fn(), log: jest.fn() },
}));

const mockTrace = trace as jest.Mock;
const mockEndTrace = endTrace as jest.Mock;

describe('startupStageSpans', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetStartupStageSpansForTesting();
  });

  describe('post-init gap', () => {
    it('opens and closes the span once', () => {
      startPostInitGap();
      endPostInitGap();

      expect(mockTrace).toHaveBeenCalledTimes(1);
      expect(mockTrace).toHaveBeenCalledWith(
        expect.objectContaining({ name: TraceName.PostInitGap }),
      );
      expect(mockEndTrace).toHaveBeenCalledTimes(1);
    });

    it('does not reopen on a second start', () => {
      // A remount must not restart a once-per-launch measurement.
      startPostInitGap();
      startPostInitGap();

      expect(mockTrace).toHaveBeenCalledTimes(1);
    });

    it('does not close twice', () => {
      startPostInitGap();
      endPostInitGap();
      endPostInitGap();

      expect(mockEndTrace).toHaveBeenCalledTimes(1);
    });

    it('does not close a span that never opened', () => {
      // Ending an unopened span would emit a stray measurement.
      endPostInitGap();

      expect(mockEndTrace).not.toHaveBeenCalled();
    });
  });

  describe('app start to unlock laid out', () => {
    it('anchors the span on the native launch timestamp', () => {
      // Anchoring on `Date.now()` would silently exclude everything before the
      // component mounted, which is most of the window being measured.
      startAppStartToUnlockLaidOut();

      expect(mockTrace).toHaveBeenCalledWith(
        expect.objectContaining({
          name: TraceName.AppStartToUnlockLaidOut,
          startTime: 1_700_000_000_000,
        }),
      );
    });

    it('opens at most once per launch', () => {
      // The span is anchored on process start, so a second open after a
      // mid-session re-lock would measure the whole session, not cold start.
      startAppStartToUnlockLaidOut();
      startAppStartToUnlockLaidOut();

      expect(mockTrace).toHaveBeenCalledTimes(1);
    });

    it('does not close a span that never opened', () => {
      endAppStartToUnlockLaidOut();

      expect(mockEndTrace).not.toHaveBeenCalled();
    });

    it('closes only on the first native layout', () => {
      // `onLayout` fires repeatedly; only the first is the moment the field
      // finished laying out and could accept input.
      startAppStartToUnlockLaidOut();
      endAppStartToUnlockLaidOut();
      endAppStartToUnlockLaidOut();
      endAppStartToUnlockLaidOut();

      expect(mockEndTrace).toHaveBeenCalledTimes(1);
      expect(mockEndTrace).toHaveBeenCalledWith(
        expect.objectContaining({
          name: TraceName.AppStartToUnlockLaidOut,
        }),
      );
    });
  });

  describe('splash reveal tax', () => {
    it('opens and closes the span once', () => {
      startSplashRevealTax();
      endSplashRevealTax();

      expect(mockTrace).toHaveBeenCalledWith(
        expect.objectContaining({ name: TraceName.SplashRevealTax }),
      );
      expect(mockEndTrace).toHaveBeenCalledTimes(1);
    });

    it('does not reopen on a second start', () => {
      // `trace()` finishes a pending span that shares its key at a capped
      // timestamp, so an unguarded remount emits a spurious span rather than
      // being harmless.
      startSplashRevealTax();
      startSplashRevealTax();

      expect(mockTrace).toHaveBeenCalledTimes(1);
    });

    it('does not close twice', () => {
      startSplashRevealTax();
      endSplashRevealTax();
      endSplashRevealTax();

      expect(mockEndTrace).toHaveBeenCalledTimes(1);
    });

    it('does not close a span that never opened', () => {
      endSplashRevealTax();

      expect(mockEndTrace).not.toHaveBeenCalled();
    });
  });

  describe('controller state rehydration', () => {
    it('opens and closes the span once', () => {
      startControllerStateRehydration();
      endControllerStateRehydration();

      expect(mockTrace).toHaveBeenCalledWith(
        expect.objectContaining({
          name: TraceName.ControllerStateRehydration,
        }),
      );
      expect(mockEndTrace).toHaveBeenCalledTimes(1);
    });

    it('does not reopen on a second start', () => {
      startControllerStateRehydration();
      startControllerStateRehydration();

      expect(mockTrace).toHaveBeenCalledTimes(1);
    });

    it('does not close a span that never opened', () => {
      endControllerStateRehydration();

      expect(mockEndTrace).not.toHaveBeenCalled();
    });
  });

  describe('throw safety', () => {
    // These spans sit on the critical path: rehydration opens immediately
    // before `getAllPersistedState()`, and the splash span closes inside the
    // callback that reveals the UI. A throw from the tracing layer must cost a
    // measurement, never the launch.
    const starters: [string, () => void][] = [
      ['startControllerStateRehydration', startControllerStateRehydration],
      ['startPostInitGap', startPostInitGap],
      ['startSplashRevealTax', startSplashRevealTax],
      ['startAppStartToUnlockLaidOut', startAppStartToUnlockLaidOut],
    ];

    it.each(starters)('%s swallows a throwing trace()', (_name, start) => {
      mockTrace.mockImplementation(() => {
        throw new Error('sentry exploded');
      });

      expect(() => start()).not.toThrow();
      expect(Logger.error).toHaveBeenCalled();
    });

    const enders: [string, () => void, () => void][] = [
      [
        'endControllerStateRehydration',
        startControllerStateRehydration,
        endControllerStateRehydration,
      ],
      ['endPostInitGap', startPostInitGap, endPostInitGap],
      ['endSplashRevealTax', startSplashRevealTax, endSplashRevealTax],
      [
        'endAppStartToUnlockLaidOut',
        startAppStartToUnlockLaidOut,
        endAppStartToUnlockLaidOut,
      ],
    ];

    it.each(enders)(
      '%s swallows a throwing endTrace()',
      (_name, start, end) => {
        start();
        mockEndTrace.mockImplementation(() => {
          throw new Error('sentry exploded');
        });

        expect(() => end()).not.toThrow();
        expect(Logger.error).toHaveBeenCalled();
      },
    );
  });
});

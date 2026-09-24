import { endTrace, trace, TraceName } from '../../util/trace';
import Logger from '../../util/Logger';
import {
  endAppStartToUnlockLaidOut,
  endControllerStateRehydration,
  endPostInitGap,
  endRootNavigatorFirstRender,
  endSplashRevealTax,
  resetStartupStageSpansForTesting,
  startAppStartToUnlockLaidOut,
  startControllerStateRehydration,
  startPostInitGap,
  startRootNavigatorFirstRender,
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

const MOCK_UI_STARTUP_SPAN = { name: 'mock-ui-startup-span' };
jest.mock('./UIStartup', () => ({
  __esModule: true,
  default: jest.fn(() => MOCK_UI_STARTUP_SPAN),
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

    it('nests under UIStartup rather than becoming a root transaction', () => {
      // A root span is sampled independently, never appears in the UIStartup
      // tree, and is dropped by `excludeEvents` if it times out instead of
      // being kept as a child carrying `trace.timed_out`.
      startPostInitGap();

      expect(mockTrace).toHaveBeenCalledWith(
        expect.objectContaining({
          name: TraceName.PostInitGap,
          parentContext: MOCK_UI_STARTUP_SPAN,
        }),
      );
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

  describe('root navigator first render', () => {
    it('opens and closes the span once, nested under UIStartup', () => {
      startRootNavigatorFirstRender();
      endRootNavigatorFirstRender();

      expect(mockTrace).toHaveBeenCalledWith(
        expect.objectContaining({
          name: TraceName.RootNavigatorFirstRender,
          parentContext: MOCK_UI_STARTUP_SPAN,
        }),
      );
      expect(mockEndTrace).toHaveBeenCalledTimes(1);
    });

    it('does not reopen on a second render', () => {
      startRootNavigatorFirstRender();
      startRootNavigatorFirstRender();

      expect(mockTrace).toHaveBeenCalledTimes(1);
    });

    it('does not close a span that never opened', () => {
      endRootNavigatorFirstRender();

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
      // Load-bearing: this one runs during render, so an escaping throw would
      // take AppFlow — and therefore the whole navigator — down with it.
      ['startRootNavigatorFirstRender', startRootNavigatorFirstRender],
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
        'endRootNavigatorFirstRender',
        startRootNavigatorFirstRender,
        endRootNavigatorFirstRender,
      ],
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

import { endTrace, trace, TraceName } from '../../util/trace';
import {
  endAppStartToUnlockInteractive,
  endPostInitGap,
  resetStartupStageSpansForTesting,
  startAppStartToUnlockInteractive,
  startPostInitGap,
} from './startupStageSpans';

jest.mock('../../util/trace', () => ({
  ...jest.requireActual('../../util/trace'),
  trace: jest.fn(),
  endTrace: jest.fn(),
}));

jest.mock('.', () => ({
  Performance: { appLaunchTime: 1_700_000_000_000 },
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

  describe('app start to unlock interactive', () => {
    it('anchors the span on the native launch timestamp', () => {
      // Anchoring on `Date.now()` would silently exclude everything before the
      // component mounted, which is most of the window being measured.
      startAppStartToUnlockInteractive();

      expect(mockTrace).toHaveBeenCalledWith(
        expect.objectContaining({
          name: TraceName.AppStartToUnlockInteractive,
          startTime: 1_700_000_000_000,
        }),
      );
    });

    it('closes only on the first native layout', () => {
      // `onLayout` fires repeatedly; only the first is the moment the field
      // became interactive.
      startAppStartToUnlockInteractive();
      endAppStartToUnlockInteractive();
      endAppStartToUnlockInteractive();
      endAppStartToUnlockInteractive();

      expect(mockEndTrace).toHaveBeenCalledTimes(1);
      expect(mockEndTrace).toHaveBeenCalledWith(
        expect.objectContaining({
          name: TraceName.AppStartToUnlockInteractive,
        }),
      );
    });
  });
});

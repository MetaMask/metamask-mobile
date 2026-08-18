import { endTrace, trace, TraceName, TraceOperation } from '../../util/trace';
import { AppStateEventProcessor } from '../AppStateEventListener';
import {
  cancelDeeplinkReadyTrace,
  endDeeplinkReadyTrace,
  isDeeplinkReadyTraceActive,
  resetDeeplinkReadyTraceForTesting,
  startDeeplinkReadyTrace,
} from './DeeplinkReady';

jest.mock('../../util/trace', () => ({
  trace: jest.fn(),
  endTrace: jest.fn(),
  TraceName: {
    DeeplinkReady: 'Deeplink Ready',
  },
  TraceOperation: {
    DeeplinkPerformance: 'deeplink.performance',
  },
  TRACES_CLEANUP_INTERVAL: 5 * 60 * 1000,
}));

jest.mock('../AppStateEventListener', () => ({
  AppStateEventProcessor: {
    isColdStartSession: true,
    pendingDeeplink: null as string | null,
  },
}));

const mockTrace = jest.mocked(trace);
const mockEndTrace = jest.mocked(endTrace);
const mockAppState = AppStateEventProcessor as unknown as {
  isColdStartSession: boolean;
  pendingDeeplink: string | null;
};

describe('DeeplinkReady', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetDeeplinkReadyTraceForTesting();
    mockAppState.isColdStartSession = true;
    mockAppState.pendingDeeplink = 'https://link.metamask.io/trending';
  });

  describe('startDeeplinkReadyTrace', () => {
    it('starts an already-unlocked launch from the native launch timestamp', () => {
      const startTime = 1_723_456_789_000;

      const token = startDeeplinkReadyTrace({
        source: 'app_open',
        appStartType: 'cold',
        startTime,
      });

      expect(token).not.toBeNull();
      expect(mockTrace).toHaveBeenCalledWith({
        name: TraceName.DeeplinkReady,
        op: TraceOperation.DeeplinkPerformance,
        startTime,
        forceTransaction: true,
        tags: {
          start_source: 'app_open',
          app_start_type: 'cold',
          deeplink_route: 'trending',
        },
      });
      expect(isDeeplinkReadyTraceActive()).toBe(true);
    });

    it('omits startTime for an unlock, so the span measures from submit', () => {
      startDeeplinkReadyTrace({ source: 'unlock', appStartType: 'cold' });

      expect(mockTrace.mock.calls[0][0]).not.toHaveProperty('startTime');
      expect(mockTrace).toHaveBeenCalledWith(
        expect.objectContaining({
          tags: expect.objectContaining({ start_source: 'unlock' }),
        }),
      );
    });

    it('reads the route from a custom-scheme deeplink', () => {
      mockAppState.pendingDeeplink = 'metamask://trending?tab=crypto';

      startDeeplinkReadyTrace({ source: 'unlock', appStartType: 'cold' });

      expect(mockTrace).toHaveBeenCalledWith(
        expect.objectContaining({
          tags: expect.objectContaining({ deeplink_route: 'trending' }),
        }),
      );
    });

    it.each([
      ['no pending deeplink', null],
      ['a route with no content marker', 'https://link.metamask.io/swap'],
      ['an unparsable deeplink', 'not a url'],
    ])('does not start for %s', (_label, pendingDeeplink) => {
      mockAppState.pendingDeeplink = pendingDeeplink;

      const token = startDeeplinkReadyTrace({
        source: 'unlock',
        appStartType: 'cold',
      });

      expect(token).toBeNull();
      expect(mockTrace).not.toHaveBeenCalled();
      expect(isDeeplinkReadyTraceActive()).toBe(false);
    });

    it('does not start outside the launch session', () => {
      mockAppState.isColdStartSession = false;

      expect(
        startDeeplinkReadyTrace({ source: 'unlock', appStartType: 'cold' }),
      ).toBeNull();
      expect(mockTrace).not.toHaveBeenCalled();
    });

    it('lets a second entry point call in without replacing the open span', () => {
      startDeeplinkReadyTrace({ source: 'unlock', appStartType: 'cold' });

      const second = startDeeplinkReadyTrace({
        source: 'app_open',
        appStartType: 'cold',
      });

      expect(second).toBeNull();
      expect(mockTrace).toHaveBeenCalledTimes(1);
    });
  });

  describe('endDeeplinkReadyTrace', () => {
    it('ends a filled destination successfully', () => {
      startDeeplinkReadyTrace({ source: 'unlock', appStartType: 'cold' });

      endDeeplinkReadyTrace({ route: 'trending', contentState: 'filled' });

      expect(mockEndTrace).toHaveBeenCalledWith({
        name: TraceName.DeeplinkReady,
        data: {
          success: true,
          content_state: 'filled',
          deeplink_route: 'trending',
        },
      });
      expect(isDeeplinkReadyTraceActive()).toBe(false);
    });

    it('treats an empty destination as a completed flow', () => {
      startDeeplinkReadyTrace({ source: 'unlock', appStartType: 'cold' });

      endDeeplinkReadyTrace({ route: 'trending', contentState: 'empty' });

      expect(mockEndTrace).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            success: true,
            content_state: 'empty',
          }),
        }),
      );
    });

    it('reports an error state as a failure', () => {
      startDeeplinkReadyTrace({ source: 'unlock', appStartType: 'cold' });

      endDeeplinkReadyTrace({ route: 'trending', contentState: 'error' });

      expect(mockEndTrace).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            success: false,
            content_state: 'error',
          }),
        }),
      );
    });

    it('ignores a route other than the one being measured', () => {
      startDeeplinkReadyTrace({ source: 'unlock', appStartType: 'cold' });

      endDeeplinkReadyTrace({ route: 'rewards', contentState: 'filled' });

      expect(mockEndTrace).not.toHaveBeenCalled();
      expect(isDeeplinkReadyTraceActive()).toBe(true);
    });

    it('is a no-op when no span is open', () => {
      endDeeplinkReadyTrace({ route: 'trending', contentState: 'filled' });

      expect(mockEndTrace).not.toHaveBeenCalled();
    });
  });

  describe('cancelDeeplinkReadyTrace', () => {
    it('ends the span as a failure with a reason', () => {
      startDeeplinkReadyTrace({ source: 'unlock', appStartType: 'cold' });

      cancelDeeplinkReadyTrace({ reason: 'rejected' });

      expect(mockEndTrace).toHaveBeenCalledWith({
        name: TraceName.DeeplinkReady,
        data: {
          success: false,
          reason: 'rejected',
          deeplink_route: 'trending',
        },
      });
      expect(isDeeplinkReadyTraceActive()).toBe(false);
    });

    it('only cancels the span its token belongs to', () => {
      const token = startDeeplinkReadyTrace({
        source: 'unlock',
        appStartType: 'cold',
      });

      cancelDeeplinkReadyTrace({
        reason: 'unlock_failed',
        traceToken: (token as number) + 1,
      });

      expect(mockEndTrace).not.toHaveBeenCalled();
      expect(isDeeplinkReadyTraceActive()).toBe(true);

      cancelDeeplinkReadyTrace({ reason: 'unlock_failed', traceToken: token });

      expect(mockEndTrace).toHaveBeenCalledTimes(1);
    });

    it('does nothing when no span is open', () => {
      cancelDeeplinkReadyTrace({ reason: 'error' });

      expect(mockEndTrace).not.toHaveBeenCalled();
    });

    it('releases the guard so a retry can start its own span', () => {
      startDeeplinkReadyTrace({ source: 'unlock', appStartType: 'cold' });
      cancelDeeplinkReadyTrace({ reason: 'unlock_failed' });

      const retry = startDeeplinkReadyTrace({
        source: 'unlock',
        appStartType: 'cold',
      });

      expect(retry).not.toBeNull();
      expect(mockTrace).toHaveBeenCalledTimes(2);
    });
  });
});

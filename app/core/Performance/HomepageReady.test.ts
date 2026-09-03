import { endTrace, trace, TraceName, TraceOperation } from '../../util/trace';
import {
  cancelHomepageReadyTrace,
  endHomepageReadyTrace,
  isHomepageReadyTraceActive,
  queueColdHomepageReadyTrace,
  resetHomepageReadyTraceForTesting,
  resolveColdHomepageReadyTrace,
  startHomepageReadyTrace,
} from './HomepageReady';

jest.mock('../../util/trace', () => ({
  trace: jest.fn(),
  endTrace: jest.fn(),
  TraceName: {
    HomepageReady: 'Homepage Ready',
  },
  TraceOperation: {
    HomepagePerformance: 'homepage.performance',
  },
  TRACES_CLEANUP_INTERVAL: 5 * 60 * 1000,
}));

const mockTrace = jest.mocked(trace);
const mockEndTrace = jest.mocked(endTrace);

describe('HomepageReady', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetHomepageReadyTraceForTesting();
  });

  it('starts the cold app-open trace from the native launch timestamp', () => {
    const startTime = 1_723_456_789_000;

    startHomepageReadyTrace({
      source: 'app_open',
      appStartType: 'cold',
      startTime,
    });

    expect(mockTrace).toHaveBeenCalledWith({
      name: TraceName.HomepageReady,
      op: TraceOperation.HomepagePerformance,
      startTime,
      tags: {
        start_source: 'app_open',
        app_start_type: 'cold',
      },
    });
  });

  it('keeps the first entry point while a trace is active', () => {
    startHomepageReadyTrace({
      source: 'app_open',
      appStartType: 'cold',
    });

    startHomepageReadyTrace({
      source: 'unlock',
      appStartType: 'cold',
    });

    expect(mockTrace).toHaveBeenCalledTimes(1);
  });

  it('reports whether a trace is active', () => {
    expect(isHomepageReadyTraceActive()).toBe(false);

    startHomepageReadyTrace({
      source: 'app_open',
      appStartType: 'cold',
    });
    expect(isHomepageReadyTraceActive()).toBe(true);

    endHomepageReadyTrace({ contentState: 'filled' });
    expect(isHomepageReadyTraceActive()).toBe(false);
  });

  it('ends an active trace with the rendered content state', () => {
    startHomepageReadyTrace({
      source: 'unlock',
      appStartType: 'warm',
    });

    endHomepageReadyTrace({ contentState: 'filled' });

    expect(mockEndTrace).toHaveBeenCalledWith({
      name: TraceName.HomepageReady,
      data: {
        success: true,
        content_state: 'filled',
      },
    });
  });

  it('does not end a trace that was never started', () => {
    endHomepageReadyTrace({ contentState: 'empty' });

    expect(mockEndTrace).not.toHaveBeenCalled();
  });

  it('ends a failed unlock and allows its retry to start a new trace', () => {
    const traceToken = startHomepageReadyTrace({
      source: 'unlock',
      appStartType: 'warm',
    });

    cancelHomepageReadyTrace({ reason: 'unlock_failed', traceToken });
    startHomepageReadyTrace({
      source: 'unlock',
      appStartType: 'warm',
    });

    expect(mockEndTrace).toHaveBeenCalledWith({
      name: TraceName.HomepageReady,
      data: {
        success: false,
        reason: 'unlock_failed',
      },
    });
    expect(mockTrace).toHaveBeenCalledTimes(2);
  });

  it('keeps an active app-open trace when a blocked unlock fails', () => {
    startHomepageReadyTrace({
      source: 'app_open',
      appStartType: 'warm',
    });
    const blockedUnlockToken = startHomepageReadyTrace({
      source: 'unlock',
      appStartType: 'warm',
    });

    cancelHomepageReadyTrace({
      reason: 'unlock_failed',
      traceToken: blockedUnlockToken,
    });

    expect(mockEndTrace).not.toHaveBeenCalled();
    expect(isHomepageReadyTraceActive()).toBe(true);
  });

  it('starts a queued cold trace when the homepage is focused', () => {
    const startTime = 1_723_456_789_000;
    queueColdHomepageReadyTrace(startTime);

    resolveColdHomepageReadyTrace({ isHomepageFocused: true });

    expect(mockTrace).toHaveBeenCalledWith({
      name: TraceName.HomepageReady,
      op: TraceOperation.HomepagePerformance,
      startTime,
      tags: {
        start_source: 'app_open',
        app_start_type: 'cold',
      },
    });
  });

  it('discards a queued cold trace when the homepage is unfocused', () => {
    queueColdHomepageReadyTrace(1_723_456_789_000);

    resolveColdHomepageReadyTrace({ isHomepageFocused: false });
    resolveColdHomepageReadyTrace({ isHomepageFocused: true });

    expect(mockTrace).not.toHaveBeenCalled();
  });

  it('does not queue a cold trace while an unlock trace is active', () => {
    startHomepageReadyTrace({
      source: 'unlock',
      appStartType: 'cold',
    });
    queueColdHomepageReadyTrace(1_723_456_789_000);
    endHomepageReadyTrace({ contentState: 'filled' });

    resolveColdHomepageReadyTrace({ isHomepageFocused: true });

    expect(mockTrace).toHaveBeenCalledTimes(1);
  });

  it('marks a rendered error state as unsuccessful', () => {
    startHomepageReadyTrace({
      source: 'unlock',
      appStartType: 'warm',
    });

    endHomepageReadyTrace({ contentState: 'error' });

    expect(mockEndTrace).toHaveBeenCalledWith({
      name: TraceName.HomepageReady,
      data: {
        success: false,
        content_state: 'error',
      },
    });
  });
});

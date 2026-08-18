import { setMeasurement } from '@sentry/react-native';
import performance from 'react-native-performance';
import {
  endTrace,
  getTraceContext,
  trace,
  TraceName,
  TraceOperation,
} from '../../util/trace';
import {
  AUTHENTICATION_END_TO_HOMEPAGE_READY_MS,
  cancelHomepageReadyTrace,
  endHomepageReadyTrace,
  isHomepageReadyTraceActive,
  markHomepageAuthenticationEnd,
  queueColdHomepageReadyTrace,
  resetHomepageReadyTraceForTesting,
  resolveColdHomepageReadyTrace,
  startHomepageReadyTrace,
  subscribeHomepageReadyCompletion,
} from './HomepageReady';

jest.mock('../../util/trace', () => ({
  trace: jest.fn(),
  endTrace: jest.fn(),
  getTraceContext: jest.fn(),
  TraceName: {
    HomepageReady: 'Homepage Ready',
  },
  TraceOperation: {
    HomepagePerformance: 'homepage.performance',
  },
  TRACES_CLEANUP_INTERVAL: 5 * 60 * 1000,
}));

jest.mock('@sentry/react-native', () => ({
  setMeasurement: jest.fn(),
}));

jest.mock('react-native-performance', () => ({
  __esModule: true,
  default: {
    now: jest.fn(() => 1000),
  },
}));

const mockTrace = jest.mocked(trace);
const mockEndTrace = jest.mocked(endTrace);
const mockGetTraceContext = jest.mocked(getTraceContext);
const mockSetMeasurement = jest.mocked(setMeasurement);
const homepageReadySpan = { spanId: 'homepage-ready-span' };

describe('HomepageReady', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetHomepageReadyTraceForTesting();
    jest.mocked(performance.now).mockReturnValue(1000);
    mockGetTraceContext.mockReturnValue(homepageReadySpan as never);
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

  it('measures authentication-end to Homepage Ready on a successful unlock', () => {
    const token = startHomepageReadyTrace({
      source: 'unlock',
      appStartType: 'warm',
    });
    jest.mocked(performance.now).mockReturnValue(400);
    markHomepageAuthenticationEnd(token);
    jest.mocked(performance.now).mockReturnValue(650);

    endHomepageReadyTrace({ contentState: 'filled' });

    expect(mockGetTraceContext).toHaveBeenCalledWith({
      name: TraceName.HomepageReady,
    });
    expect(mockSetMeasurement).toHaveBeenCalledWith(
      AUTHENTICATION_END_TO_HOMEPAGE_READY_MS,
      250,
      'millisecond',
      homepageReadySpan,
    );
    expect(mockEndTrace).toHaveBeenCalledWith({
      name: TraceName.HomepageReady,
      data: {
        success: true,
        content_state: 'filled',
      },
    });
  });

  it('clears authentication-end on unlock failure so a retry does not inherit it', () => {
    const token = startHomepageReadyTrace({
      source: 'unlock',
      appStartType: 'warm',
    });
    jest.mocked(performance.now).mockReturnValue(400);
    markHomepageAuthenticationEnd(token);
    cancelHomepageReadyTrace({ reason: 'unlock_failed', traceToken: token });

    const retryToken = startHomepageReadyTrace({
      source: 'unlock',
      appStartType: 'warm',
    });
    jest.mocked(performance.now).mockReturnValue(900);
    endHomepageReadyTrace({ contentState: 'filled' });

    expect(retryToken).not.toBeNull();
    expect(mockSetMeasurement).not.toHaveBeenCalled();
  });

  it('omits the authentication-end measurement on already-unlocked cold app-open', () => {
    startHomepageReadyTrace({
      source: 'app_open',
      appStartType: 'cold',
    });
    markHomepageAuthenticationEnd(1);

    endHomepageReadyTrace({ contentState: 'filled' });

    expect(mockSetMeasurement).not.toHaveBeenCalled();
  });

  it('replays the latest Homepage Ready completion to a late subscriber', () => {
    const listener = jest.fn();
    startHomepageReadyTrace({
      source: 'app_open',
      appStartType: 'cold',
    });
    jest.mocked(performance.now).mockReturnValue(880);
    endHomepageReadyTrace({ contentState: 'filled' });

    const unsubscribe = subscribeHomepageReadyCompletion(listener);

    expect(listener).toHaveBeenCalledWith(880);
    unsubscribe();
  });

  it('notifies subscribers of a later Homepage Ready completion', () => {
    const listener = jest.fn();
    const unsubscribe = subscribeHomepageReadyCompletion(listener);

    startHomepageReadyTrace({
      source: 'unlock',
      appStartType: 'warm',
    });
    jest.mocked(performance.now).mockReturnValue(720);
    endHomepageReadyTrace({ contentState: 'empty' });

    expect(listener).toHaveBeenCalledWith(720);
    unsubscribe();
  });

  it('does not notify after unsubscribe', () => {
    const listener = jest.fn();
    const unsubscribe = subscribeHomepageReadyCompletion(listener);
    unsubscribe();

    startHomepageReadyTrace({
      source: 'unlock',
      appStartType: 'warm',
    });
    jest.mocked(performance.now).mockReturnValue(640);
    endHomepageReadyTrace({ contentState: 'filled' });

    expect(listener).not.toHaveBeenCalled();
  });
});

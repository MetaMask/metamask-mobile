import { AppState, type AppStateStatus } from 'react-native';
import { endTrace, trace, TraceName, TraceOperation } from '../../util/trace';
import {
  cancelHomepageReadyTrace,
  endHomepageReadyTrace,
  getActiveHomepageReadyTraceToken,
  isHomepageReadyTraceActive,
  resetHomepageReadyTraceForTesting,
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

const setCurrentAppState = (state: AppStateStatus) => {
  Object.defineProperty(AppState, 'currentState', {
    configurable: true,
    value: state,
    writable: true,
  });
};

describe('HomepageReady', () => {
  let appStateListener: ((state: AppStateStatus) => void) | undefined;
  const removeAppStateListener = jest.fn();

  beforeEach(() => {
    resetHomepageReadyTraceForTesting();
    jest.clearAllMocks();
    setCurrentAppState('active');
    jest
      .spyOn(AppState, 'addEventListener')
      .mockImplementation((_event, listener) => {
        appStateListener = listener;
        return { remove: removeAppStateListener };
      });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    appStateListener = undefined;
  });

  it('starts the trace at the given start time', () => {
    const startTime = 1_723_456_789_000;

    startHomepageReadyTrace({
      source: 'unlock',
      appStartType: 'cold',
      startTime,
    });

    expect(mockTrace).toHaveBeenCalledWith({
      name: TraceName.HomepageReady,
      op: TraceOperation.HomepagePerformance,
      startTime,
      tags: {
        start_source: 'unlock',
        app_start_type: 'cold',
      },
    });
  });

  it('adds the given tags next to the source and start type', () => {
    startHomepageReadyTrace({
      source: 'unlock',
      appStartType: 'warm',
      tags: { 'unlock.before_navigate': true },
    });

    expect(mockTrace).toHaveBeenCalledWith({
      name: TraceName.HomepageReady,
      op: TraceOperation.HomepagePerformance,
      tags: {
        'unlock.before_navigate': true,
        start_source: 'unlock',
        app_start_type: 'warm',
      },
    });
  });

  it('keeps the first entry point while a trace is active', () => {
    startHomepageReadyTrace({
      source: 'app_open',
      appStartType: 'warm',
    });

    const blockedToken = startHomepageReadyTrace({
      source: 'unlock',
      appStartType: 'cold',
    });

    expect(mockTrace).toHaveBeenCalledTimes(1);
    expect(blockedToken).toBeNull();
  });

  it('reports whether a trace is active', () => {
    expect(isHomepageReadyTraceActive()).toBe(false);

    startHomepageReadyTrace({
      source: 'app_open',
      appStartType: 'warm',
    });
    expect(isHomepageReadyTraceActive()).toBe(true);

    endHomepageReadyTrace({ contentState: 'filled' });
    expect(isHomepageReadyTraceActive()).toBe(false);
  });

  it('reports the token of the active trace', () => {
    expect(getActiveHomepageReadyTraceToken()).toBeNull();

    const traceToken = startHomepageReadyTrace({
      source: 'unlock',
      appStartType: 'cold',
    });
    expect(getActiveHomepageReadyTraceToken()).toBe(traceToken);

    endHomepageReadyTrace({ contentState: 'filled' });
    expect(getActiveHomepageReadyTraceToken()).toBeNull();
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

  it('keeps the active trace when cancelled with the token of an earlier trace', () => {
    const earlierToken = startHomepageReadyTrace({
      source: 'unlock',
      appStartType: 'cold',
    });
    endHomepageReadyTrace({ contentState: 'filled' });
    startHomepageReadyTrace({
      source: 'app_open',
      appStartType: 'warm',
    });
    mockEndTrace.mockClear();

    cancelHomepageReadyTrace({
      reason: 'navigated_away',
      traceToken: earlierToken,
    });

    expect(mockEndTrace).not.toHaveBeenCalled();
    expect(isHomepageReadyTraceActive()).toBe(true);
  });

  it('cancels whichever trace is active when no token is given', () => {
    startHomepageReadyTrace({
      source: 'app_open',
      appStartType: 'warm',
    });

    cancelHomepageReadyTrace({ reason: 'navigated_away' });

    expect(mockEndTrace).toHaveBeenCalledWith({
      name: TraceName.HomepageReady,
      data: {
        success: false,
        reason: 'navigated_away',
      },
    });
    expect(isHomepageReadyTraceActive()).toBe(false);
  });

  it('does not cancel when no trace is active', () => {
    cancelHomepageReadyTrace({ reason: 'deeplink' });

    expect(mockEndTrace).not.toHaveBeenCalled();
  });

  it('cancels the trace when the app goes to the background', () => {
    startHomepageReadyTrace({
      source: 'unlock',
      appStartType: 'cold',
    });

    appStateListener?.('background');

    expect(mockEndTrace).toHaveBeenCalledWith({
      name: TraceName.HomepageReady,
      data: {
        success: false,
        reason: 'backgrounded',
      },
    });
    expect(isHomepageReadyTraceActive()).toBe(false);
  });

  it('keeps the trace when the app becomes inactive', () => {
    startHomepageReadyTrace({
      source: 'unlock',
      appStartType: 'cold',
    });

    appStateListener?.('inactive');

    expect(mockEndTrace).not.toHaveBeenCalled();
    expect(isHomepageReadyTraceActive()).toBe(true);
  });

  it.each([
    ['ends', () => endHomepageReadyTrace({ contentState: 'filled' as const })],
    [
      'is cancelled',
      () => cancelHomepageReadyTrace({ reason: 'unlock_failed' as const }),
    ],
  ])('stops listening for the background once the trace %s', (_, finish) => {
    startHomepageReadyTrace({
      source: 'unlock',
      appStartType: 'cold',
    });

    finish();

    expect(removeAppStateListener).toHaveBeenCalledTimes(1);
  });

  it('cancels a trace started while the app is already in the background', () => {
    setCurrentAppState('background');

    const traceToken = startHomepageReadyTrace({
      source: 'unlock',
      appStartType: 'cold',
    });

    expect(traceToken).toBe(1);
    expect(mockTrace).toHaveBeenCalledTimes(1);
    expect(mockEndTrace).toHaveBeenCalledWith({
      name: TraceName.HomepageReady,
      data: {
        success: false,
        reason: 'backgrounded',
      },
    });
    expect(isHomepageReadyTraceActive()).toBe(false);
  });
});

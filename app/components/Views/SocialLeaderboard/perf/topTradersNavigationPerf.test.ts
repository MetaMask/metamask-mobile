import {
  endTrace,
  trace,
  TraceName,
  type TraceRequest,
} from '../../../../util/trace';
import {
  _resetTopTradersNavPerfForTests,
  _setTopTradersNavPerfEnabledForTests,
  markTopTradersFirstCommit,
  markTopTradersNavigationTap,
  markTopTradersNavigationTarget,
  markTopTradersTransitionEnd,
  reportTopTradersContent,
} from './topTradersNavigationPerf';

jest.mock('../../../../util/trace', () => {
  const actual = jest.requireActual('../../../../util/trace');
  return {
    ...actual,
    trace: jest.fn(() => ({})),
    endTrace: jest.fn(),
  };
});

const mockTrace = jest.mocked(trace);
const mockEndTrace = jest.mocked(endTrace);

describe('topTradersNavigationPerf', () => {
  let log: jest.SpyInstance;

  beforeEach(() => {
    jest.useFakeTimers();
    _resetTopTradersNavPerfForTests();
    mockTrace.mockClear();
    mockEndTrace.mockClear();
    // eslint-disable-next-line no-console
    log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('does not log or trace when the env flag is off', () => {
    markTopTradersNavigationTap();
    markTopTradersNavigationTarget({ variant: 'V0', surface: 'leaderboard' });
    markTopTradersFirstCommit('V0');
    markTopTradersTransitionEnd();
    reportTopTradersContent({
      surface: 'leaderboard',
      hasRows: true,
      settled: true,
      fromCache: true,
    });

    expect(log).not.toHaveBeenCalled();
    expect(mockTrace).not.toHaveBeenCalled();
  });

  it('emits one JSON line and the navigation spans when the run completes', () => {
    _setTopTradersNavPerfEnabledForTests(true);

    markTopTradersNavigationTap();
    markTopTradersNavigationTarget({ variant: 'V1', surface: 'trending' });
    markTopTradersFirstCommit('V0');
    markTopTradersFirstCommit('V1');
    reportTopTradersContent({
      surface: 'leaderboard',
      hasRows: true,
      settled: true,
      fromCache: false,
    });
    reportTopTradersContent({
      surface: 'trending',
      hasRows: true,
      settled: true,
      fromCache: true,
    });
    markTopTradersTransitionEnd();
    markTopTradersTransitionEnd();

    const lines = log.mock.calls.map((call) => call[0] as string);
    expect(lines).toHaveLength(1);
    expect(lines[0].startsWith('[PERF_TOP_TRADERS] ')).toBe(true);
    const payload = JSON.parse(lines[0].replace('[PERF_TOP_TRADERS] ', ''));
    expect(payload).toEqual(
      expect.objectContaining({
        variant: 'V1',
        surface: 'trending',
        fromCache: true,
        hasRows: true,
      }),
    );
    expect(typeof payload.tapToNavigateMs).toBe('number');
    expect(typeof payload.tapToFirstCommitMs).toBe('number');
    expect(typeof payload.tapToTransitionEndMs).toBe('number');
    expect(typeof payload.tapToContentReadyMs).toBe('number');

    const names = mockTrace.mock.calls.map(
      (call) => (call[0] as TraceRequest).name,
    );
    expect(names).toEqual([
      TraceName.TopTradersNavigation,
      TraceName.TopTradersNavigationToNavigate,
      TraceName.TopTradersNavigationToFirstCommit,
      TraceName.TopTradersNavigationToTransitionEnd,
      TraceName.TopTradersNavigationToContentReady,
    ]);
    expect(mockEndTrace).toHaveBeenCalledTimes(5);
  });

  it('emits with a null transition when transitionEnd never fires', () => {
    _setTopTradersNavPerfEnabledForTests(true);
    markTopTradersNavigationTap();
    markTopTradersNavigationTarget({
      variant: 'onboarding',
      surface: 'onboarding',
    });
    markTopTradersFirstCommit('onboarding');
    reportTopTradersContent({
      surface: 'onboarding',
      hasRows: false,
      settled: true,
      fromCache: null,
    });

    expect(log).not.toHaveBeenCalled();
    jest.advanceTimersByTime(8000);

    const line = log.mock.calls[0][0] as string;
    const payload = JSON.parse(line.replace('[PERF_TOP_TRADERS] ', ''));
    expect(payload.variant).toBe('onboarding');
    expect(payload.tapToTransitionEndMs).toBeNull();
    expect(payload.fromCache).toBeNull();
    expect(payload.hasRows).toBe(false);
  });
});

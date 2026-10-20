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
  markTopTradersFirstRows,
  markTopTradersNavigationTap,
  markTopTradersNavigationTarget,
  markTopTradersTransitionEnd,
  observeTopTradersLandingQuery,
  reportTopTradersContent,
  traceLandingLeaderboardFetch,
} from './topTradersNavigationPerf';

const LANDING_QUERY = {
  limit: 50,
  chains: ['base', 'solana', 'ethereum', 'bsc', 'robinhood'],
  sort: 'pnl' as const,
  timeframe: '7d' as const,
};

jest.mock('../../../../util/trace', () => {
  const actual = jest.requireActual('../../../../util/trace');
  return {
    ...actual,
    trace: jest.fn((request: TraceRequest, fn?: () => unknown) => {
      if (fn) {
        return fn();
      }
      return { name: request.name };
    }),
    endTrace: jest.fn(),
  };
});

const mockTrace = jest.mocked(trace);
const mockEndTrace = jest.mocked(endTrace);

describe('topTradersNavigationPerf', () => {
  let log: jest.SpyInstance;

  beforeEach(() => {
    jest.useFakeTimers();
    delete (globalThis as { nativeLoggingHook?: unknown }).nativeLoggingHook;
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
      TraceName.TopTradersNavigationToFirstRows,
      TraceName.TopTradersNavigationToNavigate,
      TraceName.TopTradersNavigationToFirstCommit,
      TraceName.TopTradersNavigationToTransitionEnd,
      TraceName.TopTradersNavigationToContentReady,
    ]);
    expect(mockEndTrace).toHaveBeenCalledTimes(6);
    expect(payload.event).toBe('navigation');
    expect(payload.tapToFirstRowsMs).toBeNull();
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

  it('prefers nativeLoggingHook over console.log', () => {
    const hook = jest.fn();
    (
      globalThis as {
        nativeLoggingHook?: (message: string, level: number) => void;
      }
    ).nativeLoggingHook = hook;
    _setTopTradersNavPerfEnabledForTests(true);
    markTopTradersNavigationTap();
    markTopTradersNavigationTarget({ variant: 'V0', surface: 'leaderboard' });
    markTopTradersFirstCommit('V0');
    reportTopTradersContent({
      surface: 'leaderboard',
      hasRows: true,
      settled: true,
      fromCache: false,
    });
    markTopTradersTransitionEnd();

    expect(log).not.toHaveBeenCalled();
    expect(hook).toHaveBeenCalledWith(
      expect.stringMatching(/^\[PERF_TOP_TRADERS\] /),
      1,
    );
    delete (globalThis as { nativeLoggingHook?: unknown }).nativeLoggingHook;
  });

  it('logs landing-query cache, fetch, and first rows without secrets', () => {
    _setTopTradersNavPerfEnabledForTests(true);
    markTopTradersNavigationTap();
    markTopTradersNavigationTarget({ variant: 'V0', surface: 'leaderboard' });
    observeTopTradersLandingQuery({
      ...LANDING_QUERY,
      hasData: false,
      isFetching: false,
      hasFetched: false,
    });
    expect(log).not.toHaveBeenCalled();

    observeTopTradersLandingQuery({
      ...LANDING_QUERY,
      hasData: false,
      isFetching: true,
      hasFetched: false,
    });
    observeTopTradersLandingQuery({
      ...LANDING_QUERY,
      hasData: true,
      isFetching: false,
      hasFetched: true,
    });
    markTopTradersFirstRows();
    markTopTradersFirstRows();

    const payloads = log.mock.calls.map((call) =>
      JSON.parse((call[0] as string).replace('[PERF_TOP_TRADERS] ', '')),
    );
    expect(
      payloads.map((payload) => payload.event + ':' + (payload.phase ?? '')),
    ).toEqual(['query:mount', 'query:start', 'query:end', 'rows:']);
    expect(payloads[0]).toEqual(
      expect.objectContaining({
        cache: 'miss',
        limit: 50,
        sort: 'pnl',
        timeframe: '7d',
        chains: LANDING_QUERY.chains,
      }),
    );
    expect(payloads[2].durationMs).toEqual(expect.any(Number));
    expect(payloads[3].tapToFirstRowsMs).toEqual(expect.any(Number));
    expect(JSON.stringify(payloads)).not.toMatch(
      /0x|authorization|bearer|http/i,
    );

    observeTopTradersLandingQuery({
      limit: 50,
      chains: ['0xabc'],
      sort: 'pnl',
      timeframe: '7d',
      hasData: false,
      isFetching: true,
      hasFetched: false,
    });
    expect(log).toHaveBeenCalledTimes(4);
  });

  it('classifies a warm cache that is revalidating', () => {
    _setTopTradersNavPerfEnabledForTests(true);
    markTopTradersNavigationTap();
    markTopTradersNavigationTarget({ variant: 'V0', surface: 'leaderboard' });
    observeTopTradersLandingQuery({
      ...LANDING_QUERY,
      hasData: true,
      isFetching: true,
      hasFetched: true,
    });
    const payload = JSON.parse(
      (log.mock.calls[0][0] as string).replace('[PERF_TOP_TRADERS] ', ''),
    );
    expect(payload).toEqual(
      expect.objectContaining({
        event: 'query',
        phase: 'mount',
        cache: 'stale-revalidate',
      }),
    );
  });

  it('wraps only the landing leaderboard fetch as a child of the rows span', async () => {
    _setTopTradersNavPerfEnabledForTests(true);
    markTopTradersNavigationTap();
    const rowsSpan = mockTrace.mock.results[1]?.value;
    observeTopTradersLandingQuery({
      ...LANDING_QUERY,
      hasData: false,
      isFetching: true,
      hasFetched: false,
    });
    const run = jest.fn(async () => 'ok');
    await traceLandingLeaderboardFetch(
      { limit: 50, chains: LANDING_QUERY.chains, sort: 'pnl' },
      run,
    );
    await traceLandingLeaderboardFetch(
      { limit: 5, chains: ['base'], sort: 'pnl' },
      run,
    );

    expect(run).toHaveBeenCalledTimes(2);
    const fetchCall = mockTrace.mock.calls.find(
      (call) =>
        (call[0] as TraceRequest).name === TraceName.TopTradersLeaderboardFetch,
    );
    expect(fetchCall?.[0]).toEqual(
      expect.objectContaining({
        parentContext: rowsSpan,
        op: 'top_traders.navigation',
      }),
    );
    expect(
      mockTrace.mock.calls.filter(
        (call) =>
          (call[0] as TraceRequest).name ===
          TraceName.TopTradersLeaderboardFetch,
      ),
    ).toHaveLength(1);
  });
});

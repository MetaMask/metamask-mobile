import performance from 'react-native-performance';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import {
  annotateTraceByRequest as annotateTrace,
  endTrace,
  setTraceMeasurement as setMeasurement,
  trace,
  TraceName,
  TraceOperation,
} from '../../../../util/trace';
import {
  BOOTSTRAP_BEFORE_HOMEPAGE_READY,
  finishPerpsLoadingSession,
  getActivePerpsLoadingSessionContext,
  HOMEPAGE_READY_DISTANCE_FROM_PERPS_BOOTSTRAP_START_MS,
  preparePerpsLoadingSession,
  resolvePerpsMarketSource,
  recordHomepageReadyAt,
  recordPerpsLoadingSessionValuesReady,
  resetPerpsLoadingSessionForTesting,
  setPerpsLoadingSessionLifecycle,
  startPerpsLoadingSession,
} from './perpsLoadingSession';

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'session-id-1'),
}));

jest.mock('../../../../core/SDKConnect/utils/DevLogger', () => ({
  DevLogger: { log: jest.fn() },
}));

jest.mock('../../../../util/trace', () => ({
  annotateTraceByRequest: jest.fn(),
  endTrace: jest.fn(),
  setTraceMeasurement: jest.fn(),
  trace: jest.fn(),
  TraceName: { PerpsLoadingSession: 'Perps Loading Session' },
  TraceOperation: { PerpsLoading: 'perps.loading' },
}));

jest.mock('react-native-performance', () => ({
  __esModule: true,
  default: {
    now: jest.fn(() => 400),
    getEntriesByName: jest.fn(() => []),
  },
}));

describe('perpsLoadingSession', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetPerpsLoadingSessionForTesting();
    jest.mocked(performance.now).mockReturnValue(400);
    jest.mocked(performance.getEntriesByName).mockReturnValue([]);
  });

  it('starts one session and logs the canonical marker', () => {
    const sessionId = startPerpsLoadingSession();

    expect(sessionId).toBe('session-id-1');
    expect(DevLogger.log).toHaveBeenCalledWith(
      expect.stringContaining('"stage":"perps_bootstrap_start"'),
    );
    expect(trace).toHaveBeenCalledWith({
      name: TraceName.PerpsLoadingSession,
      id: 'session-id-1',
      op: TraceOperation.PerpsLoading,
      data: {
        lifecycle: 'cold_no_cache',
        surface: 'homepage',
      },
    });
  });

  it('updates the bounded lifecycle on the active session', () => {
    startPerpsLoadingSession();

    setPerpsLoadingSessionLifecycle('background_reconnect');

    expect(getActivePerpsLoadingSessionContext()?.lifecycle).toBe(
      'background_reconnect',
    );
    expect(annotateTrace).toHaveBeenCalledWith(
      { name: TraceName.PerpsLoadingSession, id: 'session-id-1' },
      { lifecycle: 'background_reconnect' },
    );
  });

  it('returns the same id and does not emit a second trace or marker on repeated start', () => {
    const first = startPerpsLoadingSession();
    const second = startPerpsLoadingSession();

    expect(first).toBe('session-id-1');
    expect(second).toBe(first);
    expect(trace).toHaveBeenCalledTimes(1);
    expect(DevLogger.log).toHaveBeenCalledTimes(1);
  });

  describe('recordPerpsLoadingSessionValuesReady', () => {
    const valuesReadyRecords = () =>
      jest
        .mocked(DevLogger.log)
        .mock.calls.map(([message]) => String(message))
        .filter((message) => message.includes('"stage":"values_ready"'))
        .map(
          (message) =>
            JSON.parse(message.replace('[PerpsLoadProof] ', '')) as {
              stage: string;
              stream: string;
              source: string;
              item_count: number;
              elapsed_ms: number;
              main_market_count?: number;
            },
        );

    const startSessionAt = (monotonicMs: number) => {
      jest.mocked(performance.now).mockReturnValue(monotonicMs);
      startPerpsLoadingSession();
      jest.mocked(DevLogger.log).mockClear();
      jest.mocked(setMeasurement).mockClear();
    };

    it('records markets_ready once with source, coverage, and bootstrap-relative elapsed', () => {
      startSessionAt(400);
      jest.mocked(performance.now).mockReturnValue(550);

      recordPerpsLoadingSessionValuesReady('markets', 'provider', 12, {
        main_market_count: 10,
        hip3_market_count: 2,
        priced_market_count: 11,
        trend_market_count: 8,
      });
      recordPerpsLoadingSessionValuesReady('markets', 'memory_cache', 20, {
        main_market_count: 18,
      });

      expect(setMeasurement).toHaveBeenCalledTimes(1);
      expect(setMeasurement).toHaveBeenCalledWith(
        { name: TraceName.PerpsLoadingSession, id: 'session-id-1' },
        'markets_ready_ms',
        150,
        'millisecond',
      );
      expect(valuesReadyRecords()).toEqual([
        expect.objectContaining({
          stage: 'values_ready',
          stream: 'markets',
          source: 'provider',
          item_count: 12,
          elapsed_ms: 150,
          main_market_count: 10,
          hip3_market_count: 2,
          priced_market_count: 11,
          trend_market_count: 8,
        }),
      ]);
    });

    it('does not record account_cache_ready from mixed cache sources', () => {
      startSessionAt(400);
      jest.mocked(performance.now).mockReturnValue(480);

      recordPerpsLoadingSessionValuesReady('positions', 'memory_cache', 2);
      recordPerpsLoadingSessionValuesReady('orders', 'provider_snapshot', 0);
      recordPerpsLoadingSessionValuesReady('account', 'disk_cache', 1);

      expect(setMeasurement).not.toHaveBeenCalled();
      expect(valuesReadyRecords()).toHaveLength(0);
    });

    it('records account_cache_ready when one source has positions, orders, and account', () => {
      startSessionAt(400);
      jest.mocked(performance.now).mockReturnValue(480);

      recordPerpsLoadingSessionValuesReady('positions', 'provider_snapshot', 2);
      recordPerpsLoadingSessionValuesReady('orders', 'provider_snapshot', 0);

      expect(setMeasurement).not.toHaveBeenCalled();

      jest.mocked(performance.now).mockReturnValue(510);
      recordPerpsLoadingSessionValuesReady('account', 'provider_snapshot', 1);

      expect(setMeasurement).toHaveBeenCalledTimes(1);
      expect(setMeasurement).toHaveBeenCalledWith(
        { name: TraceName.PerpsLoadingSession, id: 'session-id-1' },
        'account_cache_ready_ms',
        110,
        'millisecond',
      );
      expect(valuesReadyRecords()).toEqual([
        expect.objectContaining({
          stream: 'account',
          source: 'provider_snapshot',
          item_count: 1,
          elapsed_ms: 110,
        }),
      ]);
    });

    it('records empty positions and orders as live but not empty prices or null account', () => {
      startSessionAt(400);
      jest.mocked(performance.now).mockReturnValue(430);

      recordPerpsLoadingSessionValuesReady('positions', 'fresh_socket', 0);
      recordPerpsLoadingSessionValuesReady('orders', 'fresh_socket', 0);
      recordPerpsLoadingSessionValuesReady('account', 'fresh_socket', 0);
      recordPerpsLoadingSessionValuesReady('prices', 'fresh_socket', 0, {
        subscribed_symbol_count: 7,
      });

      expect(setMeasurement).toHaveBeenCalledTimes(2);
      expect(setMeasurement).toHaveBeenCalledWith(
        { name: TraceName.PerpsLoadingSession, id: 'session-id-1' },
        'positions_live_ms',
        30,
        'millisecond',
      );
      expect(setMeasurement).toHaveBeenCalledWith(
        { name: TraceName.PerpsLoadingSession, id: 'session-id-1' },
        'orders_live_ms',
        30,
        'millisecond',
      );
      expect(setMeasurement).not.toHaveBeenCalledWith(
        expect.anything(),
        'account_live_ms',
        expect.anything(),
        expect.anything(),
      );
      expect(setMeasurement).not.toHaveBeenCalledWith(
        expect.anything(),
        'prices_live_ms',
        expect.anything(),
        expect.anything(),
      );
      expect(valuesReadyRecords()).toEqual([
        expect.objectContaining({ stream: 'positions', item_count: 0 }),
        expect.objectContaining({ stream: 'orders', item_count: 0 }),
      ]);
    });

    it('does not treat fresh_socket as cache-ready or rewrite a recorded milestone', () => {
      startSessionAt(400);
      jest.mocked(performance.now).mockReturnValue(440);
      recordPerpsLoadingSessionValuesReady('positions', 'fresh_socket', 3);
      jest.mocked(performance.now).mockReturnValue(460);
      recordPerpsLoadingSessionValuesReady('positions', 'fresh_socket', 4);
      recordPerpsLoadingSessionValuesReady('orders', 'memory_cache', 1);
      recordPerpsLoadingSessionValuesReady('account', 'memory_cache', 1);

      expect(setMeasurement).toHaveBeenCalledTimes(1);
      expect(setMeasurement).toHaveBeenCalledWith(
        { name: TraceName.PerpsLoadingSession, id: 'session-id-1' },
        'positions_live_ms',
        40,
        'millisecond',
      );
      expect(valuesReadyRecords()).toHaveLength(1);
    });

    it('buffers values observed before the parent session effect starts', () => {
      recordPerpsLoadingSessionValuesReady('markets', 'provider', 4);
      recordPerpsLoadingSessionValuesReady('positions', 'fresh_socket', 0);

      expect(setMeasurement).not.toHaveBeenCalled();
      expect(DevLogger.log).not.toHaveBeenCalled();

      startPerpsLoadingSession();

      expect(setMeasurement).toHaveBeenCalledTimes(2);
      expect(valuesReadyRecords()).toHaveLength(2);
    });

    it('does not carry post-completion live ticks into the next generation', () => {
      startPerpsLoadingSession();
      recordHomepageReadyAt(500);
      finishPerpsLoadingSession({
        success: true,
        content_state: 'empty',
        content_variant: 'trending',
      });
      jest.clearAllMocks();

      recordPerpsLoadingSessionValuesReady('positions', 'fresh_socket', 1);
      preparePerpsLoadingSession();
      startPerpsLoadingSession();

      expect(setMeasurement).not.toHaveBeenCalledWith(
        expect.anything(),
        'positions_live_ms',
        expect.anything(),
        expect.anything(),
      );
    });
  });

  describe('finishPerpsLoadingSession', () => {
    const finishData = {
      success: true,
      content_state: 'empty',
      content_variant: 'trending',
      market_source: 'provider',
      account_source: 'memory_cache',
      lifecycle: 'cold_no_cache',
      surface: 'homepage',
    };

    it('ends the active session once', () => {
      startPerpsLoadingSession();
      recordHomepageReadyAt(500);

      finishPerpsLoadingSession(finishData);
      finishPerpsLoadingSession({
        ...finishData,
        content_variant: 'positions',
      });

      expect(endTrace).toHaveBeenCalledTimes(1);
      expect(endTrace).toHaveBeenCalledWith({
        name: TraceName.PerpsLoadingSession,
        id: 'session-id-1',
        data: {
          ...finishData,
          required_live_streams_complete: true,
        },
      });
      expect(getActivePerpsLoadingSessionContext()).toBeNull();
    });

    it('does not end a trace when no session is active', () => {
      finishPerpsLoadingSession(finishData);

      expect(endTrace).not.toHaveBeenCalled();
    });

    it('clears active session state so a new lifecycle can start', () => {
      startPerpsLoadingSession();
      recordHomepageReadyAt(500);
      finishPerpsLoadingSession(finishData);

      const nextId = startPerpsLoadingSession();

      expect(nextId).toBe('session-id-1');
      expect(trace).toHaveBeenCalledTimes(2);
      expect(getActivePerpsLoadingSessionContext()).toEqual({
        id: 'session-id-1',
        marketSource: 'unknown',
        accountSource: 'unknown',
        lifecycle: 'cold_no_cache',
      });
    });

    it('finishes trending without waiting for prices_live', () => {
      startPerpsLoadingSession();
      recordPerpsLoadingSessionValuesReady('markets', 'provider', 4);
      recordPerpsLoadingSessionValuesReady('positions', 'fresh_socket', 0);
      recordPerpsLoadingSessionValuesReady('orders', 'fresh_socket', 0);
      recordHomepageReadyAt(500);

      finishPerpsLoadingSession(finishData);

      expect(endTrace).toHaveBeenCalledTimes(1);
      expect(setMeasurement).not.toHaveBeenCalledWith(
        expect.anything(),
        'prices_live_ms',
        expect.anything(),
        expect.anything(),
      );
    });

    it('waits for the complete live account on positions content', () => {
      startPerpsLoadingSession();
      recordHomepageReadyAt(500);
      finishPerpsLoadingSession({
        ...finishData,
        content_variant: 'positions',
      });

      expect(endTrace).not.toHaveBeenCalled();

      recordPerpsLoadingSessionValuesReady('positions', 'fresh_socket', 1);
      recordPerpsLoadingSessionValuesReady('orders', 'fresh_socket', 0);
      recordPerpsLoadingSessionValuesReady('account', 'fresh_socket', 1);

      expect(endTrace).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            content_variant: 'positions',
            required_live_streams_complete: true,
          }),
        }),
      );
    });

    it('ends and releases a session at the bounded timeout', () => {
      jest.useFakeTimers();
      const startedAtWallMs = Date.now();
      startPerpsLoadingSession();
      const expectedDeadline = startedAtWallMs + 90_000;
      jest.mocked(performance.now).mockReturnValue(120_400);
      const dateNow = jest
        .spyOn(Date, 'now')
        .mockReturnValue(startedAtWallMs + 120_000);

      jest.advanceTimersByTime(120_000);

      expect(endTrace).toHaveBeenCalledWith(
        expect.objectContaining({
          timestamp: expectedDeadline,
          data: expect.objectContaining({
            success: false,
            failure_stage: 'loading_session_timeout',
          }),
        }),
      );
      expect(getActivePerpsLoadingSessionContext()).toBeNull();
      dateNow.mockRestore();
      jest.useRealTimers();
    });

    it('prefers all-Terminal row provenance and otherwise uses the recorded session market source', () => {
      startPerpsLoadingSession();
      recordPerpsLoadingSessionValuesReady('markets', 'memory_cache', 3);
      const sessionMarketSource =
        getActivePerpsLoadingSessionContext()?.marketSource;

      expect(
        resolvePerpsMarketSource(
          [{ dataSource: 'terminal-global-snapshot-mark' }],
          'provider',
        ),
      ).toBe('terminal_v2');
      expect(resolvePerpsMarketSource([{}, {}], sessionMarketSource)).toBe(
        'memory_cache',
      );
      expect(resolvePerpsMarketSource([], null)).toBe('unknown');
    });

    it('exposes the coherent account cache source and recorded market source', () => {
      startPerpsLoadingSession();
      recordPerpsLoadingSessionValuesReady(
        'markets',
        'terminal_global_snapshot_v2',
        8,
      );
      recordPerpsLoadingSessionValuesReady('positions', 'memory_cache', 1);
      recordPerpsLoadingSessionValuesReady('orders', 'memory_cache', 0);
      recordPerpsLoadingSessionValuesReady('account', 'memory_cache', 1);

      expect(getActivePerpsLoadingSessionContext()).toEqual({
        id: 'session-id-1',
        marketSource: 'terminal_v2',
        accountSource: 'memory_cache',
        lifecycle: 'cold_no_cache',
      });
    });

    it('uses fresh_socket for account_source when account_live is recorded and no cache source won', () => {
      startPerpsLoadingSession();
      recordPerpsLoadingSessionValuesReady('account', 'fresh_socket', 1);

      expect(getActivePerpsLoadingSessionContext()?.accountSource).toBe(
        'fresh_socket',
      );
    });

    it('keeps the coherent cache account_source when account_live arrives later', () => {
      startPerpsLoadingSession();
      recordPerpsLoadingSessionValuesReady('positions', 'memory_cache', 1);
      recordPerpsLoadingSessionValuesReady('orders', 'memory_cache', 0);
      recordPerpsLoadingSessionValuesReady('account', 'memory_cache', 1);
      recordPerpsLoadingSessionValuesReady('account', 'fresh_socket', 1);

      expect(getActivePerpsLoadingSessionContext()?.accountSource).toBe(
        'memory_cache',
      );
    });

    it('ends a visible-error session with success false and content_state error', () => {
      startPerpsLoadingSession();
      recordHomepageReadyAt(500);

      finishPerpsLoadingSession({
        success: false,
        content_state: 'error',
        content_variant: 'error',
      });

      expect(endTrace).toHaveBeenCalledWith({
        name: TraceName.PerpsLoadingSession,
        id: 'session-id-1',
        data: {
          success: false,
          content_state: 'error',
          content_variant: 'error',
          required_live_streams_complete: true,
        },
      });
    });

    it('records equal positive Homepage distances with opposite bootstrap order', () => {
      jest.mocked(performance.now).mockReturnValue(400);
      startPerpsLoadingSession();
      recordHomepageReadyAt(550);

      expect(setMeasurement).toHaveBeenCalledWith(
        { name: TraceName.PerpsLoadingSession, id: 'session-id-1' },
        HOMEPAGE_READY_DISTANCE_FROM_PERPS_BOOTSTRAP_START_MS,
        150,
        'millisecond',
      );
      expect(annotateTrace).toHaveBeenCalledWith(
        { name: TraceName.PerpsLoadingSession, id: 'session-id-1' },
        { [BOOTSTRAP_BEFORE_HOMEPAGE_READY]: true },
      );

      resetPerpsLoadingSessionForTesting();
      jest.clearAllMocks();
      recordHomepageReadyAt(400);
      jest.mocked(performance.now).mockReturnValue(550);
      startPerpsLoadingSession();

      expect(setMeasurement).toHaveBeenCalledWith(
        { name: TraceName.PerpsLoadingSession, id: 'session-id-1' },
        HOMEPAGE_READY_DISTANCE_FROM_PERPS_BOOTSTRAP_START_MS,
        150,
        'millisecond',
      );
      expect(annotateTrace).toHaveBeenCalledWith(
        { name: TraceName.PerpsLoadingSession, id: 'session-id-1' },
        { [BOOTSTRAP_BEFORE_HOMEPAGE_READY]: false },
      );
    });

    it('uses the latest pending content requirement before Homepage Ready', () => {
      startPerpsLoadingSession();
      finishPerpsLoadingSession(finishData);
      finishPerpsLoadingSession({
        ...finishData,
        content_variant: 'positions',
      });

      expect(endTrace).not.toHaveBeenCalled();

      recordHomepageReadyAt(480);

      expect(endTrace).not.toHaveBeenCalled();

      recordPerpsLoadingSessionValuesReady('positions', 'fresh_socket', 1);
      recordPerpsLoadingSessionValuesReady('orders', 'fresh_socket', 0);
      recordPerpsLoadingSessionValuesReady('account', 'fresh_socket', 1);

      expect(endTrace).toHaveBeenCalledTimes(1);
      expect(endTrace).toHaveBeenCalledWith({
        name: TraceName.PerpsLoadingSession,
        id: 'session-id-1',
        data: {
          ...finishData,
          content_variant: 'positions',
          required_live_streams_complete: true,
        },
      });
    });

    it('omits the Homepage distance when the timestamp is invalid or missing', () => {
      startPerpsLoadingSession();
      recordHomepageReadyAt(Number.NaN);
      finishPerpsLoadingSession(finishData);

      expect(setMeasurement).not.toHaveBeenCalledWith(
        expect.anything(),
        HOMEPAGE_READY_DISTANCE_FROM_PERPS_BOOTSTRAP_START_MS,
        expect.anything(),
        expect.anything(),
        expect.anything(),
      );
      expect(endTrace).not.toHaveBeenCalled();
    });
  });
});

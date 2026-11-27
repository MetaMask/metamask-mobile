import { act, renderHook } from '@testing-library/react-native';
import type {
  PredictIndexError,
  PredictIndexLive,
  PredictIndexSnapshot,
} from '../../contracts/v1/liveData';
import { PREDICT_LIVE_DATA_SERVICE_NAME } from '../../services/PredictLiveDataService';
import type {
  PredictEntityId,
  PredictTimestamp,
  PredictVenueId,
} from '../../types';
import {
  LIVE_INDEX_FLUSH_INTERVAL_MS,
  LIVE_INDEX_MAX_ERRORS,
  useLiveIndexSeries,
} from './useLiveIndexSeries';

const NAME = PREDICT_LIVE_DATA_SERVICE_NAME;
const SNAPSHOT_EVENT = `${NAME}:indexSnapshotUpdated`;
const TICK_EVENT = `${NAME}:indexUpdated`;
const FAILED_EVENT = `${NAME}:indexFailed`;
const RELEASED_EVENT = `${NAME}:indexReleased`;
const WATCH = `${NAME}:watchIndex`;
const UNWATCH = `${NAME}:unwatchIndex`;

const mockListeners = new Map<string, Set<(payload: never) => void>>();
const mockCall = jest.fn();
let mockIsFocused = true;

jest.mock('../../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    controllerMessenger: {
      call: (...args: unknown[]) => mockCall(...args),
      subscribe: (name: string, listener: (payload: never) => void) => {
        const set = mockListeners.get(name) ?? new Set();
        set.add(listener);
        mockListeners.set(name, set);
      },
      unsubscribe: (name: string, listener: (payload: never) => void) => {
        mockListeners.get(name)?.delete(listener);
      },
    },
  },
}));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useIsFocused: () => mockIsFocused,
}));

jest.mock('../../../../../util/Logger', () => ({
  __esModule: true,
  default: { log: jest.fn() },
}));

const publish = (name: string, payload: unknown) =>
  mockListeners.get(name)?.forEach((listener) => listener(payload as never));

const venueId = 'kalshi' as PredictVenueId;
const eventId = 'KXBTC15M-26NOV261815' as PredictEntityId;
const START = Date.parse('2026-11-26T23:00:00.000Z');

const iso = (seconds: number) => new Date(START + seconds * 1000).toISOString();

const tick = (seconds: number, extra: Partial<PredictIndexLive> = {}) =>
  ({
    venueId,
    eventId,
    coin: 'BTC',
    average60s: `${60000 + seconds}.00`,
    observedAt: iso(seconds),
    ...extra,
  }) as PredictIndexLive;

const snapshot = (seconds: number, pointSeconds: number[]) =>
  ({
    ...tick(seconds),
    points: pointSeconds.map((time) => ({
      time: iso(time) as PredictTimestamp,
      value: `${60000 + time}.00`,
    })),
  }) as PredictIndexSnapshot;

const failure = (code = 'upstream_stale'): PredictIndexError => ({
  venueId,
  eventId,
  code,
  message: code,
});

const calls = (action: string) =>
  mockCall.mock.calls.filter(([name]) => name === action);

const setup = (options: Parameters<typeof useLiveIndexSeries>[2] = {}) => {
  const rendered = renderHook(() =>
    useLiveIndexSeries(venueId, eventId, options),
  );
  return rendered;
};

const advance = (ms: number) =>
  act(() => {
    jest.advanceTimersByTime(ms);
  });

describe('useLiveIndexSeries', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(START));
    mockListeners.clear();
    mockCall.mockReset();
    mockIsFocused = true;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('series buffer', () => {
    it('starts loading and watches the Event once', () => {
      const { result } = setup();

      expect(result.current.status).toBe('loading');
      expect(result.current.points).toEqual([]);
      expect(calls(WATCH)).toEqual([[WATCH, venueId, [eventId]]]);
    });

    it('takes the snapshot points and the latest value', () => {
      const { result } = setup();

      act(() => publish(SNAPSHOT_EVENT, snapshot(3, [0, 5])));

      expect(result.current.status).toBe('live');
      expect(result.current.points.map(({ time }) => time)).toEqual([
        iso(0),
        iso(5),
      ]);
      expect(result.current.latest?.average60s).toBe('60003.00');
    });

    it('appends ticks in order', () => {
      const { result } = setup({ minPointGapMs: 0 });
      act(() => publish(SNAPSHOT_EVENT, snapshot(0, [0])));

      [1, 2, 3].forEach((seconds) => {
        advance(LIVE_INDEX_FLUSH_INTERVAL_MS);
        act(() => publish(TICK_EVENT, tick(seconds)));
      });
      advance(LIVE_INDEX_FLUSH_INTERVAL_MS);

      expect(result.current.points.map(({ value }) => value)).toEqual([
        '60000.00',
        '60001.00',
        '60002.00',
        '60003.00',
      ]);
      expect(result.current.latest?.average60s).toBe('60003.00');
    });

    it('ignores a late tick', () => {
      const { result } = setup({ minPointGapMs: 0 });
      act(() => publish(SNAPSHOT_EVENT, snapshot(10, [0, 10])));
      advance(LIVE_INDEX_FLUSH_INTERVAL_MS);

      act(() => publish(TICK_EVENT, tick(6)));
      advance(LIVE_INDEX_FLUSH_INTERVAL_MS);

      expect(result.current.points).toHaveLength(2);
      expect(result.current.latest?.observedAt).toBe(iso(10));
    });

    it('trims the buffer at the size bound', () => {
      const { result } = setup({ maxPoints: 3, minPointGapMs: 0 });
      act(() => publish(SNAPSHOT_EVENT, snapshot(0, [0])));

      for (let seconds = 1; seconds <= 6; seconds += 1) {
        advance(LIVE_INDEX_FLUSH_INTERVAL_MS);
        act(() => publish(TICK_EVENT, tick(seconds)));
      }
      advance(LIVE_INDEX_FLUSH_INTERVAL_MS);

      expect(result.current.points.map(({ value }) => value)).toEqual([
        '60004.00',
        '60005.00',
        '60006.00',
      ]);
    });

    it('trims a snapshot that is over the size bound', () => {
      const { result } = setup({ maxPoints: 2 });

      act(() => publish(SNAPSHOT_EVENT, snapshot(15, [0, 5, 10, 15])));

      expect(result.current.points.map(({ time }) => time)).toEqual([
        iso(10),
        iso(15),
      ]);
    });

    it('ignores frames of another Event', () => {
      const { result } = setup();

      act(() =>
        publish(TICK_EVENT, tick(1, { eventId: 'KXETH15M-OTHER' as never })),
      );

      expect(result.current.status).toBe('loading');
    });

    it('marks the window final on the final tick', () => {
      const { result } = setup();
      act(() => publish(SNAPSHOT_EVENT, snapshot(0, [0])));
      advance(LIVE_INDEX_FLUSH_INTERVAL_MS);

      act(() =>
        publish(
          TICK_EVENT,
          tick(900, {
            settlementAverage: { value: '60463.50', samples: 60, final: true },
          }),
        ),
      );
      advance(LIVE_INDEX_FLUSH_INTERVAL_MS);

      expect(result.current.status).toBe('final');
      expect(result.current.latest?.settlementAverage?.final).toBe(true);
    });

    it('marks the window final when the snapshot already has the final average', () => {
      const { result } = setup();

      act(() =>
        publish(SNAPSHOT_EVENT, {
          ...snapshot(900, [0, 900]),
          settlementAverage: { value: '60463.50', samples: 60, final: true },
        }),
      );

      expect(result.current.status).toBe('final');
    });

    it('works when ticks come before any snapshot', () => {
      const { result } = setup({ minPointGapMs: 0 });

      act(() => publish(TICK_EVENT, tick(1)));
      advance(LIVE_INDEX_FLUSH_INTERVAL_MS);
      act(() => publish(TICK_EVENT, tick(2)));
      advance(LIVE_INDEX_FLUSH_INTERVAL_MS);

      expect(result.current.status).toBe('live');
      expect(result.current.points).toHaveLength(2);
    });

    it('marks the window final when the final tick has 59 samples', () => {
      const { result } = setup();
      act(() => publish(SNAPSHOT_EVENT, snapshot(0, [0])));
      advance(LIVE_INDEX_FLUSH_INTERVAL_MS);

      act(() =>
        publish(
          TICK_EVENT,
          tick(901, {
            settlementAverage: { value: '60463.50', samples: 59, final: true },
          }),
        ),
      );
      advance(LIVE_INDEX_FLUSH_INTERVAL_MS);

      expect(result.current.status).toBe('final');
    });

    it('ignores an error that arrives after the final frame', () => {
      const { result } = setup();
      act(() =>
        publish(
          TICK_EVENT,
          tick(900, {
            settlementAverage: { value: '1', samples: 60, final: true },
          }),
        ),
      );

      act(() => publish(FAILED_EVENT, failure('upstream_stale')));
      advance(30_000);

      expect(result.current.status).toBe('final');
      expect(result.current.errorCount).toBe(0);
      expect(calls(UNWATCH)).toHaveLength(0);
    });

    it('does not mark a final window stale after silence', () => {
      const { result } = setup({ staleAfterMs: 1000 });
      act(() =>
        publish(
          TICK_EVENT,
          tick(900, {
            settlementAverage: { value: '1', samples: 60, final: true },
          }),
        ),
      );

      advance(5000);

      expect(result.current.status).toBe('final');
    });
  });

  describe('flush rate', () => {
    const countRenders = (options = {}) => {
      let renders = 0;
      const rendered = renderHook(() => {
        renders += 1;
        return useLiveIndexSeries(venueId, eventId, {
          minPointGapMs: 0,
          ...options,
        });
      });
      return { ...rendered, getRenders: () => renders };
    };

    it('flushes the first frame at once', () => {
      const { result } = countRenders();

      act(() => publish(TICK_EVENT, tick(1)));

      expect(result.current.latest?.observedAt).toBe(iso(1));
    });

    it('flushes at most once every 250 ms however many ticks arrive', () => {
      const { result, getRenders } = countRenders();
      act(() => publish(TICK_EVENT, tick(1)));
      const rendersAfterFirst = getRenders();

      // 40 ticks inside 200 ms.
      for (let index = 2; index < 42; index += 1) {
        act(() => {
          publish(TICK_EVENT, tick(index));
          jest.advanceTimersByTime(5);
        });
      }

      expect(getRenders()).toBe(rendersAfterFirst);
      expect(result.current.latest?.observedAt).toBe(iso(1));

      advance(LIVE_INDEX_FLUSH_INTERVAL_MS);

      expect(getRenders()).toBe(rendersAfterFirst + 1);
      expect(result.current.latest?.observedAt).toBe(iso(41));
    });

    it('flushes every interval while ticks keep coming', () => {
      const { getRenders } = countRenders();
      const flushTimes: number[] = [];
      let lastRenders = getRenders();

      for (let elapsed = 0; elapsed < 2000; elapsed += 50) {
        act(() => {
          publish(TICK_EVENT, tick(elapsed / 50 + 1));
          jest.advanceTimersByTime(50);
        });
        if (getRenders() !== lastRenders) {
          lastRenders = getRenders();
          flushTimes.push(Date.now());
        }
      }

      expect(flushTimes.length).toBeGreaterThan(1);
      flushTimes.slice(1).forEach((time, index) => {
        expect(time - flushTimes[index]).toBeGreaterThanOrEqual(
          LIVE_INDEX_FLUSH_INTERVAL_MS - 50,
        );
      });
      expect(flushTimes.length).toBeLessThanOrEqual(2000 / 250 + 1);
    });

    it('never flushes faster than 250 ms even when asked to', () => {
      const { getRenders } = countRenders({ flushIntervalMs: 10 });
      act(() => publish(TICK_EVENT, tick(1)));
      const rendersAfterFirst = getRenders();

      act(() => {
        publish(TICK_EVENT, tick(2));
        jest.advanceTimersByTime(100);
      });

      expect(getRenders()).toBe(rendersAfterFirst);
    });

    it('does not set a timer or flush while nothing arrives', () => {
      const { getRenders } = countRenders({ staleAfterMs: 10 * 60 * 1000 });
      const rendersAtStart = getRenders();

      advance(60_000);

      expect(getRenders()).toBe(rendersAtStart);
    });
  });

  describe('errors and backoff', () => {
    it('goes stale on an error, keeps the data and releases the Event', () => {
      const { result } = setup();
      act(() => publish(SNAPSHOT_EVENT, snapshot(3, [0, 5])));
      advance(LIVE_INDEX_FLUSH_INTERVAL_MS);

      act(() => publish(FAILED_EVENT, failure()));
      advance(LIVE_INDEX_FLUSH_INTERVAL_MS);

      expect(result.current.status).toBe('stale');
      expect(result.current.points).toHaveLength(2);
      expect(result.current.errorCount).toBe(1);
      expect(calls(UNWATCH)).toHaveLength(1);
    });

    it('watches again after an exponential backoff', () => {
      setup({ backoffBaseMs: 1000, backoffMaxMs: 30_000 });

      act(() => publish(FAILED_EVENT, failure()));
      advance(999);
      expect(calls(WATCH)).toHaveLength(1);
      advance(1);
      expect(calls(WATCH)).toHaveLength(2);

      act(() => publish(FAILED_EVENT, failure()));
      advance(1999);
      expect(calls(WATCH)).toHaveLength(2);
      advance(1);
      expect(calls(WATCH)).toHaveLength(3);

      act(() => publish(FAILED_EVENT, failure()));
      advance(3999);
      expect(calls(WATCH)).toHaveLength(3);
      advance(1);
      expect(calls(WATCH)).toHaveLength(4);
    });

    it('retries a window that has not opened yet (no_live_data)', () => {
      const { result } = setup({ backoffBaseMs: 1000 });

      act(() => publish(FAILED_EVENT, failure('no_live_data')));
      advance(1000);
      act(() => publish(SNAPSHOT_EVENT, snapshot(2, [0])));

      expect(calls(WATCH)).toHaveLength(2);
      expect(result.current.status).toBe('live');
      expect(result.current.errorCount).toBe(0);
    });

    it('caps the backoff delay', () => {
      setup({ backoffBaseMs: 1000, backoffMaxMs: 1500, maxErrors: 10 });
      act(() => publish(FAILED_EVENT, failure()));
      advance(1000);
      act(() => publish(FAILED_EVENT, failure()));

      advance(1500);

      expect(calls(WATCH)).toHaveLength(3);
    });

    it('counts repeated error frames during one backoff as one error', () => {
      const { result } = setup();

      act(() => {
        publish(FAILED_EVENT, failure());
        publish(FAILED_EVENT, failure());
        publish(FAILED_EVENT, failure());
      });

      expect(result.current.errorCount).toBe(1);
      expect(calls(UNWATCH)).toHaveLength(1);
    });

    it('stops after the set number of errors in a row', () => {
      const { result } = setup({ maxErrors: 3 });

      for (let attempt = 0; attempt < 3; attempt += 1) {
        act(() => publish(FAILED_EVENT, failure()));
        advance(30_000);
      }

      expect(result.current.status).toBe('stopped');
      expect(result.current.errorCount).toBe(3);
      expect(calls(WATCH)).toHaveLength(3);
      expect(calls(UNWATCH)).toHaveLength(3);
    });

    it('makes no request once it has stopped', () => {
      setup({ maxErrors: 2 });
      for (let attempt = 0; attempt < 2; attempt += 1) {
        act(() => publish(FAILED_EVENT, failure()));
        advance(30_000);
      }
      const watchCount = calls(WATCH).length;
      const unwatchCount = calls(UNWATCH).length;

      act(() => publish(FAILED_EVENT, failure()));
      advance(10 * 60 * 1000);

      expect(calls(WATCH)).toHaveLength(watchCount);
      expect(calls(UNWATCH)).toHaveLength(unwatchCount);
    });

    it('uses a set default number of errors', () => {
      const { result } = setup();

      for (let attempt = 0; attempt < LIVE_INDEX_MAX_ERRORS; attempt += 1) {
        act(() => publish(FAILED_EVENT, failure('no_live_data')));
        advance(30_000);
      }

      expect(result.current.status).toBe('stopped');
    });

    it('resets the error count after a good frame', () => {
      const { result } = setup({ maxErrors: 3 });

      act(() => publish(FAILED_EVENT, failure()));
      advance(1000);
      act(() => publish(TICK_EVENT, tick(1)));
      advance(LIVE_INDEX_FLUSH_INTERVAL_MS);

      expect(result.current.errorCount).toBe(0);
      expect(result.current.status).toBe('live');
    });

    it('watches again at once when frames flow during the backoff', () => {
      setup();
      act(() => publish(FAILED_EVENT, failure()));
      expect(calls(WATCH)).toHaveLength(1);

      act(() => publish(TICK_EVENT, tick(1)));

      expect(calls(WATCH)).toHaveLength(2);
      advance(30_000);
      expect(calls(WATCH)).toHaveLength(2);
    });

    it('does not poll: it makes no request while frames arrive', () => {
      setup();

      for (let seconds = 1; seconds <= 30; seconds += 1) {
        act(() => {
          publish(TICK_EVENT, tick(seconds));
          jest.advanceTimersByTime(1000);
        });
      }

      expect(calls(WATCH)).toHaveLength(1);
      expect(calls(UNWATCH)).toHaveLength(0);
    });

    it('ignores errors about another Event', () => {
      const { result } = setup();

      act(() =>
        publish(FAILED_EVENT, { ...failure(), eventId: 'other' as never }),
      );

      expect(result.current.errorCount).toBe(0);
      expect(calls(UNWATCH)).toHaveLength(0);
    });
  });

  describe('server release and refusal', () => {
    it('ends the window without an error when the server releases it', () => {
      const { result } = setup();
      act(() => publish(SNAPSHOT_EVENT, snapshot(3, [0, 5])));
      advance(LIVE_INDEX_FLUSH_INTERVAL_MS);

      act(() => publish(RELEASED_EVENT, { venueId, eventId }));
      advance(LIVE_INDEX_FLUSH_INTERVAL_MS);

      expect(result.current.status).toBe('final');
      expect(result.current.errorCount).toBe(0);
      expect(result.current.points).toHaveLength(2);
      advance(60_000);
      expect(calls(WATCH)).toHaveLength(1);
    });

    it('makes no unwatch call after a release when it unmounts', () => {
      const { unmount } = setup();
      act(() => publish(RELEASED_EVENT, { venueId, eventId }));

      unmount();

      expect(calls(UNWATCH)).toHaveLength(0);
    });

    it('does not stop its timers wrongly: no timer is left after a release', () => {
      const { unmount } = setup();
      act(() => publish(RELEASED_EVENT, { venueId, eventId }));
      advance(LIVE_INDEX_FLUSH_INTERVAL_MS);

      unmount();

      expect(jest.getTimerCount()).toBe(0);
    });

    it('ignores a release of another Event', () => {
      const { result } = setup();

      act(() =>
        publish(RELEASED_EVENT, { venueId, eventId: 'other' as never }),
      );

      expect(result.current.status).toBe('loading');
    });

    it('keeps backing off when no_live_data is followed by the server unsubscribe', () => {
      const { result } = setup({ backoffBaseMs: 1000 });

      // The server sends the error first, then `unsubscribed`; the service
      // only publishes a release for an Event that is still watched.
      act(() => publish(FAILED_EVENT, failure('no_live_data')));
      expect(calls(UNWATCH)).toHaveLength(1);
      advance(1000);

      expect(calls(WATCH)).toHaveLength(2);
      expect(result.current.status).toBe('stale');
    });

    it('treats a slow snapshot as loading, then stale, not an error', () => {
      const { result } = setup({ staleAfterMs: 5000 });

      advance(4000);
      expect(result.current.status).toBe('loading');
      advance(1000);

      expect(result.current.status).toBe('stale');
      expect(result.current.errorCount).toBe(0);

      act(() => publish(SNAPSHOT_EVENT, snapshot(6, [0, 5])));
      advance(LIVE_INDEX_FLUSH_INTERVAL_MS);
      expect(result.current.status).toBe('live');
    });
  });

  describe('stale data', () => {
    it('goes stale after silence and recovers on the next frame', () => {
      const { result } = setup({ staleAfterMs: 5000 });
      act(() => publish(TICK_EVENT, tick(1)));
      expect(result.current.status).toBe('live');

      advance(5000);
      expect(result.current.status).toBe('stale');
      expect(result.current.latest).toBeDefined();

      act(() => publish(TICK_EVENT, tick(7)));
      advance(LIVE_INDEX_FLUSH_INTERVAL_MS);
      expect(result.current.status).toBe('live');
    });

    it('goes stale when no first frame arrives', () => {
      const { result } = setup({ staleAfterMs: 5000 });

      advance(5000);

      expect(result.current.status).toBe('stale');
    });
  });

  describe('unsubscribe', () => {
    it('releases the Event on unmount and listens no more', () => {
      const { unmount } = setup();

      unmount();

      expect(calls(UNWATCH)).toEqual([[UNWATCH, venueId, [eventId]]]);
      expect(mockListeners.get(TICK_EVENT)?.size).toBe(0);
      expect(mockListeners.get(SNAPSHOT_EVENT)?.size).toBe(0);
      expect(mockListeners.get(FAILED_EVENT)?.size).toBe(0);
    });

    it('releases the Event when the screen loses focus', () => {
      const { rerender, result } = setup();
      act(() => publish(TICK_EVENT, tick(1)));

      mockIsFocused = false;
      rerender({});

      expect(calls(UNWATCH)).toHaveLength(1);
      expect(result.current.status).toBe('idle');
      expect(result.current.latest).toBeDefined();
    });

    it('watches again when the screen regains focus', () => {
      const { rerender } = setup();
      mockIsFocused = false;
      rerender({});

      mockIsFocused = true;
      rerender({});

      expect(calls(WATCH)).toHaveLength(2);
    });

    it('starts a fresh series after a stop when focus returns', () => {
      const { rerender, result } = setup({ maxErrors: 1 });
      act(() => publish(FAILED_EVENT, failure()));
      expect(result.current.status).toBe('stopped');

      mockIsFocused = false;
      rerender({});
      mockIsFocused = true;
      rerender({});

      expect(result.current.status).toBe('loading');
      expect(calls(WATCH)).toHaveLength(2);
    });

    it('stops its timers on unmount', () => {
      const { unmount } = setup();
      act(() => publish(TICK_EVENT, tick(1)));
      act(() => publish(TICK_EVENT, tick(2)));

      unmount();

      expect(jest.getTimerCount()).toBe(0);
    });

    it('holds no watch when disabled', () => {
      renderHook(() =>
        useLiveIndexSeries(venueId, eventId, { enabled: false }),
      );

      expect(calls(WATCH)).toHaveLength(0);
    });

    it('holds no watch without an Event', () => {
      renderHook(() => useLiveIndexSeries(venueId, undefined));

      expect(calls(WATCH)).toHaveLength(0);
    });

    it('releases the old Event and watches the new one when the Event changes', () => {
      const { rerender } = renderHook(
        ({ id }: { id: PredictEntityId }) => useLiveIndexSeries(venueId, id),
        { initialProps: { id: eventId } },
      );

      rerender({ id: 'KXBTC15M-26NOV261830' as PredictEntityId });

      expect(calls(UNWATCH)).toEqual([[UNWATCH, venueId, [eventId]]]);
      expect(calls(WATCH)[1]).toEqual([
        WATCH,
        venueId,
        ['KXBTC15M-26NOV261830'],
      ]);
    });

    it('does not show the old Event series for a new Event', () => {
      const { rerender, result } = renderHook(
        ({ id }: { id: PredictEntityId }) => useLiveIndexSeries(venueId, id),
        { initialProps: { id: eventId } },
      );
      act(() => publish(TICK_EVENT, tick(1)));

      rerender({ id: 'KXBTC15M-26NOV261830' as PredictEntityId });

      expect(result.current.latest).toBeUndefined();
      expect(result.current.status).toBe('loading');
    });
  });

  it('listens before it watches, so a replay is not missed', () => {
    mockCall.mockImplementation((name: string) => {
      if (name === WATCH) {
        publish(SNAPSHOT_EVENT, snapshot(3, [0, 5]));
      }
    });

    const { result } = setup();

    expect(result.current.points).toHaveLength(2);
    expect(result.current.status).toBe('live');
  });
});

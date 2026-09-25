import { act, renderHook } from '@testing-library/react-native';
import type { PredictGameLive } from '../contracts/v1/liveData';
import { PREDICT_LIVE_DATA_SERVICE_NAME } from '../services/PredictLiveDataService';
import type {
  PredictEntityId,
  PredictEvent,
  PredictTimestamp,
  PredictVenueId,
} from '../types';
import {
  getLiveGameWatchIds,
  useEventsWithLiveGames,
} from './useEventsWithLiveGames';

const mockCall = jest.fn();
const mockSubscribe = jest.fn();
const mockUnsubscribe = jest.fn();

jest.mock('../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    controllerMessenger: {
      call: (...args: unknown[]) => mockCall(...args),
      subscribe: (...args: unknown[]) => mockSubscribe(...args),
      unsubscribe: (...args: unknown[]) => mockUnsubscribe(...args),
    },
  },
}));

const venueId = 'kalshi' as PredictVenueId;

const makeEvent = (id: string, withGame = true): PredictEvent => ({
  venueId,
  id: id as PredictEntityId,
  title: id,
  markets: [],
  ...(withGame
    ? {
        sports: {
          sport: {
            id: 'american-football' as PredictEntityId,
            label: 'American football',
          },
          game: {
            status: 'scheduled' as const,
            homeTeam: { name: 'Home' },
            awayTeam: { name: 'Away' },
            observedAt: '2026-09-08T12:00:00.000Z' as PredictTimestamp,
          },
        },
      }
    : {}),
});

const eventA = makeEvent('event-a');
const eventB = makeEvent('event-b');
const propsEvent = makeEvent('event-props', false);

const watchCalls = () =>
  mockCall.mock.calls.filter(
    ([action]) => action === `${PREDICT_LIVE_DATA_SERVICE_NAME}:watchGames`,
  );
const unwatchCalls = () =>
  mockCall.mock.calls.filter(
    ([action]) => action === `${PREDICT_LIVE_DATA_SERVICE_NAME}:unwatchGames`,
  );

describe('getLiveGameWatchIds', () => {
  it('skips Events that have no Game', () => {
    expect(getLiveGameWatchIds([eventA, propsEvent, eventB])).toEqual([
      eventA.id,
      eventB.id,
    ]);
  });

  it('intersects an explicit watch list with Events that have a Game', () => {
    expect(
      getLiveGameWatchIds(
        [eventA, eventB, propsEvent],
        [propsEvent.id, eventB.id],
      ),
    ).toEqual([eventB.id]);
  });
});

describe('useEventsWithLiveGames', () => {
  beforeEach(() => {
    mockCall.mockClear();
    mockSubscribe.mockReset();
    mockUnsubscribe.mockClear();
  });

  it('watches the Event ids on mount', () => {
    renderHook(() => useEventsWithLiveGames(venueId, [eventA]));

    expect(watchCalls()).toEqual([
      [`${PREDICT_LIVE_DATA_SERVICE_NAME}:watchGames`, venueId, [eventA.id]],
    ]);
    expect(unwatchCalls()).toEqual([]);
  });

  it('does not watch Events that have no Game', () => {
    renderHook(() => useEventsWithLiveGames(venueId, [propsEvent, eventA]));

    expect(watchCalls()).toEqual([
      [`${PREDICT_LIVE_DATA_SERVICE_NAME}:watchGames`, venueId, [eventA.id]],
    ]);
  });

  it('watches only newly added Event ids when the list grows', () => {
    const { rerender } = renderHook(
      ({ events }: { events: readonly PredictEvent[] }) =>
        useEventsWithLiveGames(venueId, events),
      { initialProps: { events: [eventA] } },
    );

    rerender({ events: [eventA, eventB] });

    expect(watchCalls()).toEqual([
      [`${PREDICT_LIVE_DATA_SERVICE_NAME}:watchGames`, venueId, [eventA.id]],
      [`${PREDICT_LIVE_DATA_SERVICE_NAME}:watchGames`, venueId, [eventB.id]],
    ]);
    expect(unwatchCalls()).toEqual([]);
  });

  it('unwatches only removed Event ids when the list changes', () => {
    const { rerender } = renderHook(
      ({ events }: { events: readonly PredictEvent[] }) =>
        useEventsWithLiveGames(venueId, events),
      { initialProps: { events: [eventA] } },
    );

    rerender({ events: [eventB] });

    expect(unwatchCalls()).toEqual([
      [`${PREDICT_LIVE_DATA_SERVICE_NAME}:unwatchGames`, venueId, [eventA.id]],
    ]);
    expect(watchCalls()).toEqual([
      [`${PREDICT_LIVE_DATA_SERVICE_NAME}:watchGames`, venueId, [eventA.id]],
      [`${PREDICT_LIVE_DATA_SERVICE_NAME}:watchGames`, venueId, [eventB.id]],
    ]);
  });

  it('watches only the explicit viewport Event ids', () => {
    const { rerender } = renderHook(
      ({
        events,
        watchEventIds,
      }: {
        events: readonly PredictEvent[];
        watchEventIds?: readonly PredictEntityId[];
      }) => useEventsWithLiveGames(venueId, events, watchEventIds),
      {
        initialProps: { events: [eventA, eventB], watchEventIds: [eventA.id] },
      },
    );

    rerender({ events: [eventA, eventB], watchEventIds: [eventB.id] });

    expect(watchCalls()).toEqual([
      [`${PREDICT_LIVE_DATA_SERVICE_NAME}:watchGames`, venueId, [eventA.id]],
      [`${PREDICT_LIVE_DATA_SERVICE_NAME}:watchGames`, venueId, [eventB.id]],
    ]);
    expect(unwatchCalls()).toEqual([
      [`${PREDICT_LIVE_DATA_SERVICE_NAME}:unwatchGames`, venueId, [eventA.id]],
    ]);
  });

  it('keeps the newer live Game when an older snapshot arrives later', () => {
    let onUpdate: (live: PredictGameLive) => void = () => undefined;
    mockSubscribe.mockImplementation((_event, listener) => {
      onUpdate = listener as (live: PredictGameLive) => void;
    });
    const { result } = renderHook(() =>
      useEventsWithLiveGames(venueId, [eventA]),
    );

    act(() => {
      onUpdate({
        venueId,
        eventId: eventA.id,
        type: 'football_game',
        details: {
          status: 'live',
          away_points: 17,
          home_points: 21,
          last_updated_ts: Date.parse('2026-09-08T13:00:00.000Z') / 1000,
        },
      });
    });
    act(() => {
      onUpdate({
        venueId,
        eventId: eventA.id,
        type: 'football_game',
        details: {
          status: 'live',
          away_points: 14,
          home_points: 7,
          last_updated_ts: Date.parse('2026-09-08T12:30:00.000Z') / 1000,
        },
      });
    });

    expect(result.current[0]?.sports?.game?.score).toEqual({
      away: '17',
      home: '21',
    });
  });

  it('unwatches remaining Event ids on unmount', () => {
    const { unmount } = renderHook(() =>
      useEventsWithLiveGames(venueId, [eventA, eventB]),
    );

    unmount();

    expect(unwatchCalls()).toEqual([
      [
        `${PREDICT_LIVE_DATA_SERVICE_NAME}:unwatchGames`,
        venueId,
        [eventA.id, eventB.id],
      ],
    ]);
  });
});

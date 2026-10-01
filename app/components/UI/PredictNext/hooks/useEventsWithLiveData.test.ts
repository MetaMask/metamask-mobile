import { act, renderHook } from '@testing-library/react-native';
import type { PredictGameLive, PredictQuote } from '../contracts/v1/liveData';
import { PREDICT_LIVE_DATA_SERVICE_NAME } from '../services/PredictLiveDataService';
import type {
  PredictDecimal,
  PredictEntityId,
  PredictEvent,
  PredictMarket,
  PredictTimestamp,
  PredictVenueId,
} from '../types';
import {
  getLiveGameWatchIds,
  getLiveMarketWatchIds,
  useEventsWithLiveData,
} from './useEventsWithLiveData';

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

const makeMarket = (id: string): PredictMarket => ({
  id: id as PredictEntityId,
  question: id,
  status: 'active',
  outcomes: [
    {
      id: `${id}:yes` as PredictEntityId,
      side: 'yes',
      label: 'Yes',
      askPrice: '0.50' as PredictDecimal,
    },
    { id: `${id}:no` as PredictEntityId, side: 'no', label: 'No' },
  ],
});

const makeEvent = (id: string, withGame = true): PredictEvent => ({
  venueId,
  id: id as PredictEntityId,
  title: id,
  markets: [makeMarket(`${id}-m1`), makeMarket(`${id}-m2`)],
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
const watchMarketCalls = () =>
  mockCall.mock.calls.filter(
    ([action]) => action === `${PREDICT_LIVE_DATA_SERVICE_NAME}:watchMarkets`,
  );
const unwatchMarketCalls = () =>
  mockCall.mock.calls.filter(
    ([action]) => action === `${PREDICT_LIVE_DATA_SERVICE_NAME}:unwatchMarkets`,
  );
const marketIds = (event: PredictEvent) =>
  event.markets.map((market) => market.id);

/** Listeners the hook registered, keyed by messenger event name. */
const listeners = () =>
  new Map<string, (live: unknown) => void>(
    mockSubscribe.mock.calls.map(([eventName, listener]) => [
      eventName as string,
      listener as (live: unknown) => void,
    ]),
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

describe('getLiveMarketWatchIds', () => {
  it('lists the markets of every Event, with or without a Game', () => {
    expect(getLiveMarketWatchIds([eventA, propsEvent])).toEqual([
      ...marketIds(eventA),
      ...marketIds(propsEvent),
    ]);
  });

  it('narrows to the explicit watch list', () => {
    expect(
      getLiveMarketWatchIds([eventA, eventB, propsEvent], [propsEvent.id]),
    ).toEqual(marketIds(propsEvent));
  });

  it('lists only card-visible Markets when the scope is card', () => {
    const away = {
      ...makeMarket('card-away'),
      outcomes: [
        {
          ...makeMarket('card-away').outcomes[0],
          gameSelection: 'away' as const,
        },
        makeMarket('card-away').outcomes[1],
      ],
    } as PredictMarket;
    const home = {
      ...makeMarket('card-home'),
      outcomes: [
        {
          ...makeMarket('card-home').outcomes[0],
          gameSelection: 'home' as const,
        },
        makeMarket('card-home').outcomes[1],
      ],
    } as PredictMarket;
    const spread = makeMarket('card-spread');
    const gameEvent: PredictEvent = {
      ...eventA,
      markets: [away, home, spread],
    };
    const extraProps: PredictEvent = {
      ...propsEvent,
      markets: [
        makeMarket('p1'),
        makeMarket('p2'),
        makeMarket('p3'),
        makeMarket('p4'),
      ],
    };

    expect(
      getLiveMarketWatchIds([gameEvent, extraProps], undefined, 'card'),
    ).toEqual([
      away.id,
      home.id,
      extraProps.markets[0].id,
      extraProps.markets[1].id,
      extraProps.markets[2].id,
    ]);
  });
});

describe('useEventsWithLiveData', () => {
  beforeEach(() => {
    mockCall.mockClear();
    mockSubscribe.mockReset();
    mockUnsubscribe.mockClear();
  });

  it('watches the Event ids on mount', () => {
    renderHook(() => useEventsWithLiveData(venueId, [eventA]));

    expect(watchCalls()).toEqual([
      [`${PREDICT_LIVE_DATA_SERVICE_NAME}:watchGames`, venueId, [eventA.id]],
    ]);
    expect(unwatchCalls()).toEqual([]);
  });

  it('does not watch Events that have no Game', () => {
    renderHook(() => useEventsWithLiveData(venueId, [propsEvent, eventA]));

    expect(watchCalls()).toEqual([
      [`${PREDICT_LIVE_DATA_SERVICE_NAME}:watchGames`, venueId, [eventA.id]],
    ]);
  });

  it('watches only newly added Event ids when the list grows', () => {
    const { rerender } = renderHook(
      ({ events }: { events: readonly PredictEvent[] }) =>
        useEventsWithLiveData(venueId, events),
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
        useEventsWithLiveData(venueId, events),
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
      }) => useEventsWithLiveData(venueId, events, { watchEventIds }),
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
    const { result } = renderHook(() =>
      useEventsWithLiveData(venueId, [eventA]),
    );
    const onUpdate = listeners().get(
      `${PREDICT_LIVE_DATA_SERVICE_NAME}:gameLiveUpdated`,
    ) as (live: PredictGameLive) => void;

    act(() => {
      onUpdate({
        venueId,
        eventId: eventA.id,
        type: 'football_game',
        status: 'in_progress',
        score: { away: '17', home: '21' },
        observedAt: '2026-09-08T13:00:00.000Z' as PredictTimestamp,
      });
    });
    act(() => {
      onUpdate({
        venueId,
        eventId: eventA.id,
        type: 'football_game',
        status: 'in_progress',
        score: { away: '14', home: '7' },
        observedAt: '2026-09-08T12:30:00.000Z' as PredictTimestamp,
      });
    });

    expect(result.current[0]?.sports?.game?.score).toEqual({
      away: '17',
      home: '21',
    });
    expect(result.current[0]?.sports?.game?.status).toBe('in_progress');
  });

  it('keeps earlier live status and score when a later frame only patches the clock', () => {
    const { result } = renderHook(() =>
      useEventsWithLiveData(venueId, [eventA]),
    );
    const onUpdate = listeners().get(
      `${PREDICT_LIVE_DATA_SERVICE_NAME}:gameLiveUpdated`,
    ) as (live: PredictGameLive) => void;

    act(() => {
      onUpdate({
        venueId,
        eventId: eventA.id,
        type: 'football_game',
        status: 'in_progress',
        score: { away: '17', home: '21' },
        period: 'Q4',
        clock: '08:42',
        observedAt: '2026-09-08T13:00:00.000Z' as PredictTimestamp,
      });
    });
    act(() => {
      onUpdate({
        venueId,
        eventId: eventA.id,
        type: 'football_game',
        clock: '08:10',
        observedAt: '2026-09-08T13:01:00.000Z' as PredictTimestamp,
      });
    });

    expect(result.current[0]?.sports?.game).toEqual({
      ...eventA.sports?.game,
      status: 'in_progress',
      score: { away: '17', home: '21' },
      period: 'Q4',
      clock: '08:10',
      observedAt: '2026-09-08T13:01:00.000Z',
    });
  });

  it('keeps a newer REST score after a later clock-only live frame', () => {
    const { result, rerender } = renderHook(
      ({ events }: { events: readonly PredictEvent[] }) =>
        useEventsWithLiveData(venueId, events),
      { initialProps: { events: [eventA] } },
    );
    const onUpdate = listeners().get(
      `${PREDICT_LIVE_DATA_SERVICE_NAME}:gameLiveUpdated`,
    ) as (live: PredictGameLive) => void;

    act(() => {
      onUpdate({
        venueId,
        eventId: eventA.id,
        type: 'football_game',
        status: 'in_progress',
        score: { away: '7', home: '0' },
        observedAt: '2026-09-08T12:30:00.000Z' as PredictTimestamp,
      });
    });

    const restEvent: PredictEvent = {
      ...eventA,
      sports: {
        sport: eventA.sports?.sport ?? {
          id: 'american-football' as PredictEntityId,
          label: 'American football',
        },
        game: {
          status: 'in_progress',
          homeTeam: { name: 'Home' },
          awayTeam: { name: 'Away' },
          score: { away: '14', home: '7' },
          observedAt: '2026-09-08T13:00:00.000Z' as PredictTimestamp,
        },
      },
    };
    rerender({ events: [restEvent] });

    act(() => {
      onUpdate({
        venueId,
        eventId: eventA.id,
        type: 'football_game',
        clock: '09:12',
        observedAt: '2026-09-08T13:01:00.000Z' as PredictTimestamp,
      });
    });

    expect(result.current[0]?.sports?.game?.score).toEqual({
      away: '14',
      home: '7',
    });
    expect(result.current[0]?.sports?.game?.clock).toBe('09:12');
    expect(result.current[0]?.sports?.game?.status).toBe('in_progress');
  });

  it('watches the markets of watched Events, including Events without a Game', () => {
    renderHook(() => useEventsWithLiveData(venueId, [propsEvent, eventA]));

    expect(watchMarketCalls()).toEqual([
      [
        `${PREDICT_LIVE_DATA_SERVICE_NAME}:watchMarkets`,
        venueId,
        [...marketIds(propsEvent), ...marketIds(eventA)],
      ],
    ]);
  });

  it('narrows market watches to the viewport Event ids and swaps on change', () => {
    const { rerender } = renderHook(
      ({
        events,
        watchEventIds,
      }: {
        events: readonly PredictEvent[];
        watchEventIds?: readonly PredictEntityId[];
      }) => useEventsWithLiveData(venueId, events, { watchEventIds }),
      {
        initialProps: { events: [eventA, eventB], watchEventIds: [eventA.id] },
      },
    );

    rerender({ events: [eventA, eventB], watchEventIds: [eventB.id] });

    expect(watchMarketCalls()).toEqual([
      [
        `${PREDICT_LIVE_DATA_SERVICE_NAME}:watchMarkets`,
        venueId,
        marketIds(eventA),
      ],
      [
        `${PREDICT_LIVE_DATA_SERVICE_NAME}:watchMarkets`,
        venueId,
        marketIds(eventB),
      ],
    ]);
    expect(unwatchMarketCalls()).toEqual([
      [
        `${PREDICT_LIVE_DATA_SERVICE_NAME}:unwatchMarkets`,
        venueId,
        marketIds(eventA),
      ],
    ]);
  });

  it('patches streamed prices onto the matching market and keeps the rest', () => {
    const { result } = renderHook(() =>
      useEventsWithLiveData(venueId, [eventA]),
    );
    const onQuote = listeners().get(
      `${PREDICT_LIVE_DATA_SERVICE_NAME}:quoteUpdated`,
    ) as (quote: PredictQuote) => void;
    const [first, second] = eventA.markets;

    act(() => {
      onQuote({
        venueId,
        marketId: second.id,
        outcomes: [
          {
            id: second.outcomes[0].id,
            side: 'yes',
            bidPrice: '0.60' as PredictDecimal,
            askPrice: '0.65' as PredictDecimal,
          },
          {
            id: second.outcomes[1].id,
            side: 'no',
            bidPrice: '0.35' as PredictDecimal,
            askPrice: '0.40' as PredictDecimal,
          },
        ],
        volume: '42.00',
        updatedAt: '2026-09-08T13:00:00.000Z' as PredictTimestamp,
      });
    });

    const [patchedFirst, patchedSecond] = result.current[0].markets;
    expect(patchedFirst).toBe(first);
    expect(patchedSecond).toEqual({
      ...second,
      outcomes: [
        { ...second.outcomes[0], bidPrice: '0.60', askPrice: '0.65' },
        { ...second.outcomes[1], bidPrice: '0.35', askPrice: '0.40' },
      ],
      volume: '42.00',
      updatedAt: '2026-09-08T13:00:00.000Z',
    });
    expect(result.current[0].sports?.game).toBe(eventA.sports?.game);
  });

  it('ignores a quote that is older than the one already applied', () => {
    const { result } = renderHook(() =>
      useEventsWithLiveData(venueId, [eventA]),
    );
    const onQuote = listeners().get(
      `${PREDICT_LIVE_DATA_SERVICE_NAME}:quoteUpdated`,
    ) as (quote: PredictQuote) => void;
    const market = eventA.markets[0];
    const quoteAt = (updatedAt: string, askPrice: string): PredictQuote => ({
      venueId,
      marketId: market.id,
      outcomes: [
        {
          id: market.outcomes[0].id,
          side: 'yes',
          askPrice: askPrice as PredictDecimal,
        },
        { id: market.outcomes[1].id, side: 'no' },
      ],
      updatedAt: updatedAt as PredictTimestamp,
    });

    act(() => onQuote(quoteAt('2026-09-08T13:00:00.000Z', '0.70')));
    act(() => onQuote(quoteAt('2026-09-08T12:30:00.000Z', '0.20')));

    expect(result.current[0].markets[0].outcomes[0].askPrice).toBe('0.70');
  });

  it('unwatches remaining market ids on unmount', () => {
    const { unmount } = renderHook(() =>
      useEventsWithLiveData(venueId, [eventA]),
    );

    unmount();

    expect(unwatchMarketCalls()).toEqual([
      [
        `${PREDICT_LIVE_DATA_SERVICE_NAME}:unwatchMarkets`,
        venueId,
        marketIds(eventA),
      ],
    ]);
  });

  it('unwatches remaining Event ids on unmount', () => {
    const { unmount } = renderHook(() =>
      useEventsWithLiveData(venueId, [eventA, eventB]),
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

  it('watches only card-visible Markets when marketScope is card', () => {
    const away = {
      ...makeMarket('live-away'),
      outcomes: [
        {
          ...makeMarket('live-away').outcomes[0],
          gameSelection: 'away' as const,
        },
        makeMarket('live-away').outcomes[1],
      ],
    } as PredictMarket;
    const home = {
      ...makeMarket('live-home'),
      outcomes: [
        {
          ...makeMarket('live-home').outcomes[0],
          gameSelection: 'home' as const,
        },
        makeMarket('live-home').outcomes[1],
      ],
    } as PredictMarket;
    const spread = makeMarket('live-spread');
    const gameEvent: PredictEvent = {
      ...eventA,
      markets: [away, home, spread],
    };

    renderHook(() =>
      useEventsWithLiveData(venueId, [gameEvent], { marketScope: 'card' }),
    );

    expect(watchMarketCalls()).toEqual([
      [
        `${PREDICT_LIVE_DATA_SERVICE_NAME}:watchMarkets`,
        venueId,
        [away.id, home.id],
      ],
    ]);
  });

  it('keeps an Event that a quote did not touch', () => {
    const { result } = renderHook(() =>
      useEventsWithLiveData(venueId, [eventA, eventB]),
    );
    const onQuote = listeners().get(
      `${PREDICT_LIVE_DATA_SERVICE_NAME}:quoteUpdated`,
    ) as (quote: PredictQuote) => void;
    const market = eventA.markets[0];

    act(() => {
      onQuote({
        venueId,
        marketId: market.id,
        outcomes: [
          {
            id: market.outcomes[0].id,
            side: 'yes',
            askPrice: '0.61' as PredictDecimal,
          },
          { id: market.outcomes[1].id, side: 'no' },
        ],
        updatedAt: '2026-09-08T13:00:00.000Z' as PredictTimestamp,
      });
    });

    expect(result.current[1]).toBe(eventB);
    expect(result.current[0]).not.toBe(eventA);
  });

  it('keeps a previously patched Event when a later quote belongs to another Event', () => {
    const { result } = renderHook(() =>
      useEventsWithLiveData(venueId, [eventA, eventB]),
    );
    const onQuote = listeners().get(
      `${PREDICT_LIVE_DATA_SERVICE_NAME}:quoteUpdated`,
    ) as (quote: PredictQuote) => void;
    const quoteFor = (
      market: PredictMarket,
      askPrice: string,
      updatedAt: string,
    ): PredictQuote => ({
      venueId,
      marketId: market.id,
      outcomes: [
        {
          id: market.outcomes[0].id,
          side: 'yes',
          askPrice: askPrice as PredictDecimal,
        },
        { id: market.outcomes[1].id, side: 'no' },
      ],
      updatedAt: updatedAt as PredictTimestamp,
    });

    act(() =>
      onQuote(quoteFor(eventA.markets[0], '0.61', '2026-09-08T13:00:00.000Z')),
    );
    const afterFirst = result.current[0];
    act(() =>
      onQuote(quoteFor(eventB.markets[0], '0.33', '2026-09-08T13:01:00.000Z')),
    );

    expect(result.current[0]).toBe(afterFirst);
    expect(result.current[1]).not.toBe(eventB);
  });
});

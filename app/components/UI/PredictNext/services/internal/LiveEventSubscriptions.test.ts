import Logger from '../../../../../util/Logger';
import type {
  PredictEntityId,
  PredictEvent,
  PredictGameStatus,
  PredictTimestamp,
  PredictVenueId,
} from '../../types';
import {
  getScopedMarketIds,
  LiveEventSubscriptions,
  msUntilGameWindow,
  PREDICT_LIVE_GAME_WINDOW_MS,
  shouldWatchGame,
} from './LiveEventSubscriptions';

jest.mock('../../../../../util/Logger', () => ({
  __esModule: true,
  default: { log: jest.fn(), error: jest.fn() },
}));

const mockLoggerLog = jest.mocked(Logger.log);

const venueId = 'kalshi' as PredictVenueId;
const NOW = Date.parse('2026-09-08T12:00:00.000Z');
const at = (value: string) => value as PredictTimestamp;
const id = (value: string) => value as PredictEntityId;

const makeEvent = ({
  eventId,
  marketIds,
  gameStatus,
  startsAt,
}: {
  eventId: string;
  marketIds: readonly string[];
  gameStatus?: PredictGameStatus;
  startsAt?: string;
}): PredictEvent => ({
  venueId,
  id: id(eventId),
  title: eventId,
  ...(startsAt ? { startsAt: at(startsAt) } : {}),
  ...(gameStatus
    ? {
        sports: {
          sport: { id: id('football'), label: 'Football' },
          game: {
            status: gameStatus,
            homeTeam: { name: 'Home' },
            awayTeam: { name: 'Away' },
            observedAt: at('2026-09-08T11:00:00.000Z'),
          },
        },
      }
    : {}),
  markets: marketIds.map((marketId) => ({
    id: id(marketId),
    question: marketId,
    status: 'active' as PredictEvent['markets'][number]['status'],
    outcomes: [
      { id: id(`${marketId}:yes`), side: 'yes', label: 'Yes' },
      { id: id(`${marketId}:no`), side: 'no', label: 'No' },
    ],
  })),
});

const flush = () => new Promise<void>((resolve) => setImmediate(resolve));

const createSubscriptions = (
  events: Record<string, PredictEvent | Error>,
  now = () => NOW,
) => {
  const subscribe = jest.fn();
  const unsubscribe = jest.fn();
  const replay = jest.fn();
  const resolveEvent = jest.fn(async (eventId: PredictEntityId) => {
    const event = events[eventId];
    if (!event) {
      throw new Error(`unknown ${eventId}`);
    }
    if (event instanceof Error) {
      throw event;
    }
    return event;
  });
  const subscriptions = new LiveEventSubscriptions({
    resolveEvent,
    subscribe,
    unsubscribe,
    replay,
    now,
  });
  return { subscriptions, subscribe, unsubscribe, replay, resolveEvent };
};

describe('shouldWatchGame', () => {
  it('watches live Games regardless of kickoff', () => {
    (['in_progress', 'delayed', 'suspended'] as const).forEach((status) => {
      expect(
        shouldWatchGame(
          makeEvent({
            eventId: 'e',
            marketIds: [],
            gameStatus: status,
            startsAt: '2026-09-09T12:00:00.000Z',
          }),
          NOW,
        ),
      ).toBe(true);
    });
  });

  it('watches a scheduled Game only inside the game window', () => {
    const scheduledIn = (ms: number) =>
      makeEvent({
        eventId: 'e',
        marketIds: [],
        gameStatus: 'scheduled',
        startsAt: new Date(NOW + ms).toISOString(),
      });

    expect(shouldWatchGame(scheduledIn(PREDICT_LIVE_GAME_WINDOW_MS), NOW)).toBe(
      true,
    );
    expect(
      shouldWatchGame(scheduledIn(PREDICT_LIVE_GAME_WINDOW_MS + 1), NOW),
    ).toBe(false);
    expect(shouldWatchGame(scheduledIn(-5 * 60_000), NOW)).toBe(true);
  });

  it('does not watch finished, postponed, unscheduled, or non-Game Events', () => {
    expect(
      shouldWatchGame(
        makeEvent({ eventId: 'e', marketIds: [], gameStatus: 'completed' }),
        NOW,
      ),
    ).toBe(false);
    expect(
      shouldWatchGame(
        makeEvent({
          eventId: 'e',
          marketIds: [],
          gameStatus: 'postponed',
          startsAt: '2026-09-08T12:10:00.000Z',
        }),
        NOW,
      ),
    ).toBe(false);
    expect(
      shouldWatchGame(
        makeEvent({ eventId: 'e', marketIds: [], gameStatus: 'scheduled' }),
        NOW,
      ),
    ).toBe(false);
    expect(
      shouldWatchGame(makeEvent({ eventId: 'e', marketIds: [] }), NOW),
    ).toBe(false);
  });
});

describe('msUntilGameWindow', () => {
  const scheduledIn = (ms: number) =>
    makeEvent({
      eventId: 'e',
      marketIds: [],
      gameStatus: 'scheduled',
      startsAt: new Date(NOW + ms).toISOString(),
    });

  it('reports the delay until a scheduled Game enters the window', () => {
    expect(
      msUntilGameWindow(
        scheduledIn(PREDICT_LIVE_GAME_WINDOW_MS + 30 * 60_000),
        NOW,
      ),
    ).toBe(30 * 60_000);
  });

  it('reports nothing for a Game already inside the window', () => {
    expect(
      msUntilGameWindow(scheduledIn(PREDICT_LIVE_GAME_WINDOW_MS), NOW),
    ).toBeUndefined();
    expect(msUntilGameWindow(scheduledIn(-5 * 60_000), NOW)).toBeUndefined();
  });

  it('reports nothing for a Game that will never enter the window', () => {
    expect(
      msUntilGameWindow(
        makeEvent({
          eventId: 'e',
          marketIds: [],
          gameStatus: 'in_progress',
          startsAt: new Date(
            NOW + 2 * PREDICT_LIVE_GAME_WINDOW_MS,
          ).toISOString(),
        }),
        NOW,
      ),
    ).toBeUndefined();
    expect(
      msUntilGameWindow(
        makeEvent({
          eventId: 'e',
          marketIds: [],
          gameStatus: 'postponed',
          startsAt: new Date(
            NOW + 2 * PREDICT_LIVE_GAME_WINDOW_MS,
          ).toISOString(),
        }),
        NOW,
      ),
    ).toBeUndefined();
    expect(
      msUntilGameWindow(
        makeEvent({ eventId: 'e', marketIds: [], gameStatus: 'scheduled' }),
        NOW,
      ),
    ).toBeUndefined();
    expect(
      msUntilGameWindow(
        makeEvent({
          eventId: 'e',
          marketIds: [],
          gameStatus: 'scheduled',
          startsAt: 'not-a-date',
        }),
        NOW,
      ),
    ).toBeUndefined();
    expect(
      msUntilGameWindow(makeEvent({ eventId: 'e', marketIds: [] }), NOW),
    ).toBeUndefined();
  });
});

describe('LiveEventSubscriptions', () => {
  beforeEach(() => {
    mockLoggerLog.mockClear();
  });

  it('resolves an Event once and subscribes its Markets in Event order', async () => {
    const { subscriptions, subscribe, resolveEvent } = createSubscriptions({
      'event-1': makeEvent({ eventId: 'event-1', marketIds: ['m-b', 'm-a'] }),
    });

    subscriptions.watch([id('event-1')]);
    subscriptions.watch([id('event-1')]);
    await flush();

    expect(resolveEvent).toHaveBeenCalledTimes(1);
    expect(subscribe).toHaveBeenCalledTimes(1);
    expect(subscribe).toHaveBeenCalledWith('market', [id('m-b'), id('m-a')]);
    expect(subscriptions.watchedEventIds).toEqual([id('event-1')]);
  });

  it('replays current values to a watcher that joins an already-resolved Event', async () => {
    const { subscriptions, subscribe, replay } = createSubscriptions({
      'event-1': makeEvent({
        eventId: 'event-1',
        marketIds: ['m-1'],
        gameStatus: 'in_progress',
      }),
    });
    subscriptions.watch([id('event-1')]);
    await flush();
    expect(replay).not.toHaveBeenCalled();

    subscriptions.watch([id('event-1')]);

    expect(subscribe).toHaveBeenCalledTimes(2);
    expect(replay).toHaveBeenCalledWith('market', [id('m-1')]);
    expect(replay).toHaveBeenCalledWith('game', [id('event-1')]);
  });

  it('also subscribes the game subject for a live Game', async () => {
    const { subscriptions, subscribe } = createSubscriptions({
      'event-1': makeEvent({
        eventId: 'event-1',
        marketIds: ['m-1'],
        gameStatus: 'in_progress',
      }),
    });

    subscriptions.watch([id('event-1')]);
    await flush();

    expect(subscribe).toHaveBeenCalledWith('market', [id('m-1')]);
    expect(subscribe).toHaveBeenCalledWith('game', [id('event-1')]);
  });

  it('releases Markets and game only when the last watcher leaves', async () => {
    const { subscriptions, unsubscribe } = createSubscriptions({
      'event-1': makeEvent({
        eventId: 'event-1',
        marketIds: ['m-1'],
        gameStatus: 'in_progress',
      }),
    });
    subscriptions.watch([id('event-1')]);
    subscriptions.watch([id('event-1')]);
    await flush();

    subscriptions.unwatch([id('event-1')]);
    expect(unsubscribe).not.toHaveBeenCalled();

    subscriptions.unwatch([id('event-1')]);
    expect(unsubscribe).toHaveBeenCalledWith('market', [id('m-1')]);
    expect(unsubscribe).toHaveBeenCalledWith('game', [id('event-1')]);
    expect(subscriptions.watchedEventIds).toEqual([]);
  });

  it('subscribes nothing for a watch released before it resolves', async () => {
    const { subscriptions, subscribe, unsubscribe } = createSubscriptions({
      'event-1': makeEvent({ eventId: 'event-1', marketIds: ['m-1'] }),
    });

    subscriptions.watch([id('event-1')]);
    subscriptions.unwatch([id('event-1')]);
    await flush();

    expect(subscribe).not.toHaveBeenCalled();
    expect(unsubscribe).not.toHaveBeenCalled();
  });

  it('re-resolves an Event re-watched while its first resolution is in flight', async () => {
    const { subscriptions, subscribe, unsubscribe, resolveEvent } =
      createSubscriptions({
        'event-1': makeEvent({ eventId: 'event-1', marketIds: ['m-1'] }),
      });

    subscriptions.watch([id('event-1')]);
    subscriptions.unwatch([id('event-1')]);
    subscriptions.watch([id('event-1')]);
    await flush();

    expect(resolveEvent).toHaveBeenCalledTimes(2);
    expect(subscribe).toHaveBeenCalledTimes(1);
    expect(subscribe).toHaveBeenCalledWith('market', [id('m-1')]);

    subscriptions.unwatch([id('event-1')]);
    expect(unsubscribe).toHaveBeenCalledWith('market', [id('m-1')]);
  });

  it('ignores unwatch for an Event nobody watches', () => {
    const { subscriptions, unsubscribe } = createSubscriptions({});

    subscriptions.unwatch([id('event-1')]);

    expect(unsubscribe).not.toHaveBeenCalled();
    // Harmless, but it means a surface's watch/unwatch pairs have drifted.
    expect(mockLoggerLog).toHaveBeenCalledWith(
      'LiveEventSubscriptions: unwatch without a matching watch',
      id('event-1'),
      'all',
    );
  });

  it('retries a failed resolution on the next watch and keeps the watcher count', async () => {
    const events: Record<string, PredictEvent | Error> = {
      'event-1': new Error('offline'),
    };
    const { subscriptions, subscribe, unsubscribe, resolveEvent } =
      createSubscriptions(events);

    subscriptions.watch([id('event-1')]);
    await flush();
    expect(subscribe).not.toHaveBeenCalled();

    events['event-1'] = makeEvent({ eventId: 'event-1', marketIds: ['m-1'] });
    subscriptions.watch([id('event-1')]);
    await flush();

    expect(resolveEvent).toHaveBeenCalledTimes(2);
    expect(subscribe).toHaveBeenCalledWith('market', [id('m-1')]);

    subscriptions.unwatch([id('event-1')]);
    expect(unsubscribe).not.toHaveBeenCalled();
    subscriptions.unwatch([id('event-1')]);
    expect(unsubscribe).toHaveBeenCalledWith('market', [id('m-1')]);
  });

  it('subscribes nothing for an Event without Markets or a live Game', async () => {
    const { subscriptions, subscribe } = createSubscriptions({
      'event-1': makeEvent({ eventId: 'event-1', marketIds: [] }),
    });

    subscriptions.watch([id('event-1')]);
    await flush();

    expect(subscribe).not.toHaveBeenCalled();
  });

  describe('market scope', () => {
    // A standard card prices the first three Markets; the rest are hidden.
    const fiveMarkets = ['m-1', 'm-2', 'm-3', 'm-4', 'm-5'].map(id);
    const cardMarkets = fiveMarkets.slice(0, 3);
    const hiddenMarkets = fiveMarkets.slice(3);
    const events = () => ({
      'event-1': makeEvent({ eventId: 'event-1', marketIds: fiveMarkets }),
    });

    it('subscribes only card-visible Markets for a card watcher', async () => {
      const { subscriptions, subscribe } = createSubscriptions(events());

      subscriptions.watch([id('event-1')], 'card');
      await flush();

      expect(subscribe).toHaveBeenCalledTimes(1);
      expect(subscribe).toHaveBeenCalledWith('market', cardMarkets);
    });

    it('widens to every Market when an all watcher joins a card watcher', async () => {
      const { subscriptions, subscribe, replay } =
        createSubscriptions(events());
      subscriptions.watch([id('event-1')], 'card');
      await flush();

      subscriptions.watch([id('event-1')], 'all');

      expect(subscribe).toHaveBeenCalledTimes(2);
      expect(subscribe).toHaveBeenLastCalledWith('market', hiddenMarkets);
      // Only the ids that were already held are replayed; the new ones
      // snapshot on subscribe.
      expect(replay).toHaveBeenCalledWith('market', cardMarkets);
    });

    it('replays a joining card watcher only the Markets its card prices', async () => {
      const { subscriptions, subscribe, replay } =
        createSubscriptions(events());
      subscriptions.watch([id('event-1')], 'all');
      await flush();

      subscriptions.watch([id('event-1')], 'card');

      expect(subscribe).toHaveBeenCalledTimes(1);
      expect(replay).toHaveBeenCalledWith('market', cardMarkets);
    });

    it('narrows back to card Markets when the all watcher leaves', async () => {
      const { subscriptions, unsubscribe } = createSubscriptions(events());
      subscriptions.watch([id('event-1')], 'card');
      subscriptions.watch([id('event-1')], 'all');
      await flush();

      subscriptions.unwatch([id('event-1')], 'all');

      expect(unsubscribe).toHaveBeenCalledTimes(1);
      expect(unsubscribe).toHaveBeenCalledWith('market', hiddenMarkets);
      expect(subscriptions.watchedEventIds).toEqual([id('event-1')]);

      subscriptions.unwatch([id('event-1')], 'card');
      expect(unsubscribe).toHaveBeenLastCalledWith('market', cardMarkets);
      expect(subscriptions.watchedEventIds).toEqual([]);
    });

    it('ignores an unwatch for a scope that has no watcher', async () => {
      const { subscriptions, unsubscribe } = createSubscriptions(events());
      subscriptions.watch([id('event-1')], 'card');
      await flush();

      subscriptions.unwatch([id('event-1')], 'all');

      expect(unsubscribe).not.toHaveBeenCalled();
      expect(subscriptions.watchedEventIds).toEqual([id('event-1')]);
      expect(mockLoggerLog).toHaveBeenCalledWith(
        'LiveEventSubscriptions: unwatch without a matching watch',
        id('event-1'),
        'all',
      );
    });
  });

  describe('visible scope', () => {
    const marketIds = ['m-1', 'm-2', 'm-3', 'm-4', 'm-5'].map(id);
    const [m1, m2, m3, m4, m5] = marketIds;
    const visible = (...ids: readonly PredictEntityId[]) => ({
      type: 'visible' as const,
      marketIds: ids,
    });
    const events = () => ({
      'event-1': makeEvent({
        eventId: 'event-1',
        marketIds,
        gameStatus: 'in_progress',
      }),
    });
    // A standard card prices the first three Markets.
    const standardEvents = () => ({
      'event-1': makeEvent({ eventId: 'event-1', marketIds }),
    });

    it('subscribes only the named Markets, in Event order', async () => {
      const { subscriptions, subscribe } = createSubscriptions(events());

      subscriptions.watch([id('event-1')], visible(m4, m1));
      await flush();

      expect(subscribe.mock.calls).toEqual([
        ['market', [m1, m4]],
        ['game', [id('event-1')]],
      ]);
    });

    it('holds the game but no Markets for an empty list', async () => {
      const { subscriptions, subscribe, unsubscribe } =
        createSubscriptions(events());

      subscriptions.watch([id('event-1')], visible());
      await flush();

      expect(subscribe.mock.calls).toEqual([['game', [id('event-1')]]]);
      expect(subscriptions.watchedEventIds).toEqual([id('event-1')]);

      subscriptions.unwatch([id('event-1')], visible());
      expect(unsubscribe.mock.calls).toEqual([['game', [id('event-1')]]]);
    });

    it('re-scopes by subscribing and releasing only the difference', async () => {
      const { subscriptions, subscribe, unsubscribe } =
        createSubscriptions(events());
      subscriptions.watch([id('event-1')], visible(m1, m2));
      await flush();
      subscribe.mockClear();

      // Opening a section: the new list is watched before the old is released.
      subscriptions.watch([id('event-1')], visible(m1, m2, m3, m4));
      subscriptions.unwatch([id('event-1')], visible(m1, m2));
      expect(subscribe.mock.calls).toEqual([['market', [m3, m4]]]);
      expect(unsubscribe).not.toHaveBeenCalled();

      // Changing chip or line: one Market in, one out.
      subscriptions.watch([id('event-1')], visible(m1, m2, m3, m5));
      subscriptions.unwatch([id('event-1')], visible(m1, m2, m3, m4));
      expect(subscribe).toHaveBeenLastCalledWith('market', [m5]);
      expect(unsubscribe.mock.calls).toEqual([['market', [m4]]]);

      // Closing a section.
      subscriptions.watch([id('event-1')], visible(m1, m2));
      subscriptions.unwatch([id('event-1')], visible(m1, m2, m3, m5));
      expect(subscribe).toHaveBeenCalledTimes(2);
      expect(unsubscribe).toHaveBeenLastCalledWith('market', [m3, m5]);
      expect(subscriptions.watchedEventIds).toEqual([id('event-1')]);
    });

    it('subscribes and releases nothing when the list does not change', async () => {
      const { subscriptions, subscribe, unsubscribe } =
        createSubscriptions(events());
      subscriptions.watch([id('event-1')], visible(m1, m2));
      await flush();
      subscribe.mockClear();

      subscriptions.watch([id('event-1')], visible(m2, m1));
      subscriptions.unwatch([id('event-1')], visible(m1, m2));

      expect(subscribe).not.toHaveBeenCalled();
      expect(unsubscribe).not.toHaveBeenCalled();
    });

    it('applies a re-scope made while the Event is resolving as one subscribe', async () => {
      const { subscriptions, subscribe } = createSubscriptions(events());

      subscriptions.watch([id('event-1')], visible(m1));
      subscriptions.watch([id('event-1')], visible(m1, m3));
      subscriptions.unwatch([id('event-1')], visible(m1));
      await flush();

      expect(subscribe.mock.calls).toEqual([
        ['market', [m1, m3]],
        ['game', [id('event-1')]],
      ]);
    });

    it('ignores ids the Event does not have', async () => {
      const { subscriptions, subscribe, unsubscribe } =
        createSubscriptions(events());

      subscriptions.watch(
        [id('event-1')],
        visible(id('other-event-market'), m2),
      );
      await flush();
      expect(subscribe).toHaveBeenCalledWith('market', [m2]);

      subscriptions.unwatch(
        [id('event-1')],
        visible(id('other-event-market'), m2),
      );
      expect(unsubscribe.mock.calls).toEqual([
        ['market', [m2]],
        ['game', [id('event-1')]],
      ]);
    });

    it('holds the union of a card watcher and a visible watcher', async () => {
      const { subscriptions, subscribe, unsubscribe } =
        createSubscriptions(standardEvents());
      subscriptions.watch([id('event-1')], 'card');
      await flush();
      subscribe.mockClear();

      subscriptions.watch([id('event-1')], visible(m3, m5));
      expect(subscribe.mock.calls).toEqual([['market', [m5]]]);

      subscriptions.unwatch([id('event-1')], 'card');
      expect(unsubscribe.mock.calls).toEqual([['market', [m1, m2]]]);
    });

    it('narrows from every Market to the visible ones when the all watcher leaves', async () => {
      const { subscriptions, unsubscribe } = createSubscriptions(events());
      subscriptions.watch([id('event-1')], 'all');
      subscriptions.watch([id('event-1')], visible(m2));
      await flush();

      subscriptions.unwatch([id('event-1')], 'all');

      expect(unsubscribe.mock.calls).toEqual([['market', [m1, m3, m4, m5]]]);
    });

    it('keeps a Market two visible watchers share until both release it', async () => {
      const { subscriptions, unsubscribe } = createSubscriptions(events());
      subscriptions.watch([id('event-1')], visible(m1, m2));
      subscriptions.watch([id('event-1')], visible(m2, m3));
      await flush();

      subscriptions.unwatch([id('event-1')], visible(m1, m2));
      expect(unsubscribe.mock.calls).toEqual([['market', [m1]]]);

      subscriptions.unwatch([id('event-1')], visible(m2, m3));
      expect(unsubscribe).toHaveBeenLastCalledWith('game', [id('event-1')]);
      expect(unsubscribe).toHaveBeenCalledWith('market', [m2, m3]);
      expect(subscriptions.watchedEventIds).toEqual([]);
    });

    it('replays a joining visible watcher only the held Markets it names', async () => {
      const { subscriptions, replay } = createSubscriptions(standardEvents());
      subscriptions.watch([id('event-1')], 'card');
      await flush();

      subscriptions.watch([id('event-1')], visible(m2, m5));

      expect(replay.mock.calls).toEqual([['market', [m2]]]);
    });
  });

  describe('game window timer', () => {
    // The resolution decides gating from `now`; the timer only has to fire.
    // `setImmediate` stays real so `flush` can still settle the resolution.
    beforeEach(() => {
      jest.useFakeTimers({ doNotFake: ['setImmediate'] });
    });
    afterEach(() => {
      jest.useRealTimers();
    });

    const scheduledEvent = (msFromNow: number) => ({
      'event-1': makeEvent({
        eventId: 'event-1',
        marketIds: ['m-1'],
        gameStatus: 'scheduled',
        startsAt: new Date(NOW + msFromNow).toISOString(),
      }),
    });
    // Kickoff 90 minutes out: 30 minutes outside the 60 minute window.
    const outsideWindow = () =>
      scheduledEvent(PREDICT_LIVE_GAME_WINDOW_MS + 30 * 60_000);

    it('subscribes the game subject when a watched Game enters the window', async () => {
      const { subscriptions, subscribe } = createSubscriptions(outsideWindow());
      subscriptions.watch([id('event-1')]);
      await flush();

      expect(subscribe).toHaveBeenCalledTimes(1);
      expect(subscribe).toHaveBeenCalledWith('market', [id('m-1')]);

      jest.advanceTimersByTime(30 * 60_000);

      expect(subscribe).toHaveBeenCalledTimes(2);
      expect(subscribe).toHaveBeenLastCalledWith('game', [id('event-1')]);
    });

    it('replays and releases the game subject acquired from the timer', async () => {
      const { subscriptions, replay, unsubscribe } =
        createSubscriptions(outsideWindow());
      subscriptions.watch([id('event-1')]);
      await flush();
      jest.advanceTimersByTime(30 * 60_000);

      subscriptions.watch([id('event-1')]);
      expect(replay).toHaveBeenCalledWith('game', [id('event-1')]);

      subscriptions.unwatch([id('event-1')]);
      subscriptions.unwatch([id('event-1')]);
      expect(unsubscribe).toHaveBeenCalledWith('game', [id('event-1')]);
    });

    it('does not fire for an Event released before the window opens', async () => {
      const { subscriptions, subscribe } = createSubscriptions(outsideWindow());
      subscriptions.watch([id('event-1')]);
      await flush();

      subscriptions.unwatch([id('event-1')]);
      jest.advanceTimersByTime(30 * 60_000);

      expect(subscribe).not.toHaveBeenCalledWith('game', [id('event-1')]);
    });

    it('does not fire for an Event cleared before the window opens', async () => {
      const { subscriptions, subscribe } = createSubscriptions(outsideWindow());
      subscriptions.watch([id('event-1')]);
      await flush();

      subscriptions.clear();
      jest.advanceTimersByTime(30 * 60_000);

      expect(subscribe).not.toHaveBeenCalledWith('game', [id('event-1')]);
    });

    it('arms one timer for an Event re-watched while its first resolution is in flight', async () => {
      const { subscriptions, subscribe } = createSubscriptions(outsideWindow());

      subscriptions.watch([id('event-1')]);
      subscriptions.unwatch([id('event-1')]);
      subscriptions.watch([id('event-1')]);
      await flush();

      jest.advanceTimersByTime(30 * 60_000);

      expect(
        subscribe.mock.calls.filter(([topic]) => topic === 'game'),
      ).toEqual([['game', [id('event-1')]]]);
    });

    it('leaves a kickoff beyond the timer ceiling to the next watch', async () => {
      // setTimeout overflows above ~24.8 days and would fire immediately.
      const { subscriptions, subscribe } = createSubscriptions(
        scheduledEvent(40 * 24 * 60 * 60_000),
      );
      subscriptions.watch([id('event-1')]);
      await flush();

      jest.advanceTimersByTime(0);
      expect(subscribe).not.toHaveBeenCalledWith('game', [id('event-1')]);

      jest.advanceTimersByTime(40 * 24 * 60 * 60_000);
      expect(subscribe).not.toHaveBeenCalledWith('game', [id('event-1')]);
    });

    it('does not arm a timer for a Game already inside the window', async () => {
      const { subscriptions, subscribe } = createSubscriptions(
        scheduledEvent(10 * 60_000),
      );
      subscriptions.watch([id('event-1')]);
      await flush();

      expect(subscribe).toHaveBeenCalledWith('game', [id('event-1')]);

      jest.advanceTimersByTime(PREDICT_LIVE_GAME_WINDOW_MS);

      expect(
        subscribe.mock.calls.filter(([topic]) => topic === 'game'),
      ).toHaveLength(1);
    });
  });

  it('clear releases every resolved subscription', async () => {
    const { subscriptions, unsubscribe } = createSubscriptions({
      'event-1': makeEvent({ eventId: 'event-1', marketIds: ['m-1'] }),
      'event-2': makeEvent({
        eventId: 'event-2',
        marketIds: ['m-2'],
        gameStatus: 'in_progress',
      }),
    });
    subscriptions.watch([id('event-1'), id('event-2')]);
    await flush();

    subscriptions.clear();

    expect(unsubscribe).toHaveBeenCalledWith('market', [id('m-1')]);
    expect(unsubscribe).toHaveBeenCalledWith('market', [id('m-2')]);
    expect(unsubscribe).toHaveBeenCalledWith('game', [id('event-2')]);
    expect(subscriptions.watchedEventIds).toEqual([]);
  });
});

describe('getScopedMarketIds', () => {
  const event = makeEvent({
    eventId: 'event-1',
    marketIds: ['m-1', 'm-2', 'm-3', 'm-4', 'm-1'],
  });

  it('resolves explicit visible ids in the Event order, each once', () => {
    expect(
      getScopedMarketIds(event, {
        type: 'visible',
        marketIds: [id('m-4'), id('m-2'), id('m-4')],
      }),
    ).toEqual([id('m-2'), id('m-4')]);
  });

  it('drops visible ids that are not Markets of the Event', () => {
    expect(
      getScopedMarketIds(event, {
        type: 'visible',
        marketIds: [id('elsewhere'), id('m-3')],
      }),
    ).toEqual([id('m-3')]);
  });

  it('resolves an empty visible list to no Markets, not every Market', () => {
    expect(
      getScopedMarketIds(event, { type: 'visible', marketIds: [] }),
    ).toEqual([]);
  });

  it('keeps all as every Market and card as the card Markets', () => {
    expect(getScopedMarketIds(event, 'all')).toEqual(
      ['m-1', 'm-2', 'm-3', 'm-4'].map(id),
    );
    expect(getScopedMarketIds(event, 'card')).toEqual(
      ['m-1', 'm-2', 'm-3'].map(id),
    );
  });
});

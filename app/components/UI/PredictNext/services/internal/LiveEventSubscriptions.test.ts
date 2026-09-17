import type {
  PredictEntityId,
  PredictEvent,
  PredictGameStatus,
  PredictTimestamp,
  PredictVenueId,
} from '../../types';
import {
  LiveEventSubscriptions,
  PREDICT_LIVE_GAME_WINDOW_MS,
  shouldWatchGame,
} from './LiveEventSubscriptions';

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

describe('LiveEventSubscriptions', () => {
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

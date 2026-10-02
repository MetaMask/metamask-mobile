import Logger from '../../../../../util/Logger';
import { PredictError, PredictErrorCode } from '../../errors';
import type {
  PredictEntityId,
  PredictEvent,
  PredictGameStatus,
  PredictTimestamp,
  PredictVenueId,
} from '../../types';
import {
  LiveEventSubscriptions,
  PREDICT_LIVE_RESOLVE_RETRY_BASE_MS,
  PREDICT_LIVE_RESOLVE_RETRY_GAP_MS,
  PREDICT_LIVE_RESOLVE_RETRY_MAX_MS,
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
}: {
  eventId: string;
  marketIds: readonly string[];
  gameStatus?: PredictGameStatus;
}): PredictEvent => ({
  venueId,
  id: id(eventId),
  title: eventId,
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

describe('LiveEventSubscriptions', () => {
  beforeEach(() => {
    mockLoggerLog.mockClear();
  });

  describe('resolution retry', () => {
    // `setImmediate` stays real so `flush` can settle a resolution while
    // `setTimeout` stays fake.
    beforeEach(() => {
      jest.useFakeTimers({ doNotFake: ['setImmediate'] });
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    const rateLimited = () => PredictError.from(PredictErrorCode.RATE_LIMITED);
    const clock = () => Date.now();
    const liveEvent = () =>
      makeEvent({
        eventId: 'event-1',
        marketIds: ['m-1'],
        gameStatus: 'in_progress',
      });

    it('subscribes a still-watched Event after a rate-limited resolution', async () => {
      const events: Record<string, PredictEvent | Error> = {
        'event-1': rateLimited(),
      };
      const { subscriptions, subscribe, unsubscribe, resolveEvent } =
        createSubscriptions(events, clock);

      subscriptions.watch([id('event-1')]);
      await flush();

      expect(resolveEvent).toHaveBeenCalledTimes(1);
      expect(subscribe).not.toHaveBeenCalled();

      jest.advanceTimersByTime(PREDICT_LIVE_RESOLVE_RETRY_BASE_MS - 1);
      await flush();
      expect(resolveEvent).toHaveBeenCalledTimes(1);

      events['event-1'] = liveEvent();
      jest.advanceTimersByTime(1);
      await flush();

      expect(resolveEvent).toHaveBeenCalledTimes(2);
      expect(subscribe).toHaveBeenCalledWith('market', [id('m-1')]);
      expect(subscribe).toHaveBeenCalledWith('game', [id('event-1')]);

      subscriptions.unwatch([id('event-1')]);
      expect(unsubscribe).toHaveBeenCalledWith('market', [id('m-1')]);
      expect(unsubscribe).toHaveBeenCalledWith('game', [id('event-1')]);
      expect(subscriptions.watchedEventIds).toEqual([]);
    });

    it('doubles the delay after another retryable failure', async () => {
      const events: Record<string, PredictEvent | Error> = {
        'event-1': rateLimited(),
      };
      const { subscriptions, resolveEvent } = createSubscriptions(
        events,
        clock,
      );

      subscriptions.watch([id('event-1')]);
      await flush();

      jest.advanceTimersByTime(PREDICT_LIVE_RESOLVE_RETRY_BASE_MS);
      await flush();
      expect(resolveEvent).toHaveBeenCalledTimes(2);

      jest.advanceTimersByTime(PREDICT_LIVE_RESOLVE_RETRY_BASE_MS * 2 - 1);
      await flush();
      expect(resolveEvent).toHaveBeenCalledTimes(2);

      jest.advanceTimersByTime(1);
      await flush();
      expect(resolveEvent).toHaveBeenCalledTimes(3);
    });

    it('keeps retrying a watched Event at the capped delay', async () => {
      const events: Record<string, PredictEvent | Error> = {
        'event-1': rateLimited(),
      };
      const { subscriptions, resolveEvent } = createSubscriptions(
        events,
        clock,
      );

      subscriptions.watch([id('event-1')]);
      await flush();

      let delay = PREDICT_LIVE_RESOLVE_RETRY_BASE_MS;
      while (delay < PREDICT_LIVE_RESOLVE_RETRY_MAX_MS) {
        jest.advanceTimersByTime(delay);
        await flush();
        delay = Math.min(PREDICT_LIVE_RESOLVE_RETRY_MAX_MS, delay * 2);
      }

      const callsAtCap = resolveEvent.mock.calls.length;
      jest.advanceTimersByTime(PREDICT_LIVE_RESOLVE_RETRY_MAX_MS - 1);
      await flush();
      expect(resolveEvent).toHaveBeenCalledTimes(callsAtCap);

      jest.advanceTimersByTime(1);
      await flush();
      expect(resolveEvent).toHaveBeenCalledTimes(callsAtCap + 1);

      jest.advanceTimersByTime(PREDICT_LIVE_RESOLVE_RETRY_MAX_MS);
      await flush();
      expect(resolveEvent).toHaveBeenCalledTimes(callsAtCap + 2);
    });

    it('drops a pending retry when the last watcher leaves', async () => {
      const events: Record<string, PredictEvent | Error> = {
        'event-1': rateLimited(),
      };
      const { subscriptions, subscribe, resolveEvent } = createSubscriptions(
        events,
        clock,
      );

      subscriptions.watch([id('event-1')]);
      await flush();
      subscriptions.unwatch([id('event-1')]);

      events['event-1'] = liveEvent();
      jest.advanceTimersByTime(
        PREDICT_LIVE_RESOLVE_RETRY_BASE_MS + PREDICT_LIVE_RESOLVE_RETRY_GAP_MS,
      );
      await flush();

      expect(resolveEvent).toHaveBeenCalledTimes(1);
      expect(subscribe).not.toHaveBeenCalled();
      expect(subscriptions.watchedEventIds).toEqual([]);
    });

    it('drops a pending retry when subscriptions are cleared', async () => {
      const events: Record<string, PredictEvent | Error> = {
        'event-1': rateLimited(),
      };
      const { subscriptions, subscribe, resolveEvent } = createSubscriptions(
        events,
        clock,
      );

      subscriptions.watch([id('event-1')]);
      await flush();
      subscriptions.clear();

      jest.advanceTimersByTime(PREDICT_LIVE_RESOLVE_RETRY_BASE_MS);
      await flush();

      expect(resolveEvent).toHaveBeenCalledTimes(1);
      expect(subscribe).not.toHaveBeenCalled();
    });

    it('keeps the retry while another watcher remains', async () => {
      const events: Record<string, PredictEvent | Error> = {
        'event-1': rateLimited(),
      };
      const { subscriptions, subscribe, unsubscribe } = createSubscriptions(
        events,
        clock,
      );

      subscriptions.watch([id('event-1')]);
      subscriptions.watch([id('event-1')]);
      await flush();
      subscriptions.unwatch([id('event-1')]);

      events['event-1'] = liveEvent();
      jest.advanceTimersByTime(PREDICT_LIVE_RESOLVE_RETRY_BASE_MS);
      await flush();

      expect(subscribe).toHaveBeenCalledWith('market', [id('m-1')]);

      subscriptions.unwatch([id('event-1')]);
      expect(unsubscribe).toHaveBeenCalledWith('market', [id('m-1')]);
      expect(subscriptions.watchedEventIds).toEqual([]);
    });

    it('resolves immediately when another watch arrives during the backoff', async () => {
      const events: Record<string, PredictEvent | Error> = {
        'event-1': rateLimited(),
      };
      const { subscriptions, subscribe, resolveEvent } = createSubscriptions(
        events,
        clock,
      );

      subscriptions.watch([id('event-1')]);
      await flush();
      events['event-1'] = liveEvent();
      subscriptions.watch([id('event-1')]);
      await flush();

      expect(resolveEvent).toHaveBeenCalledTimes(2);
      expect(subscribe).toHaveBeenCalledWith('market', [id('m-1')]);

      jest.advanceTimersByTime(
        PREDICT_LIVE_RESOLVE_RETRY_BASE_MS + PREDICT_LIVE_RESOLVE_RETRY_GAP_MS,
      );
      await flush();
      expect(resolveEvent).toHaveBeenCalledTimes(2);
    });

    it('leaves a contract failure until the next watch', async () => {
      const events: Record<string, PredictEvent | Error> = {
        'event-1': PredictError.from(PredictErrorCode.INVALID_RESPONSE),
      };
      const { subscriptions, subscribe, resolveEvent } = createSubscriptions(
        events,
        clock,
      );

      subscriptions.watch([id('event-1')]);
      await flush();
      jest.advanceTimersByTime(PREDICT_LIVE_RESOLVE_RETRY_MAX_MS);
      await flush();

      expect(resolveEvent).toHaveBeenCalledTimes(1);
      expect(subscribe).not.toHaveBeenCalled();

      events['event-1'] = liveEvent();
      subscriptions.watch([id('event-1')]);
      await flush();

      expect(resolveEvent).toHaveBeenCalledTimes(2);
      expect(subscribe).toHaveBeenCalledWith('market', [id('m-1')]);
    });

    it('spaces retries when a page of Events fails together', async () => {
      const events: Record<string, PredictEvent | Error> = {
        'event-1': rateLimited(),
        'event-2': rateLimited(),
        'event-3': rateLimited(),
      };
      const { subscriptions, subscribe, resolveEvent } = createSubscriptions(
        events,
        clock,
      );
      const eventFor = (eventId: string, marketId: string) =>
        makeEvent({ eventId, marketIds: [marketId] });

      subscriptions.watch([id('event-1'), id('event-2'), id('event-3')]);
      await flush();
      events['event-1'] = eventFor('event-1', 'm-1');
      events['event-2'] = eventFor('event-2', 'm-2');
      events['event-3'] = eventFor('event-3', 'm-3');

      jest.advanceTimersByTime(PREDICT_LIVE_RESOLVE_RETRY_BASE_MS - 1);
      await flush();
      expect(resolveEvent).toHaveBeenCalledTimes(3);

      jest.advanceTimersByTime(1);
      await flush();
      expect(resolveEvent).toHaveBeenCalledTimes(4);
      expect(subscribe).toHaveBeenCalledTimes(1);
      expect(subscribe).toHaveBeenCalledWith('market', [id('m-1')]);

      jest.advanceTimersByTime(PREDICT_LIVE_RESOLVE_RETRY_GAP_MS - 1);
      await flush();
      expect(resolveEvent).toHaveBeenCalledTimes(4);

      jest.advanceTimersByTime(1);
      await flush();
      expect(resolveEvent).toHaveBeenCalledTimes(5);

      jest.advanceTimersByTime(PREDICT_LIVE_RESOLVE_RETRY_GAP_MS);
      await flush();
      expect(resolveEvent).toHaveBeenCalledTimes(6);
      expect(subscribe).toHaveBeenCalledWith('market', [id('m-2')]);
      expect(subscribe).toHaveBeenCalledWith('market', [id('m-3')]);
    });
  });
});

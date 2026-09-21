import { Messenger } from '@metamask/messenger';
import type { PredictLiveDataClient } from '../adapters/remote/PredictLiveDataClient';
import type { PredictQuote } from '../contracts/v1/liveData';
import type {
  PredictEntityId,
  PredictEvent,
  PredictTimestamp,
  PredictVenueId,
} from '../types';
import {
  PREDICT_LIVE_DATA_SERVICE_NAME,
  PredictLiveDataService,
  type PredictLiveDataServiceMessenger,
} from './PredictLiveDataService';

const venueId = 'kalshi' as PredictVenueId;
const eventId = 'KXTEST-EVENT' as PredictEntityId;
const marketId = 'KXTEST-EVENT-A' as PredictEntityId;

const at = (value: string) => value as PredictTimestamp;

const liveGameEvent: PredictEvent = {
  venueId,
  id: eventId,
  title: 'Test Event',
  sports: {
    sport: { id: 'football' as PredictEntityId, label: 'Football' },
    game: {
      status: 'in_progress',
      homeTeam: { name: 'Home' },
      awayTeam: { name: 'Away' },
      observedAt: at('2026-09-08T12:00:00.000Z'),
    },
  },
  markets: [
    {
      id: marketId,
      question: 'Will Home win?',
      status: 'active',
      outcomes: [
        { id: `${marketId}:yes` as PredictEntityId, side: 'yes', label: 'Yes' },
        { id: `${marketId}:no` as PredictEntityId, side: 'no', label: 'No' },
      ],
    },
  ],
};

const quote = (updatedAt: string, volume = '100.00'): PredictQuote => ({
  venueId,
  marketId,
  outcomes: [
    { id: `${marketId}:yes` as PredictEntityId, side: 'yes' },
    { id: `${marketId}:no` as PredictEntityId, side: 'no' },
  ],
  volume,
  updatedAt: at(updatedAt),
});

const createMessenger = (): PredictLiveDataServiceMessenger =>
  new Messenger({ namespace: PREDICT_LIVE_DATA_SERVICE_NAME });

const createClient = (released: readonly PredictEntityId[] = []) =>
  ({
    subscribe: jest.fn(),
    unsubscribe: jest.fn(() => released),
    destroy: jest.fn(),
  }) as unknown as PredictLiveDataClient;

const flush = () => new Promise<void>((resolve) => setImmediate(resolve));

const createService = ({
  messenger = createMessenger(),
  client = createClient(),
  event = liveGameEvent,
}: {
  messenger?: PredictLiveDataServiceMessenger;
  client?: PredictLiveDataClient;
  event?: PredictEvent;
} = {}) => {
  const resolveEvent = jest.fn(async () => event);
  const service = new PredictLiveDataService({
    messenger,
    createClient: () => client,
    resolveEvent,
    venueId,
  });
  return { service, messenger, client, resolveEvent };
};

/** Watches the fixture Event and waits for its resolution to settle. */
const watchEvent = async (messenger: PredictLiveDataServiceMessenger) => {
  messenger.call(`${PREDICT_LIVE_DATA_SERVICE_NAME}:watchEvents`, venueId, [
    eventId,
  ]);
  await flush();
};

const unwatchEvent = (messenger: PredictLiveDataServiceMessenger) =>
  messenger.call(`${PREDICT_LIVE_DATA_SERVICE_NAME}:unwatchEvents`, venueId, [
    eventId,
  ]);

describe('PredictLiveDataService', () => {
  it('resolves a watched Event and subscribes its Markets and live Game once', async () => {
    const { service, messenger, client, resolveEvent } = createService({
      client: createClient([marketId]),
    });

    await watchEvent(messenger);
    await watchEvent(messenger);

    expect(resolveEvent).toHaveBeenCalledTimes(1);
    expect(resolveEvent).toHaveBeenCalledWith(venueId, eventId);
    expect(client.subscribe).toHaveBeenCalledTimes(2);
    expect(client.subscribe).toHaveBeenCalledWith('market', venueId, [
      marketId,
    ]);
    expect(client.subscribe).toHaveBeenCalledWith('game', venueId, [eventId]);
    expect(service.watchedEventIds).toEqual([eventId]);

    unwatchEvent(messenger);
    expect(client.unsubscribe).not.toHaveBeenCalled();

    unwatchEvent(messenger);
    expect(client.unsubscribe).toHaveBeenCalledWith('market', venueId, [
      marketId,
    ]);
    expect(client.unsubscribe).toHaveBeenCalledWith('game', venueId, [eventId]);
    expect(service.watchedEventIds).toEqual([]);
    service.destroy();
  });

  it('rejects watches for another Venue', () => {
    const { service, messenger } = createService();

    expect(() =>
      messenger.call(
        `${PREDICT_LIVE_DATA_SERVICE_NAME}:watchEvents`,
        'other' as PredictVenueId,
        [eventId],
      ),
    ).toThrow(expect.objectContaining({ code: 'UNSUPPORTED_VENUE' }));
    service.destroy();
  });

  it('releases every subscription on destroy', async () => {
    const { service, messenger, client } = createService();
    await watchEvent(messenger);

    service.destroy();

    expect(client.unsubscribe).toHaveBeenCalledWith('market', venueId, [
      marketId,
    ]);
    expect(client.unsubscribe).toHaveBeenCalledWith('game', venueId, [eventId]);
    expect(client.destroy).toHaveBeenCalled();
  });

  it('publishes game updates for its venue', async () => {
    const { service, messenger } = createService();
    const listener = jest.fn();
    messenger.subscribe(
      `${PREDICT_LIVE_DATA_SERVICE_NAME}:gameLiveUpdated`,
      listener,
    );
    const game = {
      venueId,
      eventId,
      type: 'football_game',
      status: 'in_progress',
      observedAt: at('2026-09-08T13:00:00.000Z'),
    };

    await watchEvent(messenger);
    service.onGameUpdate(game);

    expect(listener).toHaveBeenCalledWith({
      ...game,
      observedAtByField: { status: game.observedAt },
    });
    service.destroy();
  });

  it('replays the last known Game to a watcher that arrives after the snapshot', async () => {
    const { service, messenger } = createService();
    const game = {
      venueId,
      eventId,
      type: 'football_game',
      status: 'in_progress',
      score: { home: '7', away: '0' },
      observedAt: at('2026-09-08T13:00:00.000Z'),
    };
    await watchEvent(messenger);
    service.onGameUpdate(game);

    const listener = jest.fn();
    messenger.subscribe(
      `${PREDICT_LIVE_DATA_SERVICE_NAME}:gameLiveUpdated`,
      listener,
    );
    await watchEvent(messenger);

    expect(listener).toHaveBeenCalledWith({
      ...game,
      observedAtByField: {
        status: game.observedAt,
        score: game.observedAt,
      },
    });
    service.destroy();
  });

  it('drops the cached Game once its last watcher releases it', async () => {
    const { service, messenger } = createService({
      client: createClient([eventId]),
    });
    await watchEvent(messenger);
    service.onGameUpdate({
      venueId,
      eventId,
      type: 'football_game',
      status: 'in_progress',
      observedAt: at('2026-09-08T13:00:00.000Z'),
    });

    unwatchEvent(messenger);
    const listener = jest.fn();
    messenger.subscribe(
      `${PREDICT_LIVE_DATA_SERVICE_NAME}:gameLiveUpdated`,
      listener,
    );
    await watchEvent(messenger);

    expect(listener).not.toHaveBeenCalled();
    service.destroy();
  });

  it('does not recache a Game from frames that arrive after the last watcher', async () => {
    const { service, messenger } = createService({
      client: createClient([eventId]),
    });
    await watchEvent(messenger);
    service.onGameUpdate({
      venueId,
      eventId,
      type: 'football_game',
      score: { home: '7', away: '0' },
      observedAt: at('2026-09-08T13:00:00.000Z'),
    });
    unwatchEvent(messenger);
    service.onGameUpdate({
      venueId,
      eventId,
      type: 'football_game',
      score: { home: '14', away: '0' },
      observedAt: at('2026-09-08T13:05:00.000Z'),
    });

    const listener = jest.fn();
    messenger.subscribe(
      `${PREDICT_LIVE_DATA_SERVICE_NAME}:gameLiveUpdated`,
      listener,
    );
    await watchEvent(messenger);

    expect(listener).not.toHaveBeenCalled();
    service.destroy();
  });

  it('keeps the newer Game when an older snapshot arrives later', async () => {
    const { service, messenger } = createService();
    const listener = jest.fn();
    messenger.subscribe(
      `${PREDICT_LIVE_DATA_SERVICE_NAME}:gameLiveUpdated`,
      listener,
    );
    const newer = {
      venueId,
      eventId,
      type: 'football_game',
      score: { home: '21', away: '0' },
      observedAt: at('2026-09-08T13:00:00.000Z'),
    };
    const older = {
      venueId,
      eventId,
      type: 'football_game',
      score: { home: '14', away: '0' },
      observedAt: at('2026-09-08T12:30:00.000Z'),
    };

    await watchEvent(messenger);
    service.onGameUpdate(newer);
    service.onGameUpdate(older);

    const accumulatedNewer = {
      ...newer,
      observedAtByField: { score: newer.observedAt },
    };

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(accumulatedNewer);

    const replay = jest.fn();
    messenger.subscribe(
      `${PREDICT_LIVE_DATA_SERVICE_NAME}:gameLiveUpdated`,
      replay,
    );
    await watchEvent(messenger);

    expect(replay).toHaveBeenCalledWith(accumulatedNewer);
    service.destroy();
  });

  it('replays the accumulated Game patch, not only the latest partial frame', async () => {
    const { service, messenger } = createService();
    const listener = jest.fn();
    messenger.subscribe(
      `${PREDICT_LIVE_DATA_SERVICE_NAME}:gameLiveUpdated`,
      listener,
    );

    await watchEvent(messenger);
    service.onGameUpdate({
      venueId,
      eventId,
      type: 'football_game',
      status: 'in_progress',
      score: { home: '7', away: '0' },
      period: 'Q2',
      observedAt: at('2026-09-08T13:00:00.000Z'),
    });
    service.onGameUpdate({
      venueId,
      eventId,
      type: 'football_game',
      clock: '07:42',
      observedAt: at('2026-09-08T13:01:00.000Z'),
    });

    expect(listener).toHaveBeenNthCalledWith(2, {
      venueId,
      eventId,
      type: 'football_game',
      status: 'in_progress',
      score: { home: '7', away: '0' },
      period: 'Q2',
      clock: '07:42',
      observedAt: at('2026-09-08T13:01:00.000Z'),
      observedAtByField: {
        status: at('2026-09-08T13:00:00.000Z'),
        score: at('2026-09-08T13:00:00.000Z'),
        period: at('2026-09-08T13:00:00.000Z'),
        clock: at('2026-09-08T13:01:00.000Z'),
      },
    });

    const replay = jest.fn();
    messenger.subscribe(
      `${PREDICT_LIVE_DATA_SERVICE_NAME}:gameLiveUpdated`,
      replay,
    );
    await watchEvent(messenger);

    expect(replay).toHaveBeenCalledWith({
      venueId,
      eventId,
      type: 'football_game',
      status: 'in_progress',
      score: { home: '7', away: '0' },
      period: 'Q2',
      clock: '07:42',
      observedAt: at('2026-09-08T13:01:00.000Z'),
      observedAtByField: {
        status: at('2026-09-08T13:00:00.000Z'),
        score: at('2026-09-08T13:00:00.000Z'),
        period: at('2026-09-08T13:00:00.000Z'),
        clock: at('2026-09-08T13:01:00.000Z'),
      },
    });
    service.destroy();
  });

  it('publishes quote updates for watched markets of its venue', async () => {
    const { service, messenger } = createService();
    const listener = jest.fn();
    messenger.subscribe(
      `${PREDICT_LIVE_DATA_SERVICE_NAME}:quoteUpdated`,
      listener,
    );
    const update = quote('2026-09-08T13:00:00.000Z');

    service.onQuoteUpdate(update);
    expect(listener).not.toHaveBeenCalled();

    await watchEvent(messenger);
    service.onQuoteUpdate(update);
    service.onQuoteUpdate({ ...update, venueId: 'other' as PredictVenueId });

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(update);
    service.destroy();
  });

  it('replays the last quote to a later market watcher and drops it on release', async () => {
    const { service, messenger } = createService({
      client: createClient([marketId]),
    });
    const update = quote('2026-09-08T13:00:00.000Z');
    await watchEvent(messenger);
    service.onQuoteUpdate(update);

    const replay = jest.fn();
    messenger.subscribe(
      `${PREDICT_LIVE_DATA_SERVICE_NAME}:quoteUpdated`,
      replay,
    );
    await watchEvent(messenger);
    expect(replay).toHaveBeenCalledWith(update);

    unwatchEvent(messenger);
    unwatchEvent(messenger);
    replay.mockClear();
    await watchEvent(messenger);

    expect(replay).not.toHaveBeenCalled();
    service.destroy();
  });

  it('keeps the newer quote when an older one arrives later', async () => {
    const { service, messenger } = createService();
    const listener = jest.fn();
    messenger.subscribe(
      `${PREDICT_LIVE_DATA_SERVICE_NAME}:quoteUpdated`,
      listener,
    );
    const newer = quote('2026-09-08T13:00:00.000Z', '200.00');
    const older = quote('2026-09-08T12:30:00.000Z', '100.00');

    await watchEvent(messenger);
    service.onQuoteUpdate(newer);
    service.onQuoteUpdate(older);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(newer);
    service.destroy();
  });
});

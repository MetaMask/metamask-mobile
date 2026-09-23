import { Messenger } from '@metamask/messenger';
import type { PredictLiveDataClient } from '../adapters/remote/PredictLiveDataClient';
import type { PredictQuote } from '../contracts/v1/liveData';
import type {
  PredictEntityId,
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

describe('PredictLiveDataService', () => {
  it('subscribes and unsubscribes through messenger actions', () => {
    const messenger = createMessenger();
    const client = createClient();
    const service = new PredictLiveDataService({
      messenger,
      createClient: () => client,
      venueId,
    });

    messenger.call(`${PREDICT_LIVE_DATA_SERVICE_NAME}:watchGames`, venueId, [
      eventId,
    ]);
    messenger.call(`${PREDICT_LIVE_DATA_SERVICE_NAME}:unwatchGames`, venueId, [
      eventId,
    ]);

    expect(client.subscribe).toHaveBeenCalledWith('game', venueId, [eventId]);
    expect(client.unsubscribe).toHaveBeenCalledWith('game', venueId, [eventId]);

    messenger.call(`${PREDICT_LIVE_DATA_SERVICE_NAME}:watchMarkets`, venueId, [
      marketId,
    ]);
    messenger.call(
      `${PREDICT_LIVE_DATA_SERVICE_NAME}:unwatchMarkets`,
      venueId,
      [marketId],
    );

    expect(client.subscribe).toHaveBeenCalledWith('market', venueId, [
      marketId,
    ]);
    expect(client.unsubscribe).toHaveBeenCalledWith('market', venueId, [
      marketId,
    ]);
    service.destroy();
  });

  it('publishes game updates for its venue', () => {
    const messenger = createMessenger();
    const service = new PredictLiveDataService({
      messenger,
      createClient: () => createClient(),
      venueId,
    });
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

    messenger.call(`${PREDICT_LIVE_DATA_SERVICE_NAME}:watchGames`, venueId, [
      eventId,
    ]);
    service.onGameUpdate(game);

    expect(listener).toHaveBeenCalledWith({
      ...game,
      observedAtByField: { status: game.observedAt },
    });
    service.destroy();
  });

  it('replays the last known Game to a watcher that arrives after the snapshot', () => {
    const messenger = createMessenger();
    const service = new PredictLiveDataService({
      messenger,
      createClient: () => createClient(),
      venueId,
    });
    const game = {
      venueId,
      eventId,
      type: 'football_game',
      status: 'in_progress',
      score: { home: '7', away: '0' },
      observedAt: at('2026-09-08T13:00:00.000Z'),
    };
    messenger.call(`${PREDICT_LIVE_DATA_SERVICE_NAME}:watchGames`, venueId, [
      eventId,
    ]);
    service.onGameUpdate(game);

    const listener = jest.fn();
    messenger.subscribe(
      `${PREDICT_LIVE_DATA_SERVICE_NAME}:gameLiveUpdated`,
      listener,
    );
    messenger.call(`${PREDICT_LIVE_DATA_SERVICE_NAME}:watchGames`, venueId, [
      eventId,
    ]);

    expect(listener).toHaveBeenCalledWith({
      ...game,
      observedAtByField: {
        status: game.observedAt,
        score: game.observedAt,
      },
    });
    service.destroy();
  });

  it('drops the cached Game once its last watcher releases it', () => {
    const messenger = createMessenger();
    const service = new PredictLiveDataService({
      messenger,
      createClient: () => createClient([eventId]),
      venueId,
    });
    messenger.call(`${PREDICT_LIVE_DATA_SERVICE_NAME}:watchGames`, venueId, [
      eventId,
    ]);
    service.onGameUpdate({
      venueId,
      eventId,
      type: 'football_game',
      status: 'in_progress',
      observedAt: at('2026-09-08T13:00:00.000Z'),
    });

    messenger.call(`${PREDICT_LIVE_DATA_SERVICE_NAME}:unwatchGames`, venueId, [
      eventId,
    ]);
    const listener = jest.fn();
    messenger.subscribe(
      `${PREDICT_LIVE_DATA_SERVICE_NAME}:gameLiveUpdated`,
      listener,
    );
    messenger.call(`${PREDICT_LIVE_DATA_SERVICE_NAME}:watchGames`, venueId, [
      eventId,
    ]);

    expect(listener).not.toHaveBeenCalled();
    service.destroy();
  });

  it('does not recache a Game from frames that arrive after the last watcher', () => {
    const messenger = createMessenger();
    const service = new PredictLiveDataService({
      messenger,
      createClient: () => createClient([eventId]),
      venueId,
    });
    messenger.call(`${PREDICT_LIVE_DATA_SERVICE_NAME}:watchGames`, venueId, [
      eventId,
    ]);
    service.onGameUpdate({
      venueId,
      eventId,
      type: 'football_game',
      score: { home: '7', away: '0' },
      observedAt: at('2026-09-08T13:00:00.000Z'),
    });
    messenger.call(`${PREDICT_LIVE_DATA_SERVICE_NAME}:unwatchGames`, venueId, [
      eventId,
    ]);
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
    messenger.call(`${PREDICT_LIVE_DATA_SERVICE_NAME}:watchGames`, venueId, [
      eventId,
    ]);

    expect(listener).not.toHaveBeenCalled();
    service.destroy();
  });

  it('keeps the newer Game when an older snapshot arrives later', () => {
    const messenger = createMessenger();
    const service = new PredictLiveDataService({
      messenger,
      createClient: () => createClient(),
      venueId,
    });
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

    messenger.call(`${PREDICT_LIVE_DATA_SERVICE_NAME}:watchGames`, venueId, [
      eventId,
    ]);
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
    messenger.call(`${PREDICT_LIVE_DATA_SERVICE_NAME}:watchGames`, venueId, [
      eventId,
    ]);

    expect(replay).toHaveBeenCalledWith(accumulatedNewer);
    service.destroy();
  });

  it('replays the accumulated Game patch, not only the latest partial frame', () => {
    const messenger = createMessenger();
    const service = new PredictLiveDataService({
      messenger,
      createClient: () => createClient(),
      venueId,
    });
    const listener = jest.fn();
    messenger.subscribe(
      `${PREDICT_LIVE_DATA_SERVICE_NAME}:gameLiveUpdated`,
      listener,
    );

    messenger.call(`${PREDICT_LIVE_DATA_SERVICE_NAME}:watchGames`, venueId, [
      eventId,
    ]);
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
    messenger.call(`${PREDICT_LIVE_DATA_SERVICE_NAME}:watchGames`, venueId, [
      eventId,
    ]);

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

  it('publishes quote updates for watched markets of its venue', () => {
    const messenger = createMessenger();
    const service = new PredictLiveDataService({
      messenger,
      createClient: () => createClient(),
      venueId,
    });
    const listener = jest.fn();
    messenger.subscribe(
      `${PREDICT_LIVE_DATA_SERVICE_NAME}:quoteUpdated`,
      listener,
    );
    const update = quote('2026-09-08T13:00:00.000Z');

    service.onQuoteUpdate(update);
    expect(listener).not.toHaveBeenCalled();

    messenger.call(`${PREDICT_LIVE_DATA_SERVICE_NAME}:watchMarkets`, venueId, [
      marketId,
    ]);
    service.onQuoteUpdate(update);
    service.onQuoteUpdate({ ...update, venueId: 'other' as PredictVenueId });

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(update);
    service.destroy();
  });

  it('replays the last quote to a later market watcher and drops it on release', () => {
    const messenger = createMessenger();
    const service = new PredictLiveDataService({
      messenger,
      createClient: () => createClient([marketId]),
      venueId,
    });
    const update = quote('2026-09-08T13:00:00.000Z');
    messenger.call(`${PREDICT_LIVE_DATA_SERVICE_NAME}:watchMarkets`, venueId, [
      marketId,
    ]);
    service.onQuoteUpdate(update);

    const replay = jest.fn();
    messenger.subscribe(
      `${PREDICT_LIVE_DATA_SERVICE_NAME}:quoteUpdated`,
      replay,
    );
    messenger.call(`${PREDICT_LIVE_DATA_SERVICE_NAME}:watchMarkets`, venueId, [
      marketId,
    ]);
    expect(replay).toHaveBeenCalledWith(update);

    messenger.call(
      `${PREDICT_LIVE_DATA_SERVICE_NAME}:unwatchMarkets`,
      venueId,
      [marketId],
    );
    messenger.call(
      `${PREDICT_LIVE_DATA_SERVICE_NAME}:unwatchMarkets`,
      venueId,
      [marketId],
    );
    replay.mockClear();
    messenger.call(`${PREDICT_LIVE_DATA_SERVICE_NAME}:watchMarkets`, venueId, [
      marketId,
    ]);

    expect(replay).not.toHaveBeenCalled();
    service.destroy();
  });

  it('keeps the newer quote when an older one arrives later', () => {
    const messenger = createMessenger();
    const service = new PredictLiveDataService({
      messenger,
      createClient: () => createClient(),
      venueId,
    });
    const listener = jest.fn();
    messenger.subscribe(
      `${PREDICT_LIVE_DATA_SERVICE_NAME}:quoteUpdated`,
      listener,
    );
    const newer = quote('2026-09-08T13:00:00.000Z', '200.00');
    const older = quote('2026-09-08T12:30:00.000Z', '100.00');

    messenger.call(`${PREDICT_LIVE_DATA_SERVICE_NAME}:watchMarkets`, venueId, [
      marketId,
    ]);
    service.onQuoteUpdate(newer);
    service.onQuoteUpdate(older);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(newer);
    service.destroy();
  });
});

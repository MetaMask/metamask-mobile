import { Messenger } from '@metamask/messenger';
import type { PredictLiveDataClient } from '../adapters/remote/PredictLiveDataClient';
import type { PredictEntityId, PredictVenueId } from '../types';
import {
  PREDICT_LIVE_DATA_SERVICE_NAME,
  PredictLiveDataService,
  type PredictLiveDataServiceMessenger,
} from './PredictLiveDataService';

const venueId = 'kalshi' as PredictVenueId;
const eventId = 'KXTEST-EVENT' as PredictEntityId;

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

    expect(client.subscribe).toHaveBeenCalledWith(venueId, [eventId]);
    expect(client.unsubscribe).toHaveBeenCalledWith(venueId, [eventId]);
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
      details: { status: 'live' },
    };

    messenger.call(`${PREDICT_LIVE_DATA_SERVICE_NAME}:watchGames`, venueId, [
      eventId,
    ]);
    service.onGameUpdate(game);

    expect(listener).toHaveBeenCalledWith(game);
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
      details: { status: 'live', home_points: 7 },
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

    expect(listener).toHaveBeenCalledWith(game);
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
      details: { status: 'live' },
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
      details: { status: 'live', home_points: 7 },
    });
    messenger.call(`${PREDICT_LIVE_DATA_SERVICE_NAME}:unwatchGames`, venueId, [
      eventId,
    ]);
    service.onGameUpdate({
      venueId,
      eventId,
      type: 'football_game',
      details: { status: 'live', home_points: 14 },
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
      details: {
        home_points: 21,
        last_updated_ts: Date.parse('2026-09-08T13:00:00.000Z') / 1000,
      },
    };
    const older = {
      venueId,
      eventId,
      type: 'football_game',
      details: {
        home_points: 14,
        last_updated_ts: Date.parse('2026-09-08T12:30:00.000Z') / 1000,
      },
    };

    messenger.call(`${PREDICT_LIVE_DATA_SERVICE_NAME}:watchGames`, venueId, [
      eventId,
    ]);
    service.onGameUpdate(newer);
    service.onGameUpdate(older);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(newer);

    const replay = jest.fn();
    messenger.subscribe(
      `${PREDICT_LIVE_DATA_SERVICE_NAME}:gameLiveUpdated`,
      replay,
    );
    messenger.call(`${PREDICT_LIVE_DATA_SERVICE_NAME}:watchGames`, venueId, [
      eventId,
    ]);

    expect(replay).toHaveBeenCalledWith(newer);
    service.destroy();
  });

  it('keeps the stamped Game when an unstamped frame arrives later', () => {
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
    const stamped = {
      venueId,
      eventId,
      type: 'football_game',
      details: {
        home_points: 21,
        last_updated_ts: Date.parse('2026-09-08T13:00:00.000Z') / 1000,
      },
    };
    const unstamped = {
      venueId,
      eventId,
      type: 'football_game',
      details: { status: 'live', home_points: 14 },
    };

    messenger.call(`${PREDICT_LIVE_DATA_SERVICE_NAME}:watchGames`, venueId, [
      eventId,
    ]);
    service.onGameUpdate(stamped);
    service.onGameUpdate(unstamped);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(stamped);
    service.destroy();
  });
});

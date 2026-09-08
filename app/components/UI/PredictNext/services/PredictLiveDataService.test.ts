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

const createClient = () =>
  ({
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
    destroy: jest.fn(),
  }) as unknown as PredictLiveDataClient;

describe('PredictLiveDataService', () => {
  it('subscribes and unsubscribes through messenger actions', () => {
    const messenger = createMessenger();
    const client = createClient();
    const service = new PredictLiveDataService({
      messenger,
      client,
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
      client: createClient(),
      venueId,
    });
    const listener = jest.fn();
    messenger.subscribe(
      `${PREDICT_LIVE_DATA_SERVICE_NAME}:gameLiveUpdated`,
      listener,
    );
    const update = {
      venueId,
      eventId,
      game: { type: 'football_game', details: { status: 'live' } },
    };

    service.onGameUpdate(update);

    expect(listener).toHaveBeenCalledWith(update);
    service.destroy();
  });
});

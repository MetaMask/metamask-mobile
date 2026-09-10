import type { Messenger } from '@metamask/messenger';
import type { PredictLiveDataTransport } from '../adapters/remote/PredictLiveDataClient';
import type { PredictGameLive } from '../contracts/v1/liveData';
import { PredictError, PredictErrorCode } from '../errors';
import type { PredictEntityId, PredictVenueId } from '../types';

export const PREDICT_LIVE_DATA_SERVICE_NAME = 'PredictLiveDataService' as const;

export interface PredictLiveDataServiceWatchGamesAction {
  type: 'PredictLiveDataService:watchGames';
  handler: (
    venueId: PredictVenueId,
    eventIds: readonly PredictEntityId[],
  ) => void;
}

export interface PredictLiveDataServiceUnwatchGamesAction {
  type: 'PredictLiveDataService:unwatchGames';
  handler: (
    venueId: PredictVenueId,
    eventIds: readonly PredictEntityId[],
  ) => void;
}

export interface PredictLiveDataServiceGameLiveUpdatedEvent {
  type: 'PredictLiveDataService:gameLiveUpdated';
  payload: [PredictGameLive];
}

export type PredictLiveDataServiceActions =
  | PredictLiveDataServiceWatchGamesAction
  | PredictLiveDataServiceUnwatchGamesAction;

export type PredictLiveDataServiceEvents =
  PredictLiveDataServiceGameLiveUpdatedEvent;

export type PredictLiveDataServiceMessenger = Messenger<
  typeof PREDICT_LIVE_DATA_SERVICE_NAME,
  PredictLiveDataServiceActions,
  PredictLiveDataServiceEvents
>;

export interface PredictLiveDataServiceOptions {
  messenger: PredictLiveDataServiceMessenger;
  client: PredictLiveDataTransport;
  venueId: PredictVenueId;
}

export class PredictLiveDataService {
  readonly #messenger: PredictLiveDataServiceMessenger;
  readonly #client: PredictLiveDataTransport;
  readonly #venueId: PredictVenueId;

  constructor({ messenger, client, venueId }: PredictLiveDataServiceOptions) {
    this.#messenger = messenger;
    this.#client = client;
    this.#venueId = venueId;

    messenger.registerActionHandler(
      'PredictLiveDataService:watchGames',
      this.watchGames.bind(this),
    );
    messenger.registerActionHandler(
      'PredictLiveDataService:unwatchGames',
      this.unwatchGames.bind(this),
    );
  }

  watchGames(
    venueId: PredictVenueId,
    eventIds: readonly PredictEntityId[],
  ): void {
    this.#assertVenue(venueId);
    this.#client.subscribe(venueId, eventIds);
  }

  unwatchGames(
    venueId: PredictVenueId,
    eventIds: readonly PredictEntityId[],
  ): void {
    this.#assertVenue(venueId);
    this.#client.unsubscribe(venueId, eventIds);
  }

  onGameUpdate(game: PredictGameLive): void {
    if (game.venueId !== this.#venueId) {
      return;
    }
    this.#messenger.publish('PredictLiveDataService:gameLiveUpdated', game);
  }

  destroy(): void {
    this.#messenger.unregisterActionHandler(
      'PredictLiveDataService:watchGames',
    );
    this.#messenger.unregisterActionHandler(
      'PredictLiveDataService:unwatchGames',
    );
    this.#client.destroy();
  }

  #assertVenue(venueId: PredictVenueId): void {
    if (venueId !== this.#venueId) {
      throw PredictError.from(PredictErrorCode.UNSUPPORTED_VENUE);
    }
  }
}

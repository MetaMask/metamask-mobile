import type { Messenger } from '@metamask/messenger';
import { isOlderKalshiLiveFrame } from '../adapters/remote/mapKalshiGameLiveUpdate';
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

export type PredictLiveDataTransportFactory = (
  onGameUpdate: (game: PredictGameLive) => void,
) => PredictLiveDataTransport;

export interface PredictLiveDataServiceOptions {
  messenger: PredictLiveDataServiceMessenger;
  createClient: PredictLiveDataTransportFactory;
  venueId: PredictVenueId;
}

export class PredictLiveDataService {
  readonly #messenger: PredictLiveDataServiceMessenger;
  readonly #client: PredictLiveDataTransport;
  readonly #venueId: PredictVenueId;
  readonly #games = new Map<PredictEntityId, PredictGameLive>();

  constructor({
    messenger,
    createClient,
    venueId,
  }: PredictLiveDataServiceOptions) {
    this.#messenger = messenger;
    this.#venueId = venueId;
    this.#client = createClient((game) => this.onGameUpdate(game));

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

    // The Venue only sends a snapshot when an Event is first subscribed, so a
    // screen opened over an existing watcher would otherwise render the stale
    // read-model Game until the next update.
    eventIds.forEach((eventId) => {
      const game = this.#games.get(eventId);
      if (game) {
        this.#messenger.publish('PredictLiveDataService:gameLiveUpdated', game);
      }
    });
  }

  unwatchGames(
    venueId: PredictVenueId,
    eventIds: readonly PredictEntityId[],
  ): void {
    this.#assertVenue(venueId);
    this.#client
      .unsubscribe(venueId, eventIds)
      .forEach((eventId) => this.#games.delete(eventId));
  }

  onGameUpdate(game: PredictGameLive): void {
    if (game.venueId !== this.#venueId) {
      return;
    }
    const previous = this.#games.get(game.eventId);
    if (previous && isOlderKalshiLiveFrame(game, previous)) {
      return;
    }
    this.#games.set(game.eventId, game);
    this.#messenger.publish('PredictLiveDataService:gameLiveUpdated', game);
  }

  destroy(): void {
    this.#messenger.unregisterActionHandler(
      'PredictLiveDataService:watchGames',
    );
    this.#messenger.unregisterActionHandler(
      'PredictLiveDataService:unwatchGames',
    );
    this.#games.clear();
    this.#client.destroy();
  }

  #assertVenue(venueId: PredictVenueId): void {
    if (venueId !== this.#venueId) {
      throw PredictError.from(PredictErrorCode.UNSUPPORTED_VENUE);
    }
  }
}

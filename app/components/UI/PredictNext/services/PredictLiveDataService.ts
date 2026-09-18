import type { Messenger } from '@metamask/messenger';
import type { PredictLiveDataTransport } from '../adapters/remote/PredictLiveDataClient';
import type {
  PredictGameLive,
  PredictLiveDataTopic,
  PredictQuote,
} from '../contracts/v1/liveData';
import { PredictError, PredictErrorCode } from '../errors';
import type { PredictEntityId, PredictVenueId } from '../types';
import { isOlderLiveFrame, mergeGameLiveFrames } from '../utils/mergeLiveData';

export const PREDICT_LIVE_DATA_SERVICE_NAME = 'PredictLiveDataService' as const;

type WatchHandler = (
  venueId: PredictVenueId,
  ids: readonly PredictEntityId[],
) => void;

export interface PredictLiveDataServiceWatchGamesAction {
  type: 'PredictLiveDataService:watchGames';
  handler: WatchHandler;
}

export interface PredictLiveDataServiceUnwatchGamesAction {
  type: 'PredictLiveDataService:unwatchGames';
  handler: WatchHandler;
}

export interface PredictLiveDataServiceWatchMarketsAction {
  type: 'PredictLiveDataService:watchMarkets';
  handler: WatchHandler;
}

export interface PredictLiveDataServiceUnwatchMarketsAction {
  type: 'PredictLiveDataService:unwatchMarkets';
  handler: WatchHandler;
}

export interface PredictLiveDataServiceGameLiveUpdatedEvent {
  type: 'PredictLiveDataService:gameLiveUpdated';
  payload: [PredictGameLive];
}

export interface PredictLiveDataServiceQuoteUpdatedEvent {
  type: 'PredictLiveDataService:quoteUpdated';
  payload: [PredictQuote];
}

export type PredictLiveDataServiceActions =
  | PredictLiveDataServiceWatchGamesAction
  | PredictLiveDataServiceUnwatchGamesAction
  | PredictLiveDataServiceWatchMarketsAction
  | PredictLiveDataServiceUnwatchMarketsAction;

export type PredictLiveDataServiceEvents =
  | PredictLiveDataServiceGameLiveUpdatedEvent
  | PredictLiveDataServiceQuoteUpdatedEvent;

export type PredictLiveDataServiceMessenger = Messenger<
  typeof PREDICT_LIVE_DATA_SERVICE_NAME,
  PredictLiveDataServiceActions,
  PredictLiveDataServiceEvents
>;

export interface PredictLiveDataTransportCallbacks {
  onGameUpdate: (game: PredictGameLive) => void;
  onQuoteUpdate: (quote: PredictQuote) => void;
}

export type PredictLiveDataTransportFactory = (
  callbacks: PredictLiveDataTransportCallbacks,
) => PredictLiveDataTransport;

export interface PredictLiveDataServiceOptions {
  messenger: PredictLiveDataServiceMessenger;
  createClient: PredictLiveDataTransportFactory;
  venueId: PredictVenueId;
}

/**
 * Last-value cache plus watcher refcounts for one topic. The transport does
 * its own refcounting for the wire; this copy exists so a screen that mounts
 * over an existing watcher can be replayed the current value immediately.
 */
class TopicCache<TValue> {
  readonly values = new Map<PredictEntityId, TValue>();
  readonly watchCounts = new Map<PredictEntityId, number>();

  watch(ids: readonly PredictEntityId[]): void {
    ids.forEach((id) => {
      this.watchCounts.set(id, (this.watchCounts.get(id) ?? 0) + 1);
    });
  }

  unwatch(ids: readonly PredictEntityId[]): void {
    ids.forEach((id) => {
      const held = this.watchCounts.get(id);
      if (held === undefined) {
        return;
      }
      if (held > 1) {
        this.watchCounts.set(id, held - 1);
        return;
      }
      this.watchCounts.delete(id);
    });
  }

  clear(): void {
    this.values.clear();
    this.watchCounts.clear();
  }
}

export class PredictLiveDataService {
  readonly #messenger: PredictLiveDataServiceMessenger;
  readonly #client: PredictLiveDataTransport;
  readonly #venueId: PredictVenueId;
  readonly #games = new TopicCache<PredictGameLive>();
  readonly #quotes = new TopicCache<PredictQuote>();

  constructor({
    messenger,
    createClient,
    venueId,
  }: PredictLiveDataServiceOptions) {
    this.#messenger = messenger;
    this.#venueId = venueId;
    this.#client = createClient({
      onGameUpdate: (game) => this.onGameUpdate(game),
      onQuoteUpdate: (quote) => this.onQuoteUpdate(quote),
    });

    messenger.registerActionHandler(
      'PredictLiveDataService:watchGames',
      this.watchGames.bind(this),
    );
    messenger.registerActionHandler(
      'PredictLiveDataService:unwatchGames',
      this.unwatchGames.bind(this),
    );
    messenger.registerActionHandler(
      'PredictLiveDataService:watchMarkets',
      this.watchMarkets.bind(this),
    );
    messenger.registerActionHandler(
      'PredictLiveDataService:unwatchMarkets',
      this.unwatchMarkets.bind(this),
    );
  }

  watchGames(
    venueId: PredictVenueId,
    eventIds: readonly PredictEntityId[],
  ): void {
    this.#watch('game', this.#games, venueId, eventIds, (game) =>
      this.#messenger.publish('PredictLiveDataService:gameLiveUpdated', game),
    );
  }

  unwatchGames(
    venueId: PredictVenueId,
    eventIds: readonly PredictEntityId[],
  ): void {
    this.#unwatch('game', this.#games, venueId, eventIds);
  }

  watchMarkets(
    venueId: PredictVenueId,
    marketIds: readonly PredictEntityId[],
  ): void {
    this.#watch('market', this.#quotes, venueId, marketIds, (quote) =>
      this.#messenger.publish('PredictLiveDataService:quoteUpdated', quote),
    );
  }

  unwatchMarkets(
    venueId: PredictVenueId,
    marketIds: readonly PredictEntityId[],
  ): void {
    this.#unwatch('market', this.#quotes, venueId, marketIds);
  }

  onGameUpdate(game: PredictGameLive): void {
    if (game.venueId !== this.#venueId) {
      return;
    }
    if (!this.#games.watchCounts.has(game.eventId)) {
      return;
    }
    const merged = mergeGameLiveFrames(
      this.#games.values.get(game.eventId),
      game,
    );
    if (!merged) {
      return;
    }
    this.#games.values.set(game.eventId, merged);
    this.#messenger.publish('PredictLiveDataService:gameLiveUpdated', merged);
  }

  onQuoteUpdate(quote: PredictQuote): void {
    if (quote.venueId !== this.#venueId) {
      return;
    }
    if (!this.#quotes.watchCounts.has(quote.marketId)) {
      return;
    }
    const previous = this.#quotes.values.get(quote.marketId);
    if (
      previous &&
      isOlderLiveFrame(
        { observedAt: quote.updatedAt },
        { observedAt: previous.updatedAt },
      )
    ) {
      return;
    }
    this.#quotes.values.set(quote.marketId, quote);
    this.#messenger.publish('PredictLiveDataService:quoteUpdated', quote);
  }

  destroy(): void {
    this.#messenger.unregisterActionHandler(
      'PredictLiveDataService:watchGames',
    );
    this.#messenger.unregisterActionHandler(
      'PredictLiveDataService:unwatchGames',
    );
    this.#messenger.unregisterActionHandler(
      'PredictLiveDataService:watchMarkets',
    );
    this.#messenger.unregisterActionHandler(
      'PredictLiveDataService:unwatchMarkets',
    );
    this.#games.clear();
    this.#quotes.clear();
    this.#client.destroy();
  }

  #watch<TValue>(
    topic: PredictLiveDataTopic,
    cache: TopicCache<TValue>,
    venueId: PredictVenueId,
    ids: readonly PredictEntityId[],
    replay: (value: TValue) => void,
  ): void {
    this.#assertVenue(venueId);
    cache.watch(ids);
    this.#client.subscribe(topic, venueId, ids);

    // The Venue only sends a snapshot when an id is first subscribed, so a
    // screen opened over an existing watcher would otherwise render the stale
    // read-model value until the next update.
    ids.forEach((id) => {
      const value = cache.values.get(id);
      if (value) {
        replay(value);
      }
    });
  }

  #unwatch<TValue>(
    topic: PredictLiveDataTopic,
    cache: TopicCache<TValue>,
    venueId: PredictVenueId,
    ids: readonly PredictEntityId[],
  ): void {
    this.#assertVenue(venueId);
    cache.unwatch(ids);
    this.#client
      .unsubscribe(topic, venueId, ids)
      .forEach((id) => cache.values.delete(id));
  }

  #assertVenue(venueId: PredictVenueId): void {
    if (venueId !== this.#venueId) {
      throw PredictError.from(PredictErrorCode.UNSUPPORTED_VENUE);
    }
  }
}

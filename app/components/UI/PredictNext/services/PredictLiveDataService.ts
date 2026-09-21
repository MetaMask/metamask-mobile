import type { Messenger } from '@metamask/messenger';
import type { PredictLiveDataTransport } from '../adapters/remote/PredictLiveDataClient';
import type {
  PredictGameLive,
  PredictLiveDataTopic,
  PredictQuote,
} from '../contracts/v1/liveData';
import { PredictError, PredictErrorCode } from '../errors';
import type { PredictEntityId, PredictEvent, PredictVenueId } from '../types';
import { isOlderLiveFrame, mergeGameLiveFrames } from '../utils/mergeLiveData';
import { LiveEventSubscriptions } from './internal/LiveEventSubscriptions';

export const PREDICT_LIVE_DATA_SERVICE_NAME = 'PredictLiveDataService' as const;

type WatchHandler = (
  venueId: PredictVenueId,
  eventIds: readonly PredictEntityId[],
) => void;

export interface PredictLiveDataServiceWatchEventsAction {
  type: 'PredictLiveDataService:watchEvents';
  handler: WatchHandler;
}

export interface PredictLiveDataServiceUnwatchEventsAction {
  type: 'PredictLiveDataService:unwatchEvents';
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
  | PredictLiveDataServiceWatchEventsAction
  | PredictLiveDataServiceUnwatchEventsAction;

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

export type PredictLiveDataEventResolver = (
  venueId: PredictVenueId,
  eventId: PredictEntityId,
) => Promise<PredictEvent>;

export interface PredictLiveDataServiceOptions {
  messenger: PredictLiveDataServiceMessenger;
  createClient: PredictLiveDataTransportFactory;
  /** The cached REST Event read used to map an Event to its Market ids. */
  resolveEvent: PredictLiveDataEventResolver;
  venueId: PredictVenueId;
  now?: () => number;
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

/**
 * Owns live-data subscriptions for one Venue. Surfaces watch Events; the
 * service resolves each Event to its Markets, holds one upstream subscription
 * per Market (and per live Game) for as long as any surface watches it, and
 * publishes every accepted frame on the messenger.
 */
export class PredictLiveDataService {
  readonly #messenger: PredictLiveDataServiceMessenger;
  readonly #client: PredictLiveDataTransport;
  readonly #venueId: PredictVenueId;
  readonly #games = new TopicCache<PredictGameLive>();
  readonly #quotes = new TopicCache<PredictQuote>();
  readonly #events: LiveEventSubscriptions;

  constructor({
    messenger,
    createClient,
    resolveEvent,
    venueId,
    now,
  }: PredictLiveDataServiceOptions) {
    this.#messenger = messenger;
    this.#venueId = venueId;
    this.#client = createClient({
      onGameUpdate: (game) => this.onGameUpdate(game),
      onQuoteUpdate: (quote) => this.onQuoteUpdate(quote),
    });
    this.#events = new LiveEventSubscriptions({
      resolveEvent: (eventId) => resolveEvent(venueId, eventId),
      subscribe: (topic, ids) => this.#watch(topic, ids),
      unsubscribe: (topic, ids) => this.#unwatch(topic, ids),
      replay: (topic, ids) => this.#replay(topic, ids),
      now,
    });

    messenger.registerActionHandler(
      'PredictLiveDataService:watchEvents',
      this.watchEvents.bind(this),
    );
    messenger.registerActionHandler(
      'PredictLiveDataService:unwatchEvents',
      this.unwatchEvents.bind(this),
    );
  }

  watchEvents(
    venueId: PredictVenueId,
    eventIds: readonly PredictEntityId[],
  ): void {
    this.#assertVenue(venueId);
    this.#events.watch(eventIds);
  }

  unwatchEvents(
    venueId: PredictVenueId,
    eventIds: readonly PredictEntityId[],
  ): void {
    this.#assertVenue(venueId);
    this.#events.unwatch(eventIds);
  }

  /** Event ids at least one surface currently watches. */
  get watchedEventIds(): readonly PredictEntityId[] {
    return this.#events.watchedEventIds;
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
      'PredictLiveDataService:watchEvents',
    );
    this.#messenger.unregisterActionHandler(
      'PredictLiveDataService:unwatchEvents',
    );
    this.#events.clear();
    this.#games.clear();
    this.#quotes.clear();
    this.#client.destroy();
  }

  #watch(topic: PredictLiveDataTopic, ids: readonly PredictEntityId[]): void {
    const cache = topic === 'game' ? this.#games : this.#quotes;
    cache.watch(ids);
    this.#client.subscribe(topic, this.#venueId, ids);
    this.#replay(topic, ids);
  }

  /**
   * Publishes the last known value for each id. The Venue only sends a
   * snapshot when an id is first subscribed, so a screen opened over an
   * existing watcher would otherwise render the stale read-model value until
   * the next update.
   */
  #replay(topic: PredictLiveDataTopic, ids: readonly PredictEntityId[]): void {
    if (topic === 'game') {
      ids.forEach((id) => {
        const game = this.#games.values.get(id);
        if (game) {
          this.#messenger.publish(
            'PredictLiveDataService:gameLiveUpdated',
            game,
          );
        }
      });
      return;
    }
    ids.forEach((id) => {
      const quote = this.#quotes.values.get(id);
      if (quote) {
        this.#messenger.publish('PredictLiveDataService:quoteUpdated', quote);
      }
    });
  }

  #unwatch(topic: PredictLiveDataTopic, ids: readonly PredictEntityId[]): void {
    const cache = topic === 'game' ? this.#games : this.#quotes;
    cache.unwatch(ids);
    this.#client
      .unsubscribe(topic, this.#venueId, ids)
      .forEach((id) => cache.values.delete(id));
  }

  #assertVenue(venueId: PredictVenueId): void {
    if (venueId !== this.#venueId) {
      throw PredictError.from(PredictErrorCode.UNSUPPORTED_VENUE);
    }
  }
}

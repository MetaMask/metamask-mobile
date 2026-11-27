import type { Messenger } from '@metamask/messenger';
import type { PredictLiveDataTransport } from '../adapters/remote/PredictLiveDataClient';
import type {
  PredictGameLive,
  PredictIndexError,
  PredictIndexLive,
  PredictIndexPoint,
  PredictIndexSnapshot,
  PredictLiveDataTopic,
  PredictQuote,
} from '../contracts/v1/liveData';
import { PredictError, PredictErrorCode } from '../errors';
import type { PredictEntityId, PredictEvent, PredictVenueId } from '../types';
import { appendIndexPoint, toOrderedIndexPoints } from '../utils/indexSeries';
import { isOlderLiveFrame, mergeGameLiveFrames } from '../utils/mergeLiveData';
import {
  LiveEventSubscriptions,
  type LiveMarketScope,
} from './internal/LiveEventSubscriptions';

export const PREDICT_LIVE_DATA_SERVICE_NAME = 'PredictLiveDataService' as const;

export type { LiveMarketScope as PredictLiveMarketScope } from './internal/LiveEventSubscriptions';

export interface PredictLiveDataWatchOptions {
  /**
   * Which of each Event's Markets to hold live prices for. Defaults to `all`;
   * Home and Feed pass `card` so hidden lines stay off the wire, and the Event
   * Screen passes `{ type: 'visible', marketIds }` with the Markets it renders.
   * An unwatch must carry the same scope (and ids) as the watch it releases.
   */
  marketScope?: LiveMarketScope;
}

type WatchHandler = (
  venueId: PredictVenueId,
  eventIds: readonly PredictEntityId[],
  options?: PredictLiveDataWatchOptions,
) => void;

export interface PredictLiveDataServiceWatchEventsAction {
  type: 'PredictLiveDataService:watchEvents';
  handler: WatchHandler;
}

export interface PredictLiveDataServiceUnwatchEventsAction {
  type: 'PredictLiveDataService:unwatchEvents';
  handler: WatchHandler;
}

type WatchIndexHandler = (
  venueId: PredictVenueId,
  eventIds: readonly PredictEntityId[],
) => void;

/**
 * Watches the `index` topic (the live coin price of a window) for Events.
 * Refcounted per Event id. A watcher that joins an Event another surface
 * already holds is replayed the last snapshot at once.
 */
export interface PredictLiveDataServiceWatchIndexAction {
  type: 'PredictLiveDataService:watchIndex';
  handler: WatchIndexHandler;
}

export interface PredictLiveDataServiceUnwatchIndexAction {
  type: 'PredictLiveDataService:unwatchIndex';
  handler: WatchIndexHandler;
}

export interface PredictLiveDataServiceGameLiveUpdatedEvent {
  type: 'PredictLiveDataService:gameLiveUpdated';
  payload: [PredictGameLive];
}

export interface PredictLiveDataServiceQuoteUpdatedEvent {
  type: 'PredictLiveDataService:quoteUpdated';
  payload: [PredictQuote];
}

/** The window so far. Also the replay for a watcher that joins late. */
export interface PredictLiveDataServiceIndexSnapshotEvent {
  type: 'PredictLiveDataService:indexSnapshotUpdated';
  payload: [PredictIndexSnapshot];
}

/** One live index tick. */
export interface PredictLiveDataServiceIndexUpdatedEvent {
  type: 'PredictLiveDataService:indexUpdated';
  payload: [PredictIndexLive];
}

/** An `error` frame for a watched index Event. */
export interface PredictLiveDataServiceIndexFailedEvent {
  type: 'PredictLiveDataService:indexFailed';
  payload: [PredictIndexError];
}

/**
 * The server let an index Event go (a window that closed more than 30 s
 * ago). Every watcher of it is released and its cache is gone. Not an error.
 */
export interface PredictLiveDataServiceIndexReleasedEvent {
  type: 'PredictLiveDataService:indexReleased';
  payload: [{ venueId: PredictVenueId; eventId: PredictEntityId }];
}

export type PredictLiveDataServiceActions =
  | PredictLiveDataServiceWatchEventsAction
  | PredictLiveDataServiceUnwatchEventsAction
  | PredictLiveDataServiceWatchIndexAction
  | PredictLiveDataServiceUnwatchIndexAction;

export type PredictLiveDataServiceEvents =
  | PredictLiveDataServiceGameLiveUpdatedEvent
  | PredictLiveDataServiceQuoteUpdatedEvent
  | PredictLiveDataServiceIndexSnapshotEvent
  | PredictLiveDataServiceIndexUpdatedEvent
  | PredictLiveDataServiceIndexFailedEvent
  | PredictLiveDataServiceIndexReleasedEvent;

export type PredictLiveDataServiceMessenger = Messenger<
  typeof PREDICT_LIVE_DATA_SERVICE_NAME,
  PredictLiveDataServiceActions,
  PredictLiveDataServiceEvents
>;

export interface PredictLiveDataTransportCallbacks {
  onGameUpdate: (game: PredictGameLive) => void;
  onQuoteUpdate: (quote: PredictQuote) => void;
  onIndexSnapshot: (snapshot: PredictIndexSnapshot) => void;
  onIndexUpdate: (index: PredictIndexLive) => void;
  onIndexError: (error: PredictIndexError) => void;
  onIndexReleased: (eventIds: readonly PredictEntityId[]) => void;
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

/** The last window series of one index Event, kept for late watchers. */
interface IndexCacheEntry {
  latest: PredictIndexLive;
  points: PredictIndexPoint[];
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
  readonly #indexes = new TopicCache<IndexCacheEntry>();
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
      onIndexSnapshot: (snapshot) => this.onIndexSnapshot(snapshot),
      onIndexUpdate: (index) => this.onIndexUpdate(index),
      onIndexError: (error) => this.onIndexError(error),
      onIndexReleased: (eventIds) => this.onIndexReleased(eventIds),
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
    messenger.registerActionHandler(
      'PredictLiveDataService:watchIndex',
      this.watchIndex.bind(this),
    );
    messenger.registerActionHandler(
      'PredictLiveDataService:unwatchIndex',
      this.unwatchIndex.bind(this),
    );
  }

  watchIndex(
    venueId: PredictVenueId,
    eventIds: readonly PredictEntityId[],
  ): void {
    this.#assertVenue(venueId);
    this.#indexes.watch(eventIds);
    this.#client.subscribe('index', this.#venueId, eventIds);
    this.#replayIndex(eventIds);
  }

  unwatchIndex(
    venueId: PredictVenueId,
    eventIds: readonly PredictEntityId[],
  ): void {
    this.#assertVenue(venueId);
    this.#indexes.unwatch(eventIds);
    this.#client
      .unsubscribe('index', this.#venueId, eventIds)
      .forEach((id) => this.#indexes.values.delete(id));
  }

  watchEvents(
    venueId: PredictVenueId,
    eventIds: readonly PredictEntityId[],
    { marketScope = 'all' }: PredictLiveDataWatchOptions = {},
  ): void {
    this.#assertVenue(venueId);
    this.#events.watch(eventIds, marketScope);
  }

  unwatchEvents(
    venueId: PredictVenueId,
    eventIds: readonly PredictEntityId[],
    { marketScope = 'all' }: PredictLiveDataWatchOptions = {},
  ): void {
    this.#assertVenue(venueId);
    this.#events.unwatch(eventIds, marketScope);
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

  onIndexSnapshot(snapshot: PredictIndexSnapshot): void {
    if (
      snapshot.venueId !== this.#venueId ||
      !this.#indexes.watchCounts.has(snapshot.eventId)
    ) {
      return;
    }
    const previous = this.#indexes.values.get(snapshot.eventId);
    if (previous && isOlderLiveFrame(snapshot, previous.latest)) {
      return;
    }
    const { points, ...latest } = snapshot;
    this.#indexes.values.set(snapshot.eventId, {
      latest,
      points: toOrderedIndexPoints(points),
    });
    this.#messenger.publish(
      'PredictLiveDataService:indexSnapshotUpdated',
      snapshot,
    );
  }

  onIndexUpdate(index: PredictIndexLive): void {
    if (
      index.venueId !== this.#venueId ||
      !this.#indexes.watchCounts.has(index.eventId)
    ) {
      return;
    }
    const entry = this.#indexes.values.get(index.eventId) ?? {
      latest: index,
      points: [],
    };
    if (isOlderLiveFrame(index, entry.latest)) {
      return;
    }
    // Keep the series a late watcher is replayed in step with the live ticks.
    appendIndexPoint(entry.points, {
      time: index.observedAt,
      value: index.average60s,
    });
    entry.latest = index;
    this.#indexes.values.set(index.eventId, entry);
    this.#messenger.publish('PredictLiveDataService:indexUpdated', index);
  }

  onIndexError(error: PredictIndexError): void {
    if (
      error.venueId !== this.#venueId ||
      !this.#indexes.watchCounts.has(error.eventId)
    ) {
      return;
    }
    this.#messenger.publish('PredictLiveDataService:indexFailed', error);
  }

  onIndexReleased(eventIds: readonly PredictEntityId[]): void {
    eventIds.forEach((eventId) => {
      if (!this.#indexes.watchCounts.delete(eventId)) {
        return;
      }
      this.#indexes.values.delete(eventId);
      this.#messenger.publish('PredictLiveDataService:indexReleased', {
        venueId: this.#venueId,
        eventId,
      });
    });
  }

  destroy(): void {
    this.#messenger.unregisterActionHandler(
      'PredictLiveDataService:watchIndex',
    );
    this.#messenger.unregisterActionHandler(
      'PredictLiveDataService:unwatchIndex',
    );
    this.#indexes.clear();
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

  /** Publishes the last known series of each Event as one snapshot. */
  #replayIndex(ids: readonly PredictEntityId[]): void {
    ids.forEach((id) => {
      const entry = this.#indexes.values.get(id);
      if (entry) {
        this.#messenger.publish('PredictLiveDataService:indexSnapshotUpdated', {
          ...entry.latest,
          points: [...entry.points],
        });
      }
    });
  }

  #assertVenue(venueId: PredictVenueId): void {
    if (venueId !== this.#venueId) {
      throw PredictError.from(PredictErrorCode.UNSUPPORTED_VENUE);
    }
  }
}

import Logger from '../../../../../util/Logger';
import type { PredictLiveDataTopic } from '../../contracts/v1/liveData';
import type {
  PredictEntityId,
  PredictEvent,
  PredictGameStatus,
} from '../../types';

/**
 * How far ahead of a scheduled kickoff a visible Game also holds a `game`
 * subscription, so pre-game status changes (delays, early starts) arrive
 * without subscribing every scheduled Game in a Feed.
 */
export const PREDICT_LIVE_GAME_WINDOW_MS = 60 * 60 * 1000;

const LIVE_GAME_STATUSES: ReadonlySet<PredictGameStatus> = new Set([
  'in_progress',
  'delayed',
  'suspended',
]);

/**
 * Whether a visible Event should also hold a `game` subscription: the Game is
 * live, or it is scheduled to start within {@link PREDICT_LIVE_GAME_WINDOW_MS}
 * (including a scheduled Game whose kickoff has already passed).
 */
export const shouldWatchGame = (event: PredictEvent, now: number): boolean => {
  const game = event.sports?.game;
  if (!game) {
    return false;
  }
  if (LIVE_GAME_STATUSES.has(game.status)) {
    return true;
  }
  if (game.status !== 'scheduled' || !event.startsAt) {
    return false;
  }
  const startsAt = Date.parse(event.startsAt);
  return (
    Number.isFinite(startsAt) && startsAt - now <= PREDICT_LIVE_GAME_WINDOW_MS
  );
};

interface ResolvedEventSubscription {
  marketIds: readonly PredictEntityId[];
  watchGame: boolean;
}

interface EventSubscriptionEntry {
  watchers: number;
  resolving: boolean;
  resolved?: ResolvedEventSubscription;
}

export interface LiveEventSubscriptionsOptions {
  /** Cached REST Event read; the Event's `markets[].id` are what get subscribed. */
  resolveEvent: (eventId: PredictEntityId) => Promise<PredictEvent>;
  subscribe: (
    topic: PredictLiveDataTopic,
    ids: readonly PredictEntityId[],
  ) => void;
  unsubscribe: (
    topic: PredictLiveDataTopic,
    ids: readonly PredictEntityId[],
  ) => void;
  /**
   * Called when a watch arrives for an Event whose subscriptions already
   * exist, so the new surface can be handed the current values: the Venue
   * only snapshots on first subscribe.
   */
  replay: (
    topic: PredictLiveDataTopic,
    ids: readonly PredictEntityId[],
  ) => void;
  now?: () => number;
}

/**
 * Ref-counted live-data subscriptions keyed by Event id.
 *
 * Every surface that has an Event on screen calls `watch`; the first watcher
 * resolves the Event through the cached REST read, subscribes its Markets (in
 * the Event's own `markets` order) and, when {@link shouldWatchGame} says so,
 * the Event's `game` subject. The last watcher releases both. Surfaces never
 * see Market ids, so Home and Feed showing the same Event share one upstream
 * subscription per Market.
 *
 * A watch released before its resolution settles subscribes nothing; a failed
 * resolution is retried on the next `watch` for that Event.
 */
export class LiveEventSubscriptions {
  readonly #entries = new Map<PredictEntityId, EventSubscriptionEntry>();
  readonly #resolveEvent: LiveEventSubscriptionsOptions['resolveEvent'];
  readonly #subscribe: LiveEventSubscriptionsOptions['subscribe'];
  readonly #unsubscribe: LiveEventSubscriptionsOptions['unsubscribe'];
  readonly #replay: LiveEventSubscriptionsOptions['replay'];
  readonly #now: () => number;

  constructor({
    resolveEvent,
    subscribe,
    unsubscribe,
    replay,
    now = Date.now,
  }: LiveEventSubscriptionsOptions) {
    this.#resolveEvent = resolveEvent;
    this.#subscribe = subscribe;
    this.#unsubscribe = unsubscribe;
    this.#replay = replay;
    this.#now = now;
  }

  watch(eventIds: readonly PredictEntityId[]): void {
    eventIds.forEach((eventId) => {
      let entry = this.#entries.get(eventId);
      if (!entry) {
        entry = { watchers: 0, resolving: false };
        this.#entries.set(eventId, entry);
      }
      entry.watchers += 1;
      if (entry.resolved) {
        this.#replayResolved(eventId, entry.resolved);
        return;
      }
      if (!entry.resolving) {
        this.#resolve(eventId, entry);
      }
    });
  }

  unwatch(eventIds: readonly PredictEntityId[]): void {
    eventIds.forEach((eventId) => {
      const entry = this.#entries.get(eventId);
      if (!entry) {
        return;
      }
      entry.watchers -= 1;
      if (entry.watchers > 0) {
        return;
      }
      this.#entries.delete(eventId);
      this.#release(eventId, entry.resolved);
    });
  }

  /** Event ids with at least one watcher, in first-watched order. */
  get watchedEventIds(): readonly PredictEntityId[] {
    return [...this.#entries.keys()];
  }

  clear(): void {
    const entries = [...this.#entries.entries()];
    this.#entries.clear();
    entries.forEach(([eventId, entry]) =>
      this.#release(eventId, entry.resolved),
    );
  }

  #resolve(eventId: PredictEntityId, entry: EventSubscriptionEntry): void {
    entry.resolving = true;
    this.#resolveEvent(eventId).then(
      (event) => {
        entry.resolving = false;
        // Released, or replaced by a later watch cycle, while resolving.
        if (this.#entries.get(eventId) !== entry) {
          return;
        }
        const marketIds = [...new Set(event.markets.map(({ id }) => id))];
        const watchGame = shouldWatchGame(event, this.#now());
        entry.resolved = { marketIds, watchGame };
        if (marketIds.length > 0) {
          this.#subscribe('market', marketIds);
        }
        if (watchGame) {
          this.#subscribe('game', [eventId]);
        }
      },
      (error: unknown) => {
        entry.resolving = false;
        Logger.log(
          'PredictLiveDataService: could not resolve Event for live data',
          eventId,
          error instanceof Error ? error.message : error,
        );
      },
    );
  }

  #replayResolved(
    eventId: PredictEntityId,
    resolved: ResolvedEventSubscription,
  ): void {
    if (resolved.marketIds.length > 0) {
      this.#replay('market', resolved.marketIds);
    }
    if (resolved.watchGame) {
      this.#replay('game', [eventId]);
    }
  }

  #release(
    eventId: PredictEntityId,
    resolved: ResolvedEventSubscription | undefined,
  ): void {
    if (!resolved) {
      return;
    }
    if (resolved.marketIds.length > 0) {
      this.#unsubscribe('market', resolved.marketIds);
    }
    if (resolved.watchGame) {
      this.#unsubscribe('game', [eventId]);
    }
  }
}

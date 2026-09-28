import Logger from '../../../../../util/Logger';
import type { PredictLiveDataTopic } from '../../contracts/v1/liveData';
import { getEventCardLiveMarketIds } from '../../events/cards';
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

/**
 * Which of an Event's Markets a watcher needs live prices for. `all` is every
 * Market (Event Screen); `card` is only the Markets a Home/Feed card prices,
 * so hidden props and grouped lines stay off the wire until the Event opens.
 */
export type LiveMarketScope = 'all' | 'card';

const LIVE_MARKET_SCOPES: readonly LiveMarketScope[] = ['all', 'card'];

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

/** Market ids one scope needs, in the order they should be subscribed. */
export const getScopedMarketIds = (
  event: PredictEvent,
  scope: LiveMarketScope,
): PredictEntityId[] =>
  scope === 'card'
    ? getEventCardLiveMarketIds(event)
    : [...new Set(event.markets.map(({ id }) => id))];

interface ResolvedEventSubscription {
  event: PredictEvent;
  /** Market ids currently held upstream for this Event, in subscribe order. */
  marketIds: readonly PredictEntityId[];
  watchGame: boolean;
}

interface EventSubscriptionEntry {
  watchers: Record<LiveMarketScope, number>;
  resolving: boolean;
  resolved?: ResolvedEventSubscription;
}

const totalWatchers = (entry: EventSubscriptionEntry): number =>
  LIVE_MARKET_SCOPES.reduce((sum, scope) => sum + entry.watchers[scope], 0);

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
 * Ref-counted live-data subscriptions keyed by Event id and market scope.
 *
 * Every surface that has an Event on screen calls `watch`; the first watcher
 * resolves the Event through the cached REST read, subscribes the Markets its
 * scope needs (in the Event's own `markets` order) and, when
 * {@link shouldWatchGame} says so, the Event's `game` subject. Further
 * watchers only widen the Market set (a `card` Feed row under an `all` Event
 * Screen holds every Market); releasing a watcher narrows it back to what the
 * remaining scopes need, and the last watcher releases everything. Surfaces
 * never see Market ids, so Home and Feed showing the same Event share one
 * upstream subscription per Market.
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

  watch(
    eventIds: readonly PredictEntityId[],
    scope: LiveMarketScope = 'all',
  ): void {
    eventIds.forEach((eventId) => {
      let entry = this.#entries.get(eventId);
      if (!entry) {
        entry = { watchers: { all: 0, card: 0 }, resolving: false };
        this.#entries.set(eventId, entry);
      }
      entry.watchers[scope] += 1;
      if (entry.resolved) {
        this.#join(eventId, entry, entry.resolved, scope);
        return;
      }
      if (!entry.resolving) {
        this.#resolve(eventId, entry);
      }
    });
  }

  unwatch(
    eventIds: readonly PredictEntityId[],
    scope: LiveMarketScope = 'all',
  ): void {
    eventIds.forEach((eventId) => {
      const entry = this.#entries.get(eventId);
      if (!entry || entry.watchers[scope] === 0) {
        return;
      }
      entry.watchers[scope] -= 1;
      if (totalWatchers(entry) > 0) {
        if (entry.resolved) {
          this.#syncMarkets(entry, entry.resolved);
        }
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
        const watchGame = shouldWatchGame(event, this.#now());
        const resolved: ResolvedEventSubscription = {
          event,
          marketIds: [],
          watchGame,
        };
        entry.resolved = resolved;
        this.#syncMarkets(entry, resolved);
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

  /** Market ids the Event's current watchers need, widest scope first. */
  #desiredMarketIds(entry: EventSubscriptionEntry, event: PredictEvent) {
    if (entry.watchers.all > 0) {
      return getScopedMarketIds(event, 'all');
    }
    if (entry.watchers.card > 0) {
      return getScopedMarketIds(event, 'card');
    }
    return [];
  }

  /**
   * Brings the upstream Market set in line with what the Event's watchers
   * need: subscribes ids that are now wanted and releases ids no scope still
   * asks for. Returns the ids that were already held before the sync.
   */
  #syncMarkets(
    entry: EventSubscriptionEntry,
    resolved: ResolvedEventSubscription,
  ): ReadonlySet<PredictEntityId> {
    const held = new Set(resolved.marketIds);
    const desired = this.#desiredMarketIds(entry, resolved.event);
    const desiredSet = new Set(desired);
    const added = desired.filter((id) => !held.has(id));
    const removed = resolved.marketIds.filter((id) => !desiredSet.has(id));

    resolved.marketIds = desired;
    if (added.length > 0) {
      this.#subscribe('market', added);
    }
    if (removed.length > 0) {
      this.#unsubscribe('market', removed);
    }
    return held;
  }

  /**
   * A watcher joined an already-resolved Event: widen the Market set if its
   * scope needs more, and replay the values it needs that were already held.
   */
  #join(
    eventId: PredictEntityId,
    entry: EventSubscriptionEntry,
    resolved: ResolvedEventSubscription,
    scope: LiveMarketScope,
  ): void {
    const held = this.#syncMarkets(entry, resolved);
    const replayIds = getScopedMarketIds(resolved.event, scope).filter((id) =>
      held.has(id),
    );
    if (replayIds.length > 0) {
      this.#replay('market', replayIds);
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

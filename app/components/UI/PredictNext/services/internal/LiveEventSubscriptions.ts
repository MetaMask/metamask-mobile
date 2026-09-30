import Logger from '../../../../../util/Logger';
import type { PredictLiveDataTopic } from '../../contracts/v1/liveData';
import { getEventCardLiveMarketIds } from '../../events/cards';
import { isRetryablePredictError } from '../servicePolicy';
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
 * Largest delay `setTimeout` can hold. Anything above it overflows the 32-bit
 * counter and fires immediately, so a kickoff further out than this is left to
 * the next watch instead.
 */
const MAX_TIMEOUT_MS = 0x7fffffff;

/**
 * Backoff for a resolution that failed with a retryable read error while the
 * Event is still watched. The first retry waits the base delay; each further
 * failure doubles it up to the max. Retries continue at the max rather than
 * stopping: surfaces only send id diffs, so giving up would leave a mounted
 * screen without live prices until its ids change.
 */
export const PREDICT_LIVE_RESOLVE_RETRY_BASE_MS = 1000;
export const PREDICT_LIVE_RESOLVE_RETRY_MAX_MS = 30_000;

/**
 * Gap between resolve retries scheduled in one burst. A Feed page resolves one
 * Event per card; spacing them keeps a rate limit from being retried as a
 * single stampede.
 */
export const PREDICT_LIVE_RESOLVE_RETRY_GAP_MS = 200;

type TimerId = ReturnType<typeof setTimeout>;

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

/**
 * Milliseconds until a scheduled Game enters the game window, or `undefined`
 * when it never will (no Game, not scheduled, missing or unparsable
 * `startsAt`) or already has ({@link shouldWatchGame} is already true).
 *
 * Gating is decided once per resolution, so an Event that sits on screen while
 * kickoff approaches would otherwise never pick up its `game` subscription.
 * The caller arms a timer for this delay and re-gates when it fires.
 */
export const msUntilGameWindow = (
  event: PredictEvent,
  now: number,
): number | undefined => {
  const game = event.sports?.game;
  if (game?.status !== 'scheduled' || !event.startsAt) {
    return undefined;
  }
  const startsAt = Date.parse(event.startsAt);
  if (!Number.isFinite(startsAt)) {
    return undefined;
  }
  const delay = startsAt - PREDICT_LIVE_GAME_WINDOW_MS - now;
  return delay > 0 ? delay : undefined;
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
  /**
   * Armed for a resolved Event whose scheduled Game is still outside the game
   * window; fires when it enters and upgrades the Event to a `game` watcher.
   */
  gameWindowTimer?: TimerId;
  /**
   * Armed after a retryable resolution failure while this Event still has
   * watchers. Fires the next `getEvent`; cleared when the Event is released
   * or a new resolution starts.
   */
  resolveRetryTimer?: TimerId;
  /** Consecutive retryable resolution failures; drives the backoff. */
  resolveFailures: number;
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
 * A watch released before its resolution settles subscribes nothing. A
 * retryable failure is retried with backoff while the Event stays watched,
 * because surfaces only send id diffs and a still-visible Event never calls
 * `watch` again. Any other failure waits for the next `watch`.
 *
 * Game gating is decided at resolution, with one exception: a scheduled Game
 * still outside {@link PREDICT_LIVE_GAME_WINDOW_MS} arms a timer for the
 * moment it enters the window, so an Event that stays on screen as kickoff
 * approaches upgrades itself to a `game` watcher.
 */
export class LiveEventSubscriptions {
  readonly #entries = new Map<PredictEntityId, EventSubscriptionEntry>();
  readonly #resolveEvent: LiveEventSubscriptionsOptions['resolveEvent'];
  readonly #subscribe: LiveEventSubscriptionsOptions['subscribe'];
  readonly #unsubscribe: LiveEventSubscriptionsOptions['unsubscribe'];
  readonly #replay: LiveEventSubscriptionsOptions['replay'];
  readonly #now: () => number;
  /** Earliest `now()` at which another failed Event may retry. */
  #retryNotBefore = 0;

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
        entry = {
          watchers: { all: 0, card: 0 },
          resolving: false,
          resolveFailures: 0,
        };
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
        // Releasing what was never held is harmless here, but it means a
        // surface's watch/unwatch pairs have drifted apart; the subscription
        // it thinks it dropped belongs to someone else.
        Logger.log(
          'LiveEventSubscriptions: unwatch without a matching watch',
          eventId,
          scope,
        );
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
      this.#clearGameWindowTimer(entry);
      this.#clearResolveRetry(entry);
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
    entries.forEach(([eventId, entry]) => {
      this.#clearGameWindowTimer(entry);
      this.#clearResolveRetry(entry);
      this.#release(eventId, entry.resolved);
    });
  }

  #resolve(eventId: PredictEntityId, entry: EventSubscriptionEntry): void {
    this.#clearResolveRetry(entry);
    entry.resolving = true;
    this.#resolveEvent(eventId).then(
      (event) => {
        entry.resolving = false;
        // Released, or replaced by a later watch cycle, while resolving.
        if (this.#entries.get(eventId) !== entry) {
          this.#clearGameWindowTimer(entry);
          return;
        }
        entry.resolveFailures = 0;
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
          return;
        }
        this.#armGameWindowTimer(eventId, entry, event);
      },
      (error: unknown) => {
        entry.resolving = false;
        Logger.log(
          'PredictLiveDataService: could not resolve Event for live data',
          eventId,
          error instanceof Error ? error.message : error,
        );
        // The hook will not send this id again while it stays visible, so a
        // retryable failure has to retry itself. Released, or replaced by a
        // later watch cycle, while resolving.
        if (this.#entries.get(eventId) !== entry) {
          return;
        }
        if (!isRetryablePredictError(error)) {
          return;
        }
        this.#scheduleResolveRetry(eventId, entry);
      },
    );
  }

  /**
   * Schedules another resolution for an Event that is still watched. Events
   * that fail in one burst take successive slots {@link PREDICT_LIVE_RESOLVE_RETRY_GAP_MS}
   * apart so their retries do not land on the same tick.
   */
  #scheduleResolveRetry(
    eventId: PredictEntityId,
    entry: EventSubscriptionEntry,
  ): void {
    this.#clearResolveRetry(entry);
    entry.resolveFailures += 1;
    const backoff = Math.min(
      PREDICT_LIVE_RESOLVE_RETRY_MAX_MS,
      PREDICT_LIVE_RESOLVE_RETRY_BASE_MS * 2 ** (entry.resolveFailures - 1),
    );
    const now = this.#now();
    const at = Math.max(now + backoff, this.#retryNotBefore);
    this.#retryNotBefore = at + PREDICT_LIVE_RESOLVE_RETRY_GAP_MS;
    entry.resolveRetryTimer = setTimeout(() => {
      entry.resolveRetryTimer = undefined;
      if (
        this.#entries.get(eventId) !== entry ||
        entry.resolved ||
        entry.resolving ||
        totalWatchers(entry) === 0
      ) {
        return;
      }
      this.#resolve(eventId, entry);
    }, at - now);
  }

  #clearResolveRetry(entry: EventSubscriptionEntry): void {
    if (entry.resolveRetryTimer !== undefined) {
      clearTimeout(entry.resolveRetryTimer);
      entry.resolveRetryTimer = undefined;
    }
  }

  /**
   * Arms the game-window timer for a resolved Event whose scheduled Game has
   * not entered the window yet, so an Event that stays on screen across
   * kickoff-minus-{@link PREDICT_LIVE_GAME_WINDOW_MS} starts receiving Game
   * frames without waiting to be re-watched.
   */
  #armGameWindowTimer(
    eventId: PredictEntityId,
    entry: EventSubscriptionEntry,
    event: PredictEvent,
  ): void {
    this.#clearGameWindowTimer(entry);
    const delay = msUntilGameWindow(event, this.#now());
    if (delay === undefined || delay > MAX_TIMEOUT_MS) {
      return;
    }
    entry.gameWindowTimer = setTimeout(
      () => this.#enterGameWindow(eventId, entry),
      delay,
    );
  }

  /** The scheduled Game entered the window while its Event stayed watched. */
  #enterGameWindow(
    eventId: PredictEntityId,
    entry: EventSubscriptionEntry,
  ): void {
    entry.gameWindowTimer = undefined;
    if (
      this.#entries.get(eventId) !== entry ||
      !entry.resolved ||
      entry.resolved.watchGame
    ) {
      return;
    }
    entry.resolved.watchGame = true;
    this.#subscribe('game', [eventId]);
  }

  #clearGameWindowTimer(entry: EventSubscriptionEntry): void {
    if (entry.gameWindowTimer !== undefined) {
      clearTimeout(entry.gameWindowTimer);
      entry.gameWindowTimer = undefined;
    }
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

import { useEffect, useMemo, useRef, useState } from 'react';
import Engine from '../../../../core/Engine';
import type { PredictGameLive, PredictQuote } from '../contracts/v1/liveData';
import { getEventCardLiveMarketIds } from '../events/cards';
import {
  PREDICT_LIVE_DATA_SERVICE_NAME,
  type PredictLiveMarketScope,
} from '../services/PredictLiveDataService';
import type {
  PredictEntityId,
  PredictEvent,
  PredictMarket,
  PredictVenueId,
} from '../types';
import {
  isOlderLiveFrame,
  mergeGameLiveFrames,
  mergeGameLiveUpdate,
  mergeMarketQuote,
} from '../utils/mergeLiveData';

const NO_IDS: readonly PredictEntityId[] = [];

const idsKey = (ids: readonly PredictEntityId[]) => JSON.stringify(ids);

const uniqueIds = (ids: readonly PredictEntityId[]): PredictEntityId[] => [
  ...new Set(ids),
];

/** Which Markets a screen should hold live prices for. */
export type LiveMarketWatchScope = PredictLiveMarketScope;

/**
 * Market ids present in the given Events that can receive live price patches.
 * `card` narrows each Event to the Markets a list card prices.
 */
export const getPresentMarketIds = (
  events: readonly PredictEvent[],
  marketScope: LiveMarketWatchScope = 'all',
): PredictEntityId[] =>
  events.flatMap((event) =>
    marketScope === 'card'
      ? getEventCardLiveMarketIds(event)
      : event.markets.map((market) => market.id),
  );

type Listener<TLive> = (live: TLive) => void;

/**
 * One live-data topic as the hook sees it. The messenger calls are closed over
 * here, with literal event names, so each topic type-checks against the
 * service's own event declarations.
 */
interface LiveTopic<TLive extends { venueId: PredictVenueId }> {
  subscribe: (listener: Listener<TLive>) => void;
  unsubscribe: (listener: Listener<TLive>) => void;
  keyOf: (live: TLive) => PredictEntityId;
  merge: (previous: TLive | undefined, incoming: TLive) => TLive | undefined;
}

const GAME_TOPIC: LiveTopic<PredictGameLive> = {
  subscribe: (listener) =>
    Engine.controllerMessenger.subscribe(
      `${PREDICT_LIVE_DATA_SERVICE_NAME}:gameLiveUpdated`,
      listener,
    ),
  unsubscribe: (listener) =>
    Engine.controllerMessenger.unsubscribe(
      `${PREDICT_LIVE_DATA_SERVICE_NAME}:gameLiveUpdated`,
      listener,
    ),
  keyOf: (live) => live.eventId,
  merge: mergeGameLiveFrames,
};

const MARKET_TOPIC: LiveTopic<PredictQuote> = {
  subscribe: (listener) =>
    Engine.controllerMessenger.subscribe(
      `${PREDICT_LIVE_DATA_SERVICE_NAME}:quoteUpdated`,
      listener,
    ),
  unsubscribe: (listener) =>
    Engine.controllerMessenger.unsubscribe(
      `${PREDICT_LIVE_DATA_SERVICE_NAME}:quoteUpdated`,
      listener,
    ),
  keyOf: (live) => live.marketId,
  merge: (previous, incoming) => {
    if (
      previous &&
      isOlderLiveFrame(
        { observedAt: incoming.updatedAt },
        { observedAt: previous.updatedAt },
      )
    ) {
      return undefined;
    }
    return incoming;
  },
};

const watchEvents = (
  venueId: PredictVenueId,
  eventIds: readonly PredictEntityId[],
  marketScope: LiveMarketWatchScope,
) =>
  Engine.controllerMessenger.call(
    `${PREDICT_LIVE_DATA_SERVICE_NAME}:watchEvents`,
    venueId,
    eventIds,
    { marketScope },
  );

const unwatchEvents = (
  venueId: PredictVenueId,
  eventIds: readonly PredictEntityId[],
  marketScope: LiveMarketWatchScope,
) =>
  Engine.controllerMessenger.call(
    `${PREDICT_LIVE_DATA_SERVICE_NAME}:unwatchEvents`,
    venueId,
    eventIds,
    { marketScope },
  );

/**
 * Holds live-data watches for exactly the given Event ids: newly listed ids
 * are watched, ids that drop off the list are released, and unmounting
 * releases whatever is still held. Only the diff travels to the service, so a
 * card that stays on screen across re-renders never resubscribes. A change of
 * `marketScope` re-issues every watch under the new scope, since the service
 * ref-counts per scope.
 */
const useLiveEventWatches = (
  venueId: PredictVenueId,
  eventIds: readonly PredictEntityId[],
  marketScope: LiveMarketWatchScope,
): void => {
  const watchKey = idsKey(eventIds);
  const watchedRef = useRef<{
    ids: PredictEntityId[];
    marketScope: LiveMarketWatchScope;
  }>({ ids: [], marketScope });

  useEffect(() => {
    const ids = JSON.parse(watchKey) as PredictEntityId[];
    const previous = watchedRef.current;
    const scopeChanged = previous.marketScope !== marketScope;
    const previousSet = new Set(scopeChanged ? [] : previous.ids);
    const nextSet = new Set(scopeChanged ? [] : ids);
    const added = ids.filter((id) => !previousSet.has(id));
    const removed = previous.ids.filter((id) => !nextSet.has(id));

    if (added.length > 0) {
      watchEvents(venueId, added, marketScope);
    }
    if (removed.length > 0) {
      unwatchEvents(venueId, removed, previous.marketScope);
    }
    watchedRef.current = { ids, marketScope };
  }, [watchKey, venueId, marketScope]);

  useEffect(
    () => () => {
      const { ids, marketScope: heldScope } = watchedRef.current;
      watchedRef.current = { ids: [], marketScope: heldScope };
      if (ids.length > 0) {
        unwatchEvents(venueId, ids, heldScope);
      }
    },
    [venueId],
  );
};

/**
 * Collects one topic's accumulated value per id for everything rendered
 * (`presentIds`), so a frame for a row that scrolled out of the viewport still
 * lands when it scrolls back. Game frames fold as patches; quotes replace as
 * snapshots.
 */
const useLiveTopicUpdates = <TLive extends { venueId: PredictVenueId }>(
  topic: LiveTopic<TLive>,
  venueId: PredictVenueId,
  presentIds: readonly PredictEntityId[],
): ReadonlyMap<PredictEntityId, TLive> => {
  const [updates, setUpdates] = useState(
    () => new Map<PredictEntityId, TLive>(),
  );
  const presentKey = idsKey(presentIds);

  useEffect(() => {
    const present = new Set(JSON.parse(presentKey) as PredictEntityId[]);

    const onUpdate = (live: TLive) => {
      const key = topic.keyOf(live);
      if (live.venueId !== venueId || !present.has(key)) {
        return;
      }
      setUpdates((current) => {
        const previous = current.get(key);
        if (previous === live) {
          return current;
        }
        const merged = topic.merge(previous, live);
        if (!merged || merged === previous) {
          return current;
        }

        const next = new Map(current);
        next.set(key, merged);
        return next;
      });
    };

    topic.subscribe(onUpdate);
    return () => {
      topic.unsubscribe(onUpdate);
    };
  }, [presentKey, venueId, topic]);

  useEffect(() => {
    const present = new Set(JSON.parse(presentKey) as PredictEntityId[]);
    setUpdates((current) => {
      let changed = false;
      const next = new Map(current);
      current.forEach((_live, id) => {
        if (!present.has(id)) {
          next.delete(id);
          changed = true;
        }
      });
      return changed ? next : current;
    });
  }, [presentKey]);

  return updates;
};

const patchMarkets = (
  markets: readonly PredictMarket[],
  quotes: ReadonlyMap<PredictEntityId, PredictQuote>,
): readonly PredictMarket[] => {
  let changed = false;
  const patched = markets.map((market) => {
    const quote = quotes.get(market.id);
    if (!quote) {
      return market;
    }
    const next = mergeMarketQuote(market, quote);
    if (next !== market) {
      changed = true;
    }
    return next;
  });
  return changed ? patched : markets;
};

export interface UseEventsWithLiveDataOptions {
  /**
   * The Events currently on screen. Defaults to every Event in `events`.
   * Ids not present in `events` are ignored.
   */
  visibleEventIds?: readonly PredictEntityId[];
  /**
   * Whether the surface is showing at all (navigation focus). While `false`
   * nothing is watched; the collected values stay so the surface re-renders
   * from them the moment it comes back.
   */
  isVisible?: boolean;
  /**
   * Which Markets of each visible Event to hold live prices for. Defaults to
   * `all`. Home and Feed use `card` so hidden lines stay off the wire.
   */
  marketScope?: LiveMarketWatchScope;
}

const applyLiveData = (
  event: PredictEvent,
  gameUpdates: ReadonlyMap<PredictEntityId, PredictGameLive>,
  quoteUpdates: ReadonlyMap<PredictEntityId, PredictQuote>,
): PredictEvent => {
  const sports = event.sports;
  const currentGame = sports?.game;
  const gameUpdate = gameUpdates.get(event.id);
  const game =
    sports && currentGame && gameUpdate
      ? mergeGameLiveUpdate(currentGame, gameUpdate)
      : undefined;
  const markets = patchMarkets(event.markets, quoteUpdates);

  if (!game && markets === event.markets) {
    return event;
  }

  return {
    ...event,
    ...(game && sports ? { sports: { ...sports, game } } : {}),
    markets,
  };
};

const eventLiveInputsUnchanged = (
  event: PredictEvent,
  previousRest: PredictEvent | undefined,
  previousQuotes: ReadonlyMap<PredictEntityId, PredictQuote>,
  nextQuotes: ReadonlyMap<PredictEntityId, PredictQuote>,
  previousGames: ReadonlyMap<PredictEntityId, PredictGameLive>,
  nextGames: ReadonlyMap<PredictEntityId, PredictGameLive>,
): boolean =>
  previousRest === event &&
  previousGames.get(event.id) === nextGames.get(event.id) &&
  event.markets.every(
    (market) => previousQuotes.get(market.id) === nextQuotes.get(market.id),
  );

/**
 * Watches live Game and market-price updates for the visible Events and
 * returns the same Events with Game fields and outcome prices patched.
 *
 * Subscriptions follow the user's eyes: an Event is watched while it is in
 * `visibleEventIds` and the surface `isVisible`, and released as soon as it
 * scrolls out, the surface hides, or the component unmounts. The live-data
 * service resolves which Markets (and, for live Games, which `game` subject)
 * each Event needs and shares one upstream subscription across surfaces.
 * `marketScope: 'card'` asks it for only the Markets a list card prices.
 */
export const useEventsWithLiveData = (
  venueId: PredictVenueId,
  events: readonly PredictEvent[],
  {
    visibleEventIds,
    isVisible = true,
    marketScope = 'all',
  }: UseEventsWithLiveDataOptions = {},
): readonly PredictEvent[] => {
  const presentEventIds = useMemo(() => events.map(({ id }) => id), [events]);
  const presentMarketIds = useMemo(
    () => getPresentMarketIds(events, marketScope),
    [events, marketScope],
  );
  const eventIdsToWatch = useMemo(() => {
    if (!isVisible) {
      return NO_IDS;
    }
    if (!visibleEventIds) {
      return presentEventIds;
    }
    const present = new Set(presentEventIds);
    return uniqueIds(visibleEventIds.filter((id) => present.has(id)));
  }, [isVisible, visibleEventIds, presentEventIds]);

  useLiveEventWatches(venueId, eventIdsToWatch, marketScope);
  const gameUpdates = useLiveTopicUpdates(GAME_TOPIC, venueId, presentEventIds);
  const quoteUpdates = useLiveTopicUpdates(
    MARKET_TOPIC,
    venueId,
    presentMarketIds,
  );
  const previousLiveRef = useRef<{
    events: readonly PredictEvent[];
    gameUpdates: ReadonlyMap<PredictEntityId, PredictGameLive>;
    quoteUpdates: ReadonlyMap<PredictEntityId, PredictQuote>;
    result: readonly PredictEvent[];
  }>({
    events,
    gameUpdates: new Map<PredictEntityId, PredictGameLive>(),
    quoteUpdates: new Map<PredictEntityId, PredictQuote>(),
    result: events,
  });

  return useMemo(() => {
    const previous = previousLiveRef.current;
    const previousRestById = new Map(
      previous.events.map((event) => [event.id, event]),
    );
    const previousResultById = new Map(
      previous.result.map((event) => [event.id, event]),
    );

    let changed = false;
    const next = events.map((event) => {
      const previousLive = previousResultById.get(event.id);
      if (
        previousLive &&
        eventLiveInputsUnchanged(
          event,
          previousRestById.get(event.id),
          previous.quoteUpdates,
          quoteUpdates,
          previous.gameUpdates,
          gameUpdates,
        )
      ) {
        return previousLive;
      }

      const patched = applyLiveData(event, gameUpdates, quoteUpdates);
      if (patched !== previousLive) {
        changed = true;
      }
      return patched;
    });

    const result =
      !changed &&
      next.length === previous.result.length &&
      next.every((event, index) => event === previous.result[index])
        ? previous.result
        : next;

    previousLiveRef.current = {
      events,
      gameUpdates,
      quoteUpdates,
      result,
    };
    return result;
  }, [events, gameUpdates, quoteUpdates]);
};

import { useEffect, useMemo, useRef, useState } from 'react';
import Engine from '../../../../core/Engine';
import type { PredictGameLive, PredictQuote } from '../contracts/v1/liveData';
import { PREDICT_LIVE_DATA_SERVICE_NAME } from '../services/PredictLiveDataService';
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

/** Market ids present in the given Events. */
export const getPresentMarketIds = (
  events: readonly PredictEvent[],
): PredictEntityId[] =>
  events.flatMap((event) => event.markets.map((market) => market.id));

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
) =>
  Engine.controllerMessenger.call(
    `${PREDICT_LIVE_DATA_SERVICE_NAME}:watchEvents`,
    venueId,
    eventIds,
  );

const unwatchEvents = (
  venueId: PredictVenueId,
  eventIds: readonly PredictEntityId[],
) =>
  Engine.controllerMessenger.call(
    `${PREDICT_LIVE_DATA_SERVICE_NAME}:unwatchEvents`,
    venueId,
    eventIds,
  );

/**
 * Holds live-data watches for exactly the given Event ids: newly listed ids
 * are watched, ids that drop off the list are released, and unmounting
 * releases whatever is still held. Only the diff travels to the service, so a
 * card that stays on screen across re-renders never resubscribes.
 */
const useLiveEventWatches = (
  venueId: PredictVenueId,
  eventIds: readonly PredictEntityId[],
): void => {
  const watchKey = idsKey(eventIds);
  const watchedIdsRef = useRef<PredictEntityId[]>([]);

  useEffect(() => {
    const ids = JSON.parse(watchKey) as PredictEntityId[];
    const previousIds = watchedIdsRef.current;
    const previousSet = new Set(previousIds);
    const nextSet = new Set(ids);
    const added = ids.filter((id) => !previousSet.has(id));
    const removed = previousIds.filter((id) => !nextSet.has(id));

    if (added.length > 0) {
      watchEvents(venueId, added);
    }
    if (removed.length > 0) {
      unwatchEvents(venueId, removed);
    }
    watchedIdsRef.current = ids;
  }, [watchKey, venueId]);

  useEffect(
    () => () => {
      const ids = watchedIdsRef.current;
      watchedIdsRef.current = [];
      if (ids.length > 0) {
        unwatchEvents(venueId, ids);
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
    changed = true;
    return mergeMarketQuote(market, quote);
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
}

/**
 * Watches live Game and market-price updates for the visible Events and
 * returns the same Events with Game fields and outcome prices patched.
 *
 * Subscriptions follow the user's eyes: an Event is watched while it is in
 * `visibleEventIds` and the surface `isVisible`, and released as soon as it
 * scrolls out, the surface hides, or the component unmounts. The live-data
 * service resolves which Markets (and, for live Games, which `game` subject)
 * each Event needs and shares one upstream subscription across surfaces.
 */
export const useEventsWithLiveData = (
  venueId: PredictVenueId,
  events: readonly PredictEvent[],
  { visibleEventIds, isVisible = true }: UseEventsWithLiveDataOptions = {},
): readonly PredictEvent[] => {
  const presentEventIds = useMemo(() => events.map(({ id }) => id), [events]);
  const presentMarketIds = useMemo(() => getPresentMarketIds(events), [events]);
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

  useLiveEventWatches(venueId, eventIdsToWatch);
  const gameUpdates = useLiveTopicUpdates(GAME_TOPIC, venueId, presentEventIds);
  const quoteUpdates = useLiveTopicUpdates(
    MARKET_TOPIC,
    venueId,
    presentMarketIds,
  );

  return useMemo(
    () =>
      events.map((event) => {
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
      }),
    [events, gameUpdates, quoteUpdates],
  );
};

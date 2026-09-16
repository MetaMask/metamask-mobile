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
  mergeGameLiveUpdate,
  mergeMarketQuote,
} from '../utils/mergeLiveData';

const idsKey = (ids: readonly PredictEntityId[]) => JSON.stringify(ids);

const requestedEvents = (
  events: readonly PredictEvent[],
  watchEventIds?: readonly PredictEntityId[],
): PredictEvent[] => {
  if (!watchEventIds) {
    return [...events];
  }
  const byId = new Map(events.map((event) => [event.id, event]));
  return watchEventIds.flatMap((eventId) => {
    const event = byId.get(eventId);
    return event ? [event] : [];
  });
};

/** Event ids that can receive live Game patches. */
export const getLiveGameWatchIds = (
  events: readonly PredictEvent[],
  watchEventIds?: readonly PredictEntityId[],
): PredictEntityId[] =>
  requestedEvents(events, watchEventIds)
    .filter((event) => event.sports?.game)
    .map((event) => event.id);

/** Market ids that can receive live price patches. */
export const getLiveMarketWatchIds = (
  events: readonly PredictEvent[],
  watchEventIds?: readonly PredictEntityId[],
): PredictEntityId[] =>
  requestedEvents(events, watchEventIds).flatMap((event) =>
    event.markets.map((market) => market.id),
  );

type Listener<TLive> = (live: TLive) => void;
type WatchCall = (
  venueId: PredictVenueId,
  ids: readonly PredictEntityId[],
) => void;

/**
 * One live-data topic as the hook sees it. The messenger calls are closed over
 * here, with literal action and event names, so each topic type-checks against
 * the service's own action and event declarations.
 */
interface LiveTopic<TLive extends { venueId: PredictVenueId }> {
  watch: WatchCall;
  unwatch: WatchCall;
  subscribe: (listener: Listener<TLive>) => void;
  unsubscribe: (listener: Listener<TLive>) => void;
  keyOf: (live: TLive) => PredictEntityId;
  observedAtOf: (live: TLive) => string;
}

const GAME_TOPIC: LiveTopic<PredictGameLive> = {
  watch: (venueId, ids) =>
    Engine.controllerMessenger.call(
      `${PREDICT_LIVE_DATA_SERVICE_NAME}:watchGames`,
      venueId,
      ids,
    ),
  unwatch: (venueId, ids) =>
    Engine.controllerMessenger.call(
      `${PREDICT_LIVE_DATA_SERVICE_NAME}:unwatchGames`,
      venueId,
      ids,
    ),
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
  observedAtOf: (live) => live.observedAt,
};

const MARKET_TOPIC: LiveTopic<PredictQuote> = {
  watch: (venueId, ids) =>
    Engine.controllerMessenger.call(
      `${PREDICT_LIVE_DATA_SERVICE_NAME}:watchMarkets`,
      venueId,
      ids,
    ),
  unwatch: (venueId, ids) =>
    Engine.controllerMessenger.call(
      `${PREDICT_LIVE_DATA_SERVICE_NAME}:unwatchMarkets`,
      venueId,
      ids,
    ),
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
  observedAtOf: (live) => live.updatedAt,
};

/**
 * Holds one topic's watches with the live-data service and collects its latest
 * frame per id. `idsToWatch` drives subscriptions (usually the viewport);
 * `presentIds` bounds which frames are kept (everything rendered), so a frame
 * for a row that scrolled out of the viewport still lands when it scrolls back.
 */
const useLiveTopicUpdates = <TLive extends { venueId: PredictVenueId }>(
  topic: LiveTopic<TLive>,
  venueId: PredictVenueId,
  idsToWatch: readonly PredictEntityId[],
  presentIds: readonly PredictEntityId[],
): ReadonlyMap<PredictEntityId, TLive> => {
  const [updates, setUpdates] = useState(
    () => new Map<PredictEntityId, TLive>(),
  );
  const watchKey = idsKey(idsToWatch);
  const presentKey = idsKey(presentIds);
  const watchedIdsRef = useRef<PredictEntityId[]>([]);

  useEffect(() => {
    const ids = JSON.parse(watchKey) as PredictEntityId[];
    const present = new Set(JSON.parse(presentKey) as PredictEntityId[]);
    const previousIds = watchedIdsRef.current;
    const previousSet = new Set(previousIds);
    const added = ids.filter((id) => !previousSet.has(id));
    const removed = previousIds.filter((id) => !ids.includes(id));

    const onUpdate = (live: TLive) => {
      const key = topic.keyOf(live);
      if (live.venueId !== venueId || !present.has(key)) {
        return;
      }
      setUpdates((current) => {
        const previous = current.get(key);
        if (
          previous === live ||
          (previous &&
            isOlderLiveFrame(
              { observedAt: topic.observedAtOf(live) },
              { observedAt: topic.observedAtOf(previous) },
            ))
        ) {
          return current;
        }

        const next = new Map(current);
        next.set(key, live);
        return next;
      });
    };

    topic.subscribe(onUpdate);
    if (added.length > 0) {
      topic.watch(venueId, added);
    }
    if (removed.length > 0) {
      topic.unwatch(venueId, removed);
    }
    watchedIdsRef.current = ids;

    return () => {
      topic.unsubscribe(onUpdate);
    };
  }, [presentKey, watchKey, venueId, topic]);

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

  useEffect(
    () => () => {
      const ids = watchedIdsRef.current;
      watchedIdsRef.current = [];
      if (ids.length === 0) {
        return;
      }
      topic.unwatch(venueId, ids);
    },
    [venueId, topic],
  );

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

/**
 * Watches live Game and market-price updates for the given Events and returns
 * the same Events with Game fields and outcome prices patched.
 *
 * `watchEventIds` narrows which Events are subscribed (the viewport); every
 * Event in `events` can still receive a frame it already has.
 */
export const useEventsWithLiveData = (
  venueId: PredictVenueId,
  events: readonly PredictEvent[],
  watchEventIds?: readonly PredictEntityId[],
): readonly PredictEvent[] => {
  const gameIdsToWatch = useMemo(
    () => getLiveGameWatchIds(events, watchEventIds),
    [events, watchEventIds],
  );
  const marketIdsToWatch = useMemo(
    () => getLiveMarketWatchIds(events, watchEventIds),
    [events, watchEventIds],
  );
  const presentEventIds = useMemo(() => events.map(({ id }) => id), [events]);
  const presentMarketIds = useMemo(
    () => getLiveMarketWatchIds(events),
    [events],
  );

  const gameUpdates = useLiveTopicUpdates(
    GAME_TOPIC,
    venueId,
    gameIdsToWatch,
    presentEventIds,
  );
  const quoteUpdates = useLiveTopicUpdates(
    MARKET_TOPIC,
    venueId,
    marketIdsToWatch,
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

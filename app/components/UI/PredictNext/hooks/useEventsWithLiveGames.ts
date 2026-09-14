import { useEffect, useMemo, useRef, useState } from 'react';
import Engine from '../../../../core/Engine';
import {
  isOlderKalshiLiveFrame,
  mapKalshiGameLiveUpdate,
} from '../adapters/remote/mapKalshiGameLiveUpdate';
import type { PredictGameLive } from '../contracts/v1/liveData';
import { PREDICT_LIVE_DATA_SERVICE_NAME } from '../services/PredictLiveDataService';
import type { PredictEntityId, PredictEvent, PredictVenueId } from '../types';

const eventIdsKey = (eventIds: readonly PredictEntityId[]) =>
  JSON.stringify(eventIds);

/** Event ids that can receive live Game patches. */
export const getLiveGameWatchIds = (
  events: readonly PredictEvent[],
  watchEventIds?: readonly PredictEntityId[],
): PredictEntityId[] => {
  const presentWithGame = new Set(
    events.filter((event) => event.sports?.game).map((event) => event.id),
  );
  const requested = watchEventIds ?? events.map((event) => event.id);
  return requested.filter((eventId) => presentWithGame.has(eventId));
};

/** Watches live Game updates and returns the same Events with Game fields patched. */
export const useEventsWithLiveGames = (
  venueId: PredictVenueId,
  events: readonly PredictEvent[],
  watchEventIds?: readonly PredictEntityId[],
): readonly PredictEvent[] => {
  const [updates, setUpdates] = useState(
    () => new Map<PredictEntityId, PredictGameLive>(),
  );
  const idsToWatch = useMemo(
    () => getLiveGameWatchIds(events, watchEventIds),
    [events, watchEventIds],
  );
  const watchKey = eventIdsKey(idsToWatch);
  const presentKey = eventIdsKey(events.map(({ id }) => id));
  const watchedIdsRef = useRef<PredictEntityId[]>([]);

  useEffect(() => {
    const eventIds = JSON.parse(watchKey) as PredictEntityId[];
    const presentIds = new Set(JSON.parse(presentKey) as PredictEntityId[]);
    const previousIds = watchedIdsRef.current;
    const previousSet = new Set(previousIds);
    const added = eventIds.filter((eventId) => !previousSet.has(eventId));
    const removed = previousIds.filter(
      (eventId) => !eventIds.includes(eventId),
    );

    const onUpdate = (live: PredictGameLive) => {
      if (live.venueId !== venueId || !presentIds.has(live.eventId)) {
        return;
      }
      setUpdates((current) => {
        const previous = current.get(live.eventId);
        if (
          previous === live ||
          (previous && isOlderKalshiLiveFrame(live, previous))
        ) {
          return current;
        }

        const next = new Map(current);
        next.set(live.eventId, live);
        return next;
      });
    };

    Engine.controllerMessenger.subscribe(
      `${PREDICT_LIVE_DATA_SERVICE_NAME}:gameLiveUpdated`,
      onUpdate,
    );
    if (added.length > 0) {
      Engine.controllerMessenger.call(
        `${PREDICT_LIVE_DATA_SERVICE_NAME}:watchGames`,
        venueId,
        added,
      );
    }
    if (removed.length > 0) {
      Engine.controllerMessenger.call(
        `${PREDICT_LIVE_DATA_SERVICE_NAME}:unwatchGames`,
        venueId,
        removed,
      );
    }
    watchedIdsRef.current = eventIds;

    return () => {
      Engine.controllerMessenger.unsubscribe(
        `${PREDICT_LIVE_DATA_SERVICE_NAME}:gameLiveUpdated`,
        onUpdate,
      );
    };
  }, [presentKey, watchKey, venueId]);

  useEffect(() => {
    const presentIds = new Set(JSON.parse(presentKey) as PredictEntityId[]);
    setUpdates((current) => {
      let changed = false;
      const next = new Map(current);
      current.forEach((_live, eventId) => {
        if (!presentIds.has(eventId)) {
          next.delete(eventId);
          changed = true;
        }
      });
      return changed ? next : current;
    });
  }, [presentKey]);

  useEffect(
    () => () => {
      const eventIds = watchedIdsRef.current;
      watchedIdsRef.current = [];
      if (eventIds.length === 0) {
        return;
      }
      Engine.controllerMessenger.call(
        `${PREDICT_LIVE_DATA_SERVICE_NAME}:unwatchGames`,
        venueId,
        eventIds,
      );
    },
    [venueId],
  );

  return useMemo(
    () =>
      events.map((event) => {
        const sports = event.sports;
        const currentGame = sports?.game;
        const update = updates.get(event.id);
        if (!sports || !currentGame || !update) {
          return event;
        }

        const game = mapKalshiGameLiveUpdate(currentGame, update);
        return game
          ? {
              ...event,
              sports: { ...sports, game },
            }
          : event;
      }),
    [events, updates],
  );
};

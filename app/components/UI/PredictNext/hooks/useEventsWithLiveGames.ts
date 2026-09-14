import { useEffect, useMemo, useRef, useState } from 'react';
import Engine from '../../../../core/Engine';
import { mapKalshiGameLiveUpdate } from '../adapters/remote/mapKalshiGameLiveUpdate';
import type { PredictGameLive } from '../contracts/v1/liveData';
import { PREDICT_LIVE_DATA_SERVICE_NAME } from '../services/PredictLiveDataService';
import type { PredictEntityId, PredictEvent, PredictVenueId } from '../types';

/** Watches live Game updates and returns the same Events with Game fields patched. */
export const useEventsWithLiveGames = (
  venueId: PredictVenueId,
  events: readonly PredictEvent[],
): readonly PredictEvent[] => {
  const [updates, setUpdates] = useState(
    () => new Map<PredictEntityId, PredictGameLive>(),
  );
  const eventIdsKey = JSON.stringify(events.map(({ id }) => id));
  const watchedIdsRef = useRef<PredictEntityId[]>([]);

  useEffect(() => {
    const eventIds = JSON.parse(eventIdsKey) as PredictEntityId[];
    const eventIdSet = new Set(eventIds);
    const previousIds = watchedIdsRef.current;
    const previousSet = new Set(previousIds);
    const added = eventIds.filter((eventId) => !previousSet.has(eventId));
    const removed = previousIds.filter((eventId) => !eventIdSet.has(eventId));

    const onUpdate = (live: PredictGameLive) => {
      if (live.venueId !== venueId || !eventIdSet.has(live.eventId)) {
        return;
      }
      setUpdates((current) => {
        if (current.get(live.eventId) === live) {
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
      setUpdates((current) => {
        const next = new Map(current);
        removed.forEach((eventId) => next.delete(eventId));
        return next;
      });
    }
    watchedIdsRef.current = eventIds;

    return () => {
      Engine.controllerMessenger.unsubscribe(
        `${PREDICT_LIVE_DATA_SERVICE_NAME}:gameLiveUpdated`,
        onUpdate,
      );
    };
  }, [eventIdsKey, venueId]);

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

import { useEffect, useMemo, useState } from 'react';
import Engine from '../../../../core/Engine';
import { mapKalshiGameLiveUpdate } from '../adapters/remote/mapKalshiGameLiveUpdate';
import type { PredictGameLive } from '../contracts/v1/liveData';
import { PREDICT_LIVE_DATA_SERVICE_NAME } from '../services/PredictLiveDataService';
import type { PredictEntityId, PredictEvent, PredictVenueId } from '../types';

export const useLiveGames = (
  venueId: PredictVenueId,
  events: readonly PredictEvent[],
): readonly PredictEvent[] => {
  const [updates, setUpdates] = useState(
    () => new Map<PredictEntityId, PredictGameLive>(),
  );
  const eventIdsKey = events.map(({ id }) => id).join(',');

  useEffect(() => {
    if (!eventIdsKey) {
      return;
    }
    const eventIds = eventIdsKey.split(',') as PredictEntityId[];
    const eventIdSet = new Set(eventIds);

    const onUpdate = (live: PredictGameLive) => {
      if (live.venueId !== venueId || !eventIdSet.has(live.eventId)) {
        return;
      }
      setUpdates((current) => {
        const next = new Map(current);
        next.set(live.eventId, live);
        return next;
      });
    };

    Engine.controllerMessenger.subscribe(
      `${PREDICT_LIVE_DATA_SERVICE_NAME}:gameLiveUpdated`,
      onUpdate,
    );
    Engine.controllerMessenger.call(
      `${PREDICT_LIVE_DATA_SERVICE_NAME}:watchGames`,
      venueId,
      eventIds,
    );

    return () => {
      Engine.controllerMessenger.unsubscribe(
        `${PREDICT_LIVE_DATA_SERVICE_NAME}:gameLiveUpdated`,
        onUpdate,
      );
      Engine.controllerMessenger.call(
        `${PREDICT_LIVE_DATA_SERVICE_NAME}:unwatchGames`,
        venueId,
        eventIds,
      );
    };
  }, [eventIdsKey, venueId]);

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

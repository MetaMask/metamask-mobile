import { useMemo } from 'react';
import { useEventsWithLiveGames } from './useEventsWithLiveGames';
import type { PredictEvent, PredictVenueId } from '../types';

const NO_EVENTS: readonly PredictEvent[] = [];

/** Applies live Game updates to a single Event. */
export const useEventWithLiveGame = (
  venueId: PredictVenueId,
  event: PredictEvent | undefined,
): PredictEvent | undefined => {
  const events = useMemo(() => (event ? [event] : NO_EVENTS), [event]);

  return useEventsWithLiveGames(venueId, events)[0];
};

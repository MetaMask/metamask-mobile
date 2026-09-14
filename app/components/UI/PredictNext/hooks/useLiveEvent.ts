import { useMemo } from 'react';
import { useLiveGames } from './useLiveGames';
import type { PredictEvent, PredictVenueId } from '../types';

const NO_EVENTS: readonly PredictEvent[] = [];

/** Applies live Game updates to a single Event. */
export const useLiveEvent = (
  venueId: PredictVenueId,
  event: PredictEvent | undefined,
): PredictEvent | undefined => {
  const events = useMemo(() => (event ? [event] : NO_EVENTS), [event]);

  return useLiveGames(venueId, events)[0];
};

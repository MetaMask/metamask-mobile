import { useMemo } from 'react';
import { useEventsWithLiveData } from './useEventsWithLiveData';
import type { PredictEvent, PredictVenueId } from '../types';

const NO_EVENTS: readonly PredictEvent[] = [];

/** Applies live Game and market-price updates to a single Event. */
export const useEventWithLiveData = (
  venueId: PredictVenueId,
  event: PredictEvent | undefined,
): PredictEvent | undefined => {
  const events = useMemo(() => (event ? [event] : NO_EVENTS), [event]);

  return useEventsWithLiveData(venueId, events)[0];
};

import { useMemo } from 'react';
import {
  useEventsWithLiveData,
  type LiveMarketWatchScope,
} from './useEventsWithLiveData';
import type { PredictEvent, PredictVenueId } from '../types';

const NO_EVENTS: readonly PredictEvent[] = [];

export interface UseEventWithLiveDataOptions {
  /**
   * Which of the Event's Markets to hold live prices for. Defaults to `all`.
   * The Event Screen passes `{ type: 'visible', marketIds }` with the Markets
   * it renders, so a large Game stays under the per-connection cap.
   */
  marketScope?: LiveMarketWatchScope;
}

/** Applies live Game and market-price updates to a single Event. */
export const useEventWithLiveData = (
  venueId: PredictVenueId,
  event: PredictEvent | undefined,
  { marketScope }: UseEventWithLiveDataOptions = {},
): PredictEvent | undefined => {
  const events = useMemo(() => (event ? [event] : NO_EVENTS), [event]);

  return useEventsWithLiveData(venueId, events, { marketScope })[0];
};

import type { PredictEntityId, PredictVenueId } from '../types';
import {
  MARKET_DATA_EVENT_STALE_TIME,
  MARKET_DATA_EVENTS_STALE_TIME,
  marketDataQueries,
} from './marketDataQueries';

const venueId = 'kalshi' as PredictVenueId;
const eventId = 'event-1' as PredictEntityId;

describe('market data query descriptors', () => {
  it('qualifies event list queries by venue and parameters', () => {
    const params = { cursor: 'next', limit: 20 };

    const descriptor = marketDataQueries.getEvents(venueId, params);

    expect(descriptor).toEqual({
      queryKey: ['PredictMarketDataService:getEvents', venueId, params],
      family: ['PredictMarketDataService:getEvents', venueId],
      staleTime: MARKET_DATA_EVENTS_STALE_TIME,
      scope: 'venue',
    });
  });

  it('qualifies event detail queries by venue and event', () => {
    const descriptor = marketDataQueries.getEvent(venueId, eventId);

    expect(descriptor.queryKey).toEqual([
      'PredictMarketDataService:getEvent',
      venueId,
      eventId,
    ]);
    expect(descriptor.family).toEqual([
      'PredictMarketDataService:getEvent',
      venueId,
    ]);
    expect(descriptor.staleTime).toBe(MARKET_DATA_EVENT_STALE_TIME);
  });
});

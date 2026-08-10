import type {
  FetchEventsParams,
  PredictEntityId,
  PredictEvent,
  PredictEventSummary,
  PredictQueryDescriptor,
  PredictVenueId,
  PaginatedResult,
} from '../types';

export const MARKET_DATA_EVENTS_STALE_TIME = 60_000;
export const MARKET_DATA_EVENT_STALE_TIME = 5 * 60_000;

export interface MarketDataQueries {
  getEvents(
    venueId: PredictVenueId,
    params: FetchEventsParams,
  ): PredictQueryDescriptor<
    ['PredictMarketDataService:getEvents', PredictVenueId, FetchEventsParams]
  >;
  getEvent(
    venueId: PredictVenueId,
    eventId: PredictEntityId,
  ): PredictQueryDescriptor<
    ['PredictMarketDataService:getEvent', PredictVenueId, PredictEntityId]
  >;
}

export type GetEventsResult = PaginatedResult<PredictEventSummary>;
export type GetEventResult = PredictEvent;

export const marketDataQueries: MarketDataQueries = {
  getEvents: (venueId, params) => ({
    queryKey: ['PredictMarketDataService:getEvents', venueId, params],
    family: ['PredictMarketDataService:getEvents', venueId],
    staleTime: MARKET_DATA_EVENTS_STALE_TIME,
    scope: 'venue',
  }),
  getEvent: (venueId, eventId) => ({
    queryKey: ['PredictMarketDataService:getEvent', venueId, eventId],
    family: ['PredictMarketDataService:getEvent', venueId],
    staleTime: MARKET_DATA_EVENT_STALE_TIME,
    scope: 'venue',
  }),
};

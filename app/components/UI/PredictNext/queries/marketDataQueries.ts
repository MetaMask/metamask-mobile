import type {
  FetchEventsParams,
  PredictEntityId,
  PredictEvent,
  PredictQueryDescriptor,
  PredictVenueId,
  PredictVenueStatus,
  PaginatedResult,
} from '../types';

export const MARKET_DATA_VENUE_STATUS_STALE_TIME = 60_000;
export const MARKET_DATA_EVENTS_STALE_TIME = 60_000;
export const MARKET_DATA_EVENT_STALE_TIME = 60_000;

export type EventListParams = Omit<FetchEventsParams, 'cursor'>;

export interface MarketDataQueries {
  /** Builds the Venue Status query descriptor. */
  getVenueStatus(
    venueId: PredictVenueId,
  ): PredictQueryDescriptor<
    ['PredictMarketDataService:getVenueStatus', PredictVenueId]
  >;
  getEvents(
    venueId: PredictVenueId,
    params: EventListParams,
  ): PredictQueryDescriptor<
    ['PredictMarketDataService:getEvents', PredictVenueId, EventListParams]
  >;
  getEvent(
    venueId: PredictVenueId,
    eventId: PredictEntityId,
  ): PredictQueryDescriptor<
    ['PredictMarketDataService:getEvent', PredictVenueId, PredictEntityId]
  >;
}

export type GetVenueStatusResult = PredictVenueStatus;
export type GetEventsResult = PaginatedResult<PredictEvent>;
export type GetEventResult = PredictEvent;

export const marketDataQueries: MarketDataQueries = {
  getVenueStatus: (venueId) => ({
    queryKey: ['PredictMarketDataService:getVenueStatus', venueId],
    family: ['PredictMarketDataService:getVenueStatus', venueId],
    staleTime: MARKET_DATA_VENUE_STATUS_STALE_TIME,
    scope: 'venue',
  }),
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

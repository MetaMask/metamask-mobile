import type {
  FetchFeedParams,
  PredictEntityId,
  PredictEvent,
  PredictFeed,
  PredictFeedId,
  PredictMarketHistory,
  PredictMarketHistoryRange,
  PredictQueryDescriptor,
  PredictVenueId,
  PredictVenueStatus,
} from '../types';

export const MARKET_DATA_VENUE_STATUS_STALE_TIME = 60_000;
export const MARKET_DATA_FEED_STALE_TIME = 60_000;
export const MARKET_DATA_EVENT_STALE_TIME = 60_000;
export const MARKET_DATA_MARKET_HISTORY_STALE_TIME = 60_000;

export type FeedParams = Omit<FetchFeedParams, 'cursor'>;

export interface MarketDataQueries {
  /** Builds the Venue Status query descriptor. */
  getVenueStatus(
    venueId: PredictVenueId,
  ): PredictQueryDescriptor<
    ['PredictMarketDataService:getVenueStatus', PredictVenueId]
  >;
  getFeed(
    venueId: PredictVenueId,
    feedId: PredictFeedId,
    params: FeedParams,
  ): PredictQueryDescriptor<
    [
      'PredictMarketDataService:getFeed',
      PredictVenueId,
      PredictFeedId,
      FeedParams,
    ]
  >;
  getEvent(
    venueId: PredictVenueId,
    eventId: PredictEntityId,
  ): PredictQueryDescriptor<
    ['PredictMarketDataService:getEvent', PredictVenueId, PredictEntityId]
  >;
  getMarketHistory(
    venueId: PredictVenueId,
    marketId: PredictEntityId,
    range: PredictMarketHistoryRange,
  ): PredictQueryDescriptor<
    [
      'PredictMarketDataService:getMarketHistory',
      PredictVenueId,
      PredictEntityId,
      PredictMarketHistoryRange,
    ]
  >;
}

export type GetVenueStatusResult = PredictVenueStatus;
export type GetFeedResult = PredictFeed;
export type GetEventResult = PredictEvent;
export type GetMarketHistoryResult = PredictMarketHistory;

export const marketDataQueries: MarketDataQueries = {
  getVenueStatus: (venueId) => ({
    queryKey: ['PredictMarketDataService:getVenueStatus', venueId],
    family: ['PredictMarketDataService:getVenueStatus', venueId],
    staleTime: MARKET_DATA_VENUE_STATUS_STALE_TIME,
    scope: 'venue',
  }),
  getFeed: (venueId, feedId, params) => ({
    queryKey: ['PredictMarketDataService:getFeed', venueId, feedId, params],
    family: ['PredictMarketDataService:getFeed', venueId, feedId],
    staleTime: MARKET_DATA_FEED_STALE_TIME,
    scope: 'venue',
  }),
  getEvent: (venueId, eventId) => ({
    queryKey: ['PredictMarketDataService:getEvent', venueId, eventId],
    family: ['PredictMarketDataService:getEvent', venueId],
    staleTime: MARKET_DATA_EVENT_STALE_TIME,
    scope: 'venue',
  }),
  getMarketHistory: (venueId, marketId, range) => ({
    queryKey: [
      'PredictMarketDataService:getMarketHistory',
      venueId,
      marketId,
      range,
    ],
    family: ['PredictMarketDataService:getMarketHistory', venueId, marketId],
    staleTime: MARKET_DATA_MARKET_HISTORY_STALE_TIME,
    scope: 'venue',
  }),
};

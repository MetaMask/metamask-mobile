import type {
  PredictEntityId,
  PredictFeedId,
  PredictMarketHistoryRange,
  PredictVenueId,
} from '../types';
import {
  MARKET_DATA_EVENT_STALE_TIME,
  MARKET_DATA_FEED_STALE_TIME,
  MARKET_DATA_MARKET_HISTORY_STALE_TIME,
  MARKET_DATA_VENUE_STATUS_STALE_TIME,
  marketDataQueries,
} from './marketDataQueries';

const venueId = 'kalshi' as PredictVenueId;
const eventId = 'event-1' as PredictEntityId;
const feedId = 'sports-football-nfl-games' as PredictFeedId;
const marketId = 'market-1' as PredictEntityId;
const range: PredictMarketHistoryRange = '1D';

describe('market data query descriptors', () => {
  it('qualifies venue status queries by venue', () => {
    const descriptor = marketDataQueries.getVenueStatus(venueId);

    expect(descriptor).toEqual({
      queryKey: ['PredictMarketDataService:getVenueStatus', venueId],
      family: ['PredictMarketDataService:getVenueStatus', venueId],
      staleTime: MARKET_DATA_VENUE_STATUS_STALE_TIME,
      scope: 'venue',
    });
  });

  it('qualifies event list queries by venue and cursor-free parameters', () => {
    const params = { limit: 20 };

    const descriptor = marketDataQueries.getFeed(venueId, feedId, params);

    expect(descriptor).toEqual({
      queryKey: ['PredictMarketDataService:getFeed', venueId, feedId, params],
      family: ['PredictMarketDataService:getFeed', venueId, feedId],
      staleTime: MARKET_DATA_FEED_STALE_TIME,
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

  it('qualifies Market history by Venue, Market, and range', () => {
    const descriptor = marketDataQueries.getMarketHistory(
      venueId,
      marketId,
      range,
    );

    expect(descriptor).toEqual({
      queryKey: [
        'PredictMarketDataService:getMarketHistory',
        venueId,
        marketId,
        range,
      ],
      family: ['PredictMarketDataService:getMarketHistory', venueId, marketId],
      staleTime: MARKET_DATA_MARKET_HISTORY_STALE_TIME,
      scope: 'venue',
    });
  });
});

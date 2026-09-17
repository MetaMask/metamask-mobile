import { useInfiniteQuery, useQuery } from '@metamask/react-data-query';
import { useEvent } from './useEvent';
import { useFeed } from './useFeed';
import { useMarketHistory } from './useMarketHistory';
import { useVenueStatus } from './useVenueStatus';
import type { PredictEntityId, PredictFeedId, PredictVenueId } from '../types';

jest.mock('@metamask/react-data-query', () => ({
  useInfiniteQuery: jest.fn(),
  useQuery: jest.fn(),
}));

const venueId = 'kalshi' as PredictVenueId;
const eventId = 'event-1' as PredictEntityId;
const feedId = 'sports-football-nfl-games' as PredictFeedId;
const marketId = 'market-1' as PredictEntityId;
const mockedUseQuery = jest.mocked(useQuery);
const mockedUseInfiniteQuery = jest.mocked(useInfiniteQuery);

describe('PredictNext market data hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses the Venue Status descriptor', () => {
    useVenueStatus(venueId);

    expect(mockedUseQuery).toHaveBeenCalledWith({
      queryKey: ['PredictMarketDataService:getVenueStatus', venueId],
      enabled: undefined,
    });
  });

  it('forwards the enabled gate to the Venue Status query', () => {
    useVenueStatus(venueId, { enabled: false });

    expect(mockedUseQuery).toHaveBeenCalledWith({
      queryKey: ['PredictMarketDataService:getVenueStatus', venueId],
      enabled: false,
    });
  });

  it('uses a cursor-free Feed key and returns the next cursor', () => {
    useFeed(venueId, feedId, { limit: 20 });
    const options = mockedUseInfiniteQuery.mock.calls[0][0];

    const nextCursor = options.getNextPageParam?.(
      {
        venueId: 'kalshi',
        id: 'sports-football-nfl-games',
        title: 'NFL Games',
        events: [],
        nextCursor: 'next',
      },
      [],
      undefined,
      [],
    );

    expect(options.queryKey).toEqual([
      'PredictMarketDataService:getFeed',
      venueId,
      feedId,
      { limit: 20 },
    ]);
    expect(nextCursor).toBe('next');
  });

  it('stops Event pagination for an empty cursor', () => {
    useFeed(venueId, feedId, { limit: 20 });
    const options = mockedUseInfiniteQuery.mock.calls[0][0];

    const nextCursor = options.getNextPageParam?.(
      {
        venueId: 'kalshi',
        id: 'sports-football-nfl-games',
        title: 'NFL Games',
        events: [],
        nextCursor: '',
      },
      [],
      undefined,
      [],
    );

    expect(nextCursor).toBeUndefined();
  });

  it('uses the immutable Event descriptor', () => {
    useEvent(venueId, eventId);

    expect(mockedUseQuery).toHaveBeenCalledWith({
      queryKey: ['PredictMarketDataService:getEvent', venueId, eventId],
    });
  });

  it('uses the Market history descriptor', () => {
    useMarketHistory(venueId, marketId, '1D');

    expect(mockedUseQuery).toHaveBeenCalledWith({
      queryKey: [
        'PredictMarketDataService:getMarketHistory',
        venueId,
        marketId,
        '1D',
      ],
    });
  });
});

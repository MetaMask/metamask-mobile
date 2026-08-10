import { useInfiniteQuery, useQuery } from '@metamask/react-data-query';
import { useEventDetail } from './useEventDetail';
import { useEventList } from './useEventList';
import { useVenueStatus } from './useVenueStatus';
import type { PredictEntityId, PredictVenueId } from '../types';

jest.mock('@metamask/react-data-query', () => ({
  useInfiniteQuery: jest.fn(),
  useQuery: jest.fn(),
}));

const venueId = 'kalshi' as PredictVenueId;
const eventId = 'event-1' as PredictEntityId;
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
    });
  });

  it('uses a cursor-free Event list key and returns the next cursor', () => {
    useEventList(venueId, { limit: 20 });
    const options = mockedUseInfiniteQuery.mock.calls[0][0];

    const nextCursor = options.getNextPageParam?.(
      { items: [], nextCursor: 'next' },
      [],
    );

    expect(options.queryKey).toEqual([
      'PredictMarketDataService:getEvents',
      venueId,
      { limit: 20 },
    ]);
    expect(nextCursor).toBe('next');
  });

  it('uses the Event detail descriptor', () => {
    useEventDetail(venueId, eventId);

    expect(mockedUseQuery).toHaveBeenCalledWith({
      queryKey: ['PredictMarketDataService:getEvent', venueId, eventId],
    });
  });
});

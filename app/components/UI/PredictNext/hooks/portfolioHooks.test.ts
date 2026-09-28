import { useInfiniteQuery } from '@metamask/react-data-query';
import { useActivity } from './useActivity';
import { usePositions } from './usePositions';
import type { PredictVenueId } from '../types';

jest.mock('@metamask/react-data-query', () => ({
  useInfiniteQuery: jest.fn(),
}));

const venueId = 'kalshi' as PredictVenueId;
const mockedUseInfiniteQuery = jest.mocked(useInfiniteQuery);

describe('PredictNext portfolio hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses a cursor-free Positions key and returns the next cursor', () => {
    usePositions(venueId, { limit: 20 });
    const options = mockedUseInfiniteQuery.mock.calls[0][0];

    const nextCursor = options.getNextPageParam?.(
      { venueId: 'kalshi', positions: [], nextCursor: 'next' },
      [],
      undefined,
      [],
    );

    expect(options.queryKey).toEqual([
      'PredictPortfolioService:getPositions',
      venueId,
      { limit: 20 },
    ]);
    expect(options.initialPageParam).toBeUndefined();
    expect(nextCursor).toBe('next');
  });

  it('stops Positions pagination for an empty cursor', () => {
    usePositions(venueId, { limit: 20 });
    const options = mockedUseInfiniteQuery.mock.calls[0][0];

    const nextCursor = options.getNextPageParam?.(
      { venueId: 'kalshi', positions: [] },
      [],
      undefined,
      [],
    );

    expect(nextCursor).toBeUndefined();
  });

  it('forwards the enabled gate to the Positions query', () => {
    usePositions(venueId, { limit: 20 }, { enabled: false });
    const options = mockedUseInfiniteQuery.mock.calls[0][0];

    expect(options.enabled).toBe(false);
  });

  it('uses a cursor-free Activity key and returns the next cursor', () => {
    useActivity(venueId, { limit: 20 });
    const options = mockedUseInfiniteQuery.mock.calls[0][0];

    const nextCursor = options.getNextPageParam?.(
      { venueId: 'kalshi', activity: [], nextCursor: 'next' },
      [],
      undefined,
      [],
    );

    expect(options.queryKey).toEqual([
      'PredictPortfolioService:getActivity',
      venueId,
      { limit: 20 },
    ]);
    expect(options.initialPageParam).toBeUndefined();
    expect(nextCursor).toBe('next');
  });

  it('forwards the enabled gate to the Activity query', () => {
    useActivity(venueId, { limit: 20 }, { enabled: false });
    const options = mockedUseInfiniteQuery.mock.calls[0][0];

    expect(options.enabled).toBe(false);
  });
});

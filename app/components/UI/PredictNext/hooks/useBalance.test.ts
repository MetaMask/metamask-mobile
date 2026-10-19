import { useQuery } from '@tanstack/react-query';
import { useBalance } from './useBalance';
import type { PredictVenueId } from '../types';

jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(),
}));

const venueId = 'kalshi' as PredictVenueId;
const mockedUseQuery = jest.mocked(useQuery);

describe('useBalance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses the Balance descriptor without automatic retries', () => {
    useBalance(venueId);

    expect(mockedUseQuery).toHaveBeenCalledWith({
      queryKey: ['PredictPortfolioService:getBalance', venueId],
      staleTime: 60_000,
      retry: false,
    });
  });
});

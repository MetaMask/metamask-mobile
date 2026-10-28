import { useQuery } from '@tanstack/react-query';
import { usePortfolioSummary } from './usePortfolioSummary';
import type { PredictVenueId } from '../types';

jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(),
}));

const venueId = 'kalshi' as PredictVenueId;
const mockedUseQuery = jest.mocked(useQuery);

describe('usePortfolioSummary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses the Summary descriptor without automatic retries', () => {
    usePortfolioSummary(venueId);

    expect(mockedUseQuery).toHaveBeenCalledWith({
      queryKey: ['PredictPortfolioService:getPortfolioSummary', venueId],
      staleTime: 30_000,
      retry: false,
    });
  });
});

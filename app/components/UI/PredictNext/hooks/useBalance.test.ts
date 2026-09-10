import { useQuery } from '@metamask/react-data-query';
import { useBalance } from './useBalance';
import type { PredictVenueId } from '../types';

jest.mock('@metamask/react-data-query', () => ({
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
      queryKey: ['PredictMarketDataService:getBalance', venueId],
      retry: false,
    });
  });
});

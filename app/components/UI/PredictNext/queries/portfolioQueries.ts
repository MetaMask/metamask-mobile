import type {
  PredictBalance,
  PredictQueryDescriptor,
  PredictVenueId,
} from '../types';

export const PORTFOLIO_BALANCE_STALE_TIME = 60_000;
export type GetBalanceResult = PredictBalance;

export const portfolioQueries = {
  getBalance: (
    venueId: PredictVenueId,
  ): PredictQueryDescriptor<
    ['PredictMarketDataService:getBalance', PredictVenueId]
  > => ({
    queryKey: ['PredictMarketDataService:getBalance', venueId],
    family: ['PredictMarketDataService:getBalance', venueId],
    staleTime: PORTFOLIO_BALANCE_STALE_TIME,
    scope: 'venue',
  }),
};

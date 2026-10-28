import type { Json } from '@metamask/utils';
import type {
  FetchPortfolioPageParams,
  FetchPositionsParams,
  PredictActivityPage,
  PredictBalance,
  PredictPortfolioSummary,
  PredictPositionsPage,
  PredictQueryDescriptor,
  PredictVenueId,
} from '../types';

export const PORTFOLIO_BALANCE_STALE_TIME = 60_000;
export const PORTFOLIO_POSITIONS_STALE_TIME = 30_000;
export const PORTFOLIO_ACTIVITY_STALE_TIME = 30_000;
export const PORTFOLIO_SUMMARY_STALE_TIME = 30_000;
/** Page size requested by the Portfolio screen; the backend default is 20, max 50. */
export const PORTFOLIO_PAGE_LIMIT = 20;

/** Cursor-free page parameters, safe for cache keys. */
export type PortfolioPageParams = Omit<FetchPortfolioPageParams, 'cursor'>;

/** Cursor-free Positions parameters: the page size plus the status filter
 * and sort order, which the backend binds the cursor to. */
export type PositionsPageParams = Omit<FetchPositionsParams, 'cursor'>;

export type GetBalanceResult = PredictBalance;
export type GetPositionsResult = PredictPositionsPage;
export type GetActivityResult = PredictActivityPage;
export type GetPortfolioSummaryResult = PredictPortfolioSummary;

export const portfolioQueries = {
  getBalance: (
    venueId: PredictVenueId,
  ): PredictQueryDescriptor<
    ['PredictPortfolioService:getBalance', PredictVenueId]
  > => ({
    queryKey: ['PredictPortfolioService:getBalance', venueId],
    family: ['PredictPortfolioService:getBalance', venueId],
    staleTime: PORTFOLIO_BALANCE_STALE_TIME,
    scope: 'venue',
  }),
  getPositions: (
    venueId: PredictVenueId,
    params: PositionsPageParams,
  ): PredictQueryDescriptor<
    [
      'PredictPortfolioService:getPositions',
      PredictVenueId,
      PositionsPageParams,
    ]
  > => ({
    queryKey: ['PredictPortfolioService:getPositions', venueId, params],
    family: ['PredictPortfolioService:getPositions', venueId],
    staleTime: PORTFOLIO_POSITIONS_STALE_TIME,
    scope: 'venue',
  }),
  getActivity: (
    venueId: PredictVenueId,
    params: PortfolioPageParams,
  ): PredictQueryDescriptor<
    ['PredictPortfolioService:getActivity', PredictVenueId, PortfolioPageParams]
  > => ({
    queryKey: ['PredictPortfolioService:getActivity', venueId, params],
    family: ['PredictPortfolioService:getActivity', venueId],
    staleTime: PORTFOLIO_ACTIVITY_STALE_TIME,
    scope: 'venue',
  }),
  getPortfolioSummary: (
    venueId: PredictVenueId,
  ): PredictQueryDescriptor<
    ['PredictPortfolioService:getPortfolioSummary', PredictVenueId]
  > => ({
    queryKey: ['PredictPortfolioService:getPortfolioSummary', venueId],
    family: ['PredictPortfolioService:getPortfolioSummary', venueId],
    staleTime: PORTFOLIO_SUMMARY_STALE_TIME,
    scope: 'venue',
  }),
};

/** The invalidation families of the authoritative portfolio reads, in the
 * Balance, Positions, Activity, Summary order, as query-key prefixes. A
 * financial write invalidates all four by family, so every cached page of
 * each read refetches; families are params-independent by construction. */
export const portfolioQueryFamilies = (
  venueId: PredictVenueId,
): [string, ...Json[]][] =>
  [
    portfolioQueries.getBalance(venueId).family,
    portfolioQueries.getPositions(venueId, {}).family,
    portfolioQueries.getActivity(venueId, {}).family,
    portfolioQueries.getPortfolioSummary(venueId).family,
  ] as [string, ...Json[]][];

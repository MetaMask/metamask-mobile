import type { Json } from '@metamask/utils';
import type {
  FetchPortfolioPageParams,
  PredictActivityPage,
  PredictBalance,
  PredictPositionsPage,
  PredictQueryDescriptor,
  PredictVenueId,
} from '../types';

export const PORTFOLIO_BALANCE_STALE_TIME = 60_000;
export const PORTFOLIO_POSITIONS_STALE_TIME = 30_000;
export const PORTFOLIO_ACTIVITY_STALE_TIME = 30_000;
/** Page size requested by the Portfolio screen; the backend default is 20, max 50. */
export const PORTFOLIO_PAGE_LIMIT = 20;

/** Cursor-free page parameters, safe for cache keys. */
export type PortfolioPageParams = Omit<FetchPortfolioPageParams, 'cursor'>;

const BALANCE_ACTION = 'PredictPortfolioService:getBalance' as const;
const POSITIONS_ACTION = 'PredictPortfolioService:getPositions' as const;
const ACTIVITY_ACTION = 'PredictPortfolioService:getActivity' as const;

/** The service action each portfolio read calls, which is also the first
 * element of every portfolio query key. A shared cache uses these to select
 * exactly the PredictNext portfolio queries and nothing else. */
export const PORTFOLIO_QUERY_ACTION_NAMES: readonly string[] = [
  BALANCE_ACTION,
  POSITIONS_ACTION,
  ACTIVITY_ACTION,
];

export type GetBalanceResult = PredictBalance;
export type GetPositionsResult = PredictPositionsPage;
export type GetActivityResult = PredictActivityPage;

export const portfolioQueries = {
  getBalance: (
    venueId: PredictVenueId,
  ): PredictQueryDescriptor<
    ['PredictPortfolioService:getBalance', PredictVenueId]
  > => ({
    queryKey: [BALANCE_ACTION, venueId],
    family: [BALANCE_ACTION, venueId],
    staleTime: PORTFOLIO_BALANCE_STALE_TIME,
    scope: 'venue',
  }),
  getPositions: (
    venueId: PredictVenueId,
    params: PortfolioPageParams,
  ): PredictQueryDescriptor<
    [
      'PredictPortfolioService:getPositions',
      PredictVenueId,
      PortfolioPageParams,
    ]
  > => ({
    queryKey: [POSITIONS_ACTION, venueId, params],
    family: [POSITIONS_ACTION, venueId],
    staleTime: PORTFOLIO_POSITIONS_STALE_TIME,
    scope: 'venue',
  }),
  getActivity: (
    venueId: PredictVenueId,
    params: PortfolioPageParams,
  ): PredictQueryDescriptor<
    ['PredictPortfolioService:getActivity', PredictVenueId, PortfolioPageParams]
  > => ({
    queryKey: [ACTIVITY_ACTION, venueId, params],
    family: [ACTIVITY_ACTION, venueId],
    staleTime: PORTFOLIO_ACTIVITY_STALE_TIME,
    scope: 'venue',
  }),
};

/** The invalidation families of the authoritative portfolio reads, in the
 * Balance, Positions, Activity order, as query-key prefixes. A financial
 * write invalidates all three by family, so every cached page of each read
 * refetches; families are params-independent by construction. */
export const portfolioQueryFamilies = (
  venueId: PredictVenueId,
): [string, ...Json[]][] =>
  [
    portfolioQueries.getBalance(venueId).family,
    portfolioQueries.getPositions(venueId, {}).family,
    portfolioQueries.getActivity(venueId, {}).family,
  ] as [string, ...Json[]][];

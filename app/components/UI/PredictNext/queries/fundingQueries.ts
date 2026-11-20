import type { PredictQueryDescriptor, PredictVenueId } from '../types';

/** Open deposits change only through the Predict User's own actions and the
 * backend's work on them, so a short stale time keeps a waiting deposit
 * current without polling from the cache. */
export const FUNDING_OPEN_DEPOSITS_STALE_TIME = 10_000;
/** A deposit the app watches moves within seconds once its transfer is
 * reported. */
export const FUNDING_DEPOSIT_STALE_TIME = 5_000;

export const fundingQueries = {
  openDeposits: (
    venueId: PredictVenueId,
  ): PredictQueryDescriptor<
    ['PredictFundingService:listOpenDeposits', PredictVenueId]
  > => ({
    queryKey: ['PredictFundingService:listOpenDeposits', venueId],
    family: ['PredictFundingService:listOpenDeposits', venueId],
    staleTime: FUNDING_OPEN_DEPOSITS_STALE_TIME,
    scope: 'venue',
  }),
  deposit: (
    venueId: PredictVenueId,
    operationId: string,
  ): PredictQueryDescriptor<
    ['PredictFundingService:getDeposit', PredictVenueId, string]
  > => ({
    queryKey: ['PredictFundingService:getDeposit', venueId, operationId],
    family: ['PredictFundingService:getDeposit', venueId],
    staleTime: FUNDING_DEPOSIT_STALE_TIME,
    scope: 'venue',
  }),
};

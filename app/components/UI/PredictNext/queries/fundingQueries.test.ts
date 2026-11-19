import type { PredictVenueId } from '../types';
import {
  FUNDING_DEPOSIT_STALE_TIME,
  FUNDING_OPEN_DEPOSITS_STALE_TIME,
  fundingQueries,
} from './fundingQueries';

const venueId = 'kalshi' as PredictVenueId;
const operationId = '019a7c3e-5c1a-7d2e-9a40-3f1c2b0d4e5f';

describe('funding query descriptors', () => {
  it('qualifies the open deposits by Venue', () => {
    expect(fundingQueries.openDeposits(venueId)).toEqual({
      queryKey: ['PredictFundingService:listOpenDeposits', venueId],
      family: ['PredictFundingService:listOpenDeposits', venueId],
      staleTime: FUNDING_OPEN_DEPOSITS_STALE_TIME,
      scope: 'venue',
    });
  });

  it('keys one deposit by Venue and operation ID, in a per-Venue family', () => {
    expect(fundingQueries.deposit(venueId, operationId)).toEqual({
      queryKey: ['PredictFundingService:getDeposit', venueId, operationId],
      family: ['PredictFundingService:getDeposit', venueId],
      staleTime: FUNDING_DEPOSIT_STALE_TIME,
      scope: 'venue',
    });
  });
});

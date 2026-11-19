import { usePredictEligibility } from '../../Predict/hooks/usePredictEligibility';
import type { PredictCampaign } from './campaignVenues';

/**
 * Whether the user's region may take part in a campaign's Venue. A campaign's
 * opt-in shows its region lock while this is false.
 *
 * Every campaign runs on Polymarket (see `campaignVenues.ts`), so this is
 * Polymarket's geo eligibility, refreshed the way legacy Predict refreshes it.
 * It holds whichever Venue is active: a Polymarket campaign stays a Polymarket
 * campaign while Kalshi is active.
 */
export const usePredictCampaignEligibility = (
  _campaign: PredictCampaign,
): boolean => usePredictEligibility().isEligible;

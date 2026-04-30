import type { CampaignDto } from '../../../../core/Engine/controllers/rewards-controller/types';
import { getCampaignStatus } from '../components/Campaigns/CampaignTile.utils';

/**
 * Number of qualifying days required to be eligible for a prize in an Ondo GM campaign.
 * A "qualifying day" is any day the participant holds their net deposit above the tier
 * minimum — days do not need to be consecutive.
 */
export const ONDO_GM_REQUIRED_QUALIFIED_DAYS = 10;

/**
 * Returns true when the active campaign no longer has enough calendar days
 * remaining for the required qualifying-day count to be accumulated.
 *
 * The backend counts calendar days (UTC): opening a position today counts as
 * day 1, every subsequent day until endDate inclusive counts as well.
 * daysAvailable = floor((endDate - startOfTodayUTC) / 24h) + 1
 *
 * Pass `qualified` from the user's leaderboard position to short-circuit for
 * participants who have already qualified.
 */
export function isCampaignIneligible(
  campaign: CampaignDto | null,
  qualified?: boolean | null,
): boolean {
  if (!campaign) return false;
  if (qualified) return false;
  if (getCampaignStatus(campaign) !== 'active') return false;
  const now = new Date();
  const startOfTodayUTC = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );
  const endDate = new Date(campaign.endDate).getTime();
  const daysAvailable =
    Math.floor((endDate - startOfTodayUTC) / (1000 * 60 * 60 * 24)) + 1;
  return daysAvailable < ONDO_GM_REQUIRED_QUALIFIED_DAYS;
}

import type { RootState } from '..';
import type {
  ReferralLocalizedText,
  ReferralVariant,
} from '../../core/Engine/controllers/rewards-money-controller/types';
import { selectGeoLocation } from '../rewards/selectors';
import type { EarningsSummaryEntry, ReferralMeEntry } from '.';
import { isMoneyReferralAllowedForGeo } from './isMoneyReferralAllowedForGeo';

/**
 * Referral-me entry for one Hydra profile.
 *
 * The profile id is an argument rather than a selector dependency: it is
 * resolved asynchronously by `useReferralMe`, so there is no synchronous
 * selector for it. `undefined` means "not resolved yet" and yields no entry.
 */
export function selectReferralMeEntry(
  state: RootState,
  profileId: string | undefined,
): ReferralMeEntry | undefined {
  if (!profileId) {
    return undefined;
  }
  return state.rewardsMoney.referralMe[profileId];
}

/** Server-side screen decision; `undefined` until the entry has data. */
export function selectReferralMeVariant(
  state: RootState,
  profileId: string | undefined,
): ReferralVariant | undefined {
  return selectReferralMeEntry(state, profileId)?.data?.variant;
}

/** Server-resolved copy for the Money screens; `undefined` until data lands. */
export function selectReferralMeLocalizedText(
  state: RootState,
  profileId: string | undefined,
): ReferralLocalizedText | undefined {
  return selectReferralMeEntry(state, profileId)?.data?.localized_text;
}

/**
 * Whether the current device country may accept a Money referral invite.
 *
 * Combines Rewards geo metadata with the program's `excluded_regions` from
 * referral me. Unknown geo fails open (same as Rewards opt-in on error).
 */
export function selectMoneyReferralAllowedForGeo(
  state: RootState,
  profileId: string | undefined,
): boolean {
  const geoLocation = selectGeoLocation(state);
  const excludedRegions = selectReferralMeEntry(state, profileId)?.data
    ?.excluded_regions;
  return isMoneyReferralAllowedForGeo(geoLocation, excludedRegions);
}

/**
 * Unnarrowed `GET /earnings/summary` entry for one Hydra profile. Keyed the
 * same way as referral me, for the same reason: a late write for a signed-out
 * profile must not be read as the current one's.
 */
export function selectEarningsSummaryEntry(
  state: RootState,
  profileId: string | undefined,
): EarningsSummaryEntry | undefined {
  if (!profileId) {
    return undefined;
  }
  return state.rewardsMoney.earningsSummary[profileId];
}

import type { RootState } from '..';
import type {
  CommissionEntryView,
  LedgerEarningEntryDto,
  ReferralLocalizedText,
  ReferralVariant,
} from '../../core/Engine/controllers/rewards-money-controller/types';
import type {
  EarningsSummaryEntry,
  ReferralFunnelEntry,
  ReferralMeEntry,
} from '.';

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

export function selectReferralFunnelEntry(
  state: RootState,
  profileId: string | undefined,
): ReferralFunnelEntry | undefined {
  if (!profileId) {
    return undefined;
  }
  return state.rewardsMoney.referralFunnel[profileId];
}

export function selectCommissions(
  state: RootState,
  profileId: string | undefined,
): CommissionEntryView[] | undefined {
  if (!profileId) {
    return undefined;
  }
  return state.rewardsMoney.commissions[profileId];
}

export function selectCashbackLedger(
  state: RootState,
  profileId: string | undefined,
): LedgerEarningEntryDto[] | undefined {
  if (!profileId) {
    return undefined;
  }
  return state.rewardsMoney.cashbackLedger[profileId];
}

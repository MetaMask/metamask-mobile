import type { RootState } from '..';
import type {
  ClaimDto,
  CommissionEntryView,
  MechanismsView,
  LedgerEarningEntryDto,
  LedgerEntryDto,
  ReferralLocalizedText,
  ReferralMeDto,
  ReferralRole,
} from '../../core/Engine/controllers/rewards-money-controller/types';
import { selectGeoLocation } from '../rewards/selectors';
import { selectRewardsMoneyControllerEnabled } from '../../selectors/featureFlagController/rewardsMoneyController';
import { selectSessionProfileId } from '../../selectors/identity';
import { selectBasicFunctionalityEnabled } from '../../selectors/settings';
import type {
  ClaimLock,
  EarningsSummaryEntry,
  ReferralFunnelEntry,
  ReferralMeEntry,
} from '.';
import { isMoneyReferralAllowedForGeo } from './isMoneyReferralAllowedForGeo';

/** Which Rewards home a settled referral-me payload opens. */
export type MoneyDashboardPersona = 'referrer' | 'referee' | 'plain';

const REFEREE_ROLES: readonly ReferralRole[] = [
  'REFEREE',
  'CASHBACK_EXPERIMENT',
  'COPY_TRADING',
];

/**
 * Referrer when `roles` holds `REFERRER` and the server screen is the referrer
 * one, including a caller who is also a referee. Referee when the server
 * screen is the referee one and `roles` holds a referee, cashback-experiment,
 * or copy-trading relationship. Everyone else, including an empty `roles`
 * list, is a plain user.
 */
export function moneyDashboardPersona(
  referralMe: Pick<ReferralMeDto, 'roles' | 'ui_variant'> | null | undefined,
): MoneyDashboardPersona {
  const roles = referralMe?.roles ?? [];
  if (roles.includes('REFERRER') && referralMe?.ui_variant === 'REFERRER') {
    return 'referrer';
  }
  if (
    referralMe?.ui_variant === 'REFEREE' &&
    REFEREE_ROLES.some((role) => roles.includes(role))
  ) {
    return 'referee';
  }
  return 'plain';
}

export function isReferrerPersona(
  referralMe: Pick<ReferralMeDto, 'roles' | 'ui_variant'> | null | undefined,
): boolean {
  return moneyDashboardPersona(referralMe) === 'referrer';
}

export function isRefereePersona(
  referralMe: Pick<ReferralMeDto, 'roles' | 'ui_variant'> | null | undefined,
): boolean {
  return moneyDashboardPersona(referralMe) === 'referee';
}

export function isPlainUser(
  referralMe: Pick<ReferralMeDto, 'roles' | 'ui_variant'> | null | undefined,
): boolean {
  return moneyDashboardPersona(referralMe) === 'plain';
}

/** Which referee Money sections a role set turns on. A combo is the union. */
export interface RefereeMoneySections {
  /** `REFEREE` or `COPY_TRADING`. Still behind Social V1 at the call site. */
  socialRewards: boolean;
  /** `REFEREE` or `CASHBACK_EXPERIMENT`. */
  tradingRebates: boolean;
}

/**
 * Social rewards for a referee or a copy-trading sharer. Trading rebates for
 * a referee or a cashback-experiment member. `REFEREE` turns both on.
 *
 * Missing roles keep both on. A settled `referral/me` always sends `roles`,
 * including `[]`. Callers that have not loaded that payload yet, and tests
 * that omit it, stay on the screen that shows both sections.
 */
export function refereeMoneySections(
  roles: readonly ReferralRole[] | null | undefined,
): RefereeMoneySections {
  if (!roles) {
    return { socialRewards: true, tradingRebates: true };
  }
  return {
    socialRewards: roles.includes('REFEREE') || roles.includes('COPY_TRADING'),
    tradingRebates:
      roles.includes('REFEREE') || roles.includes('CASHBACK_EXPERIMENT'),
  };
}

/**
 * A copy-trading sharer with no trading rebates. Missing roles are not
 * copy-trading-only, so a payload that has not loaded keeps the trading copy.
 */
export function isCopyTradingOnly(
  roles: readonly ReferralRole[] | null | undefined,
): boolean {
  const sections = refereeMoneySections(roles);
  return sections.socialRewards && !sections.tradingRebates;
}

/**
 * A plain user and a cashback-experiment member can still accept an invite.
 * A referrer or an existing referee cannot.
 */
export function canAcceptMoneyReferralInvite(
  referralMe: Pick<ReferralMeDto, 'roles'> | null | undefined,
): boolean {
  const roles = referralMe?.roles ?? [];
  return !roles.includes('REFERRER') && !roles.includes('REFEREE');
}

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
  return state.rewardsMoney.referralMe?.[profileId];
}

/**
 * Dashboard persona for a settled payload. `undefined` until the entry has
 * data, so a missing fetch is not read as a plain user.
 */
export function selectMoneyDashboardPersona(
  state: RootState,
  profileId: string | undefined,
): MoneyDashboardPersona | undefined {
  const data = selectReferralMeEntry(state, profileId)?.data;
  if (!data) {
    return undefined;
  }
  return moneyDashboardPersona(data);
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
  return state.rewardsMoney.earningsSummary?.[profileId];
}

export function selectReferralFunnelEntry(
  state: RootState,
  profileId: string | undefined,
): ReferralFunnelEntry | undefined {
  if (!profileId) {
    return undefined;
  }
  return state.rewardsMoney.referralFunnel?.[profileId];
}

export function selectCommissionMechanisms(
  state: RootState,
  profileId: string | undefined,
): MechanismsView | undefined {
  if (!profileId) {
    return undefined;
  }
  return state.rewardsMoney.commissionMechanisms?.[profileId];
}

export function selectCommissions(
  state: RootState,
  profileId: string | undefined,
): CommissionEntryView[] | undefined {
  if (!profileId) {
    return undefined;
  }
  return state.rewardsMoney.commissions?.[profileId];
}

/** Claim-route flags from the latest commissions first page. */
export function selectCommissionMechanisms(
  state: RootState,
  profileId: string | undefined,
): MechanismsView | undefined {
  if (!profileId) {
    return undefined;
  }
  return state.rewardsMoney.commissionMechanisms?.[profileId];
}

export function selectCashbackLedger(
  state: RootState,
  profileId: string | undefined,
): LedgerEarningEntryDto[] | undefined {
  if (!profileId) {
    return undefined;
  }
  return state.rewardsMoney.cashbackLedger?.[profileId];
}

/** First page of the unified earnings ledger for one Hydra profile. */
export function selectEarningsHistory(
  state: RootState,
  profileId: string | undefined,
): LedgerEntryDto[] | undefined {
  if (!profileId) {
    return undefined;
  }
  return state.rewardsMoney.earningsHistory?.[profileId];
}

/** First page of open claims for one Hydra profile. */
export function selectInFlightClaims(
  state: RootState,
  profileId: string | undefined,
): ClaimDto[] | undefined {
  if (!profileId) {
    return undefined;
  }
  return state.rewardsMoney.inFlightClaims?.[profileId];
}

/** Epoch ms until Claim is enabled again, after a refusal's `Retry-After`. */
export function selectClaimWaitingUntil(
  state: RootState,
  profileId: string | undefined,
): number | undefined {
  if (!profileId) {
    return undefined;
  }
  return state.rewardsMoney.claimWaitingUntil?.[profileId];
}

/** Referral code a deeplink left for the invite sheet, if any. */
export function selectPendingMoneyReferralCode(
  state: RootState,
): string | null {
  return state.rewardsMoney?.pendingReferralCode ?? null;
}

/** Last referral code answered this session, if any. */
export function selectAnsweredMoneyReferralCode(
  state: RootState,
): string | null {
  return state.rewardsMoney?.answeredReferralCode ?? null;
}

/** Whether a deeplink carrying a referral code is still being handled. */
export function selectIsReferralLinkPending(state: RootState): boolean {
  return state.rewardsMoney?.isReferralLinkPending ?? false;
}

/** Session lock that keeps Claim disabled after the Earnings tab unmounts. */
export function selectClaimLock(
  state: RootState,
  profileId: string | undefined,
): ClaimLock | undefined {
  if (!profileId) {
    return undefined;
  }
  return state.rewardsMoney.claimLocks?.[profileId];
}

/**
 * Whether Rewards Settings has a Money referral section to show.
 *
 * The controller is off when basic functionality is off or the remote flag is
 * off, even if a payload is still cached. A null payload with no cached data
 * is the same: there is nothing to render. A profile whose roles include
 * `REFERRER` cannot be referred, matching the Money invite sheet, whatever
 * dashboard variant it was given. A referee still sees the linked code. A
 * country on the program's excluded regions has no section either.
 */
export function selectSettingsReferralAvailable(state: RootState): boolean {
  const moneyControllerEnabled =
    Boolean(selectBasicFunctionalityEnabled(state)) &&
    selectRewardsMoneyControllerEnabled(state);
  if (!moneyControllerEnabled) {
    return false;
  }
  const profileId = selectSessionProfileId(state);
  const referralMe = selectReferralMeEntry(state, profileId)?.data;
  if (referralMe == null || referralMe.roles.includes('REFERRER')) {
    return false;
  }
  return selectMoneyReferralAllowedForGeo(state, profileId);
}

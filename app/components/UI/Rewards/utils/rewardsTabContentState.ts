import type { ReferralVariant } from '../../../../core/Engine/controllers/rewards-money-controller/types';

/**
 * Shared readiness rules for Rewards tab time-to-content and RewardsHome routing.
 *
 * Mirrors RewardsHome + OnboardingMainStep's skeleton gate:
 * - version blocked → update-required screen is content
 * - Money enabled but the referral persona unresolved → hold the tab (no home)
 * - REFERRER / REFEREE → the Money dashboard is content
 * - subscriptionId → enrolled dashboard shell is content
 * - candidate still pending/retry → onboarding is mounted as the discovery
 * surface; enrollment is not known yet, so TTC stays open
 * - otherwise onboarding is content
 */
export type RewardsTabContentVariant =
  | 'dashboard'
  | 'onboarding'
  | 'update_required'
  | 'money_dashboard';

export type RewardsTabPendingReason =
  | 'money_referral'
  | 'candidate_subscription';

export type RewardsTabContentState =
  | { status: 'pending'; reason: RewardsTabPendingReason }
  | { status: 'ready'; variant: RewardsTabContentVariant };

export type CandidateSubscriptionId =
  | string
  | 'pending'
  | 'error'
  | 'retry'
  | null;

export function getRewardsTabContentState({
  isVersionBlocked,
  subscriptionId,
  candidateSubscriptionId,
  moneyEnabled,
  moneyReferralResolved,
  moneyVariant,
}: {
  isVersionBlocked: boolean;
  subscriptionId: string | null;
  candidateSubscriptionId: CandidateSubscriptionId;
  /** Rewards Money remote flag. Its own routing inputs only apply when true. */
  moneyEnabled: boolean;
  /**
   * Whether profile resolution plus the first referral-me fetch have settled.
   *
   * Redux alone cannot tell an unresolved persona from `NONE` — a signed-out
   * session never writes an entry at all — so the caller settles this once and
   * leaves it settled. Later refetches must not re-open the gate, or the tab
   * would tear down a home screen the user is already on.
   */
  moneyReferralResolved: boolean;
  /** `undefined` once resolved means no profile or a failed fetch. */
  moneyVariant: ReferralVariant | undefined;
}): RewardsTabContentState {
  if (isVersionBlocked) {
    return { status: 'ready', variant: 'update_required' };
  }

  if (moneyEnabled && !moneyReferralResolved) {
    return { status: 'pending', reason: 'money_referral' };
  }

  if (
    moneyEnabled &&
    (moneyVariant === 'REFERRER' || moneyVariant === 'REFEREE')
  ) {
    return { status: 'ready', variant: 'money_dashboard' };
  }

  if (subscriptionId) {
    return { status: 'ready', variant: 'dashboard' };
  }

  const candidateLoading =
    candidateSubscriptionId === 'pending' ||
    candidateSubscriptionId === 'retry';

  if (candidateLoading) {
    return { status: 'pending', reason: 'candidate_subscription' };
  }

  return { status: 'ready', variant: 'onboarding' };
}

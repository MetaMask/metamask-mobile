import type { MoneyDashboardPersona } from '../../../../reducers/rewardsMoney/selectors';

/**
 * Shared readiness rules for Rewards tab time-to-content and RewardsHome routing.
 *
 * Mirrors RewardsHome + OnboardingMainStep's skeleton gate:
 * - version blocked → update-required screen is content
 * - Money enabled but the referral persona unresolved → hold the tab (no home)
 * - referrer / referee → the Money dashboard is content
 * - otherwise the points dashboard is content, with or without a subscription
 * - candidate still pending/retry → the tab waits; Campaigns and Benefits
 * depend on the subscription, so the dashboard is not content yet
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
  moneyPersona,
}: {
  isVersionBlocked: boolean;
  subscriptionId: string | null;
  candidateSubscriptionId: CandidateSubscriptionId;
  /** Rewards Money remote flag. Its own routing inputs only apply when true. */
  moneyEnabled: boolean;
  /**
   * Whether profile resolution plus the first referral-me fetch have settled.
   *
   * Redux alone cannot tell an unresolved persona from a plain user — a
   * signed-out session never writes an entry at all — so the caller settles
   * this once and leaves it settled. Later refetches must not re-open the
   * gate, or the tab would tear down a home screen the user is already on.
   */
  moneyReferralResolved: boolean;
  /** `undefined` once resolved means no profile or a failed fetch. */
  moneyPersona: MoneyDashboardPersona | undefined;
}): RewardsTabContentState {
  if (isVersionBlocked) {
    return { status: 'ready', variant: 'update_required' };
  }

  if (moneyEnabled && !moneyReferralResolved) {
    return { status: 'pending', reason: 'money_referral' };
  }

  if (
    moneyEnabled &&
    (moneyPersona === 'referrer' || moneyPersona === 'referee')
  ) {
    return { status: 'ready', variant: 'money_dashboard' };
  }

  const candidateLoading =
    candidateSubscriptionId === 'pending' ||
    candidateSubscriptionId === 'retry';

  if (!subscriptionId && candidateLoading) {
    return { status: 'pending', reason: 'candidate_subscription' };
  }

  return { status: 'ready', variant: 'dashboard' };
}

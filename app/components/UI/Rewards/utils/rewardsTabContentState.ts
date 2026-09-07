/**
 * Shared readiness rules for Rewards tab time-to-content.
 *
 * Mirrors RewardsHome routing + OnboardingMainStep's skeleton gate:
 * - version blocked → update-required screen is content
 * - subscriptionId → enrolled dashboard shell is content
 * - otherwise wait until candidateSubscriptionId leaves pending/retry so OnboardingMainStep can render (not the full-screen auth skeleton)
 */
export type RewardsTabContentVariant =
  | 'dashboard'
  | 'onboarding'
  | 'update_required';

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
}: {
  isVersionBlocked: boolean;
  subscriptionId: string | null;
  candidateSubscriptionId: CandidateSubscriptionId;
}): { contentReady: boolean; variant: RewardsTabContentVariant } {
  if (isVersionBlocked) {
    return { contentReady: true, variant: 'update_required' };
  }

  if (subscriptionId) {
    return { contentReady: true, variant: 'dashboard' };
  }

  const candidateLoading =
    candidateSubscriptionId === 'pending' ||
    candidateSubscriptionId === 'retry';

  if (!candidateLoading) {
    return { contentReady: true, variant: 'onboarding' };
  }

  return { contentReady: false, variant: 'onboarding' };
}

import type { QueryClient } from '@tanstack/react-query';
import { PRODUCT_TYPES } from '@metamask/subscription-controller';
import Engine from '../../core/Engine';

/**
 * Prefix for the Plus trial eligibility query. Identity segments are appended
 * by the Benefits hook. Removing by this prefix drops every user's entry.
 */
export const MONEY_ACCOUNT_PLUS_TRIAL_ELIGIBILITY_QUERY_KEY = [
  'SubscriptionController:isUserEligibleForTrial',
  PRODUCT_TYPES.MONEY_ACCOUNT_PLUS,
] as const;

/**
 * Drops the cached Plus trial answer after a subscription starts or is
 * cancelled. The app keeps a query fresh for 5 minutes, so without this a
 * user who cancels and reopens Plus still sees "Start free trial".
 *
 * Only this answer is cached. `isUserEligibleForTrial` reads `trialedProducts`
 * from the controller, and both start and cancel already refresh that list.
 *
 * @param queryClient - The app React Query client.
 */
export function clearMoneyAccountPlusTrialEligibilityCache(
  queryClient: QueryClient,
): void {
  queryClient.removeQueries({
    queryKey: MONEY_ACCOUNT_PLUS_TRIAL_ELIGIBILITY_QUERY_KEY,
  });
}

/**
 * Resets the cached Plus trial answer and refetches it for any screen still
 * observing it. Use this when the app learns the cached answer is wrong while
 * Benefits is open: the screen shows its loading state, then the real answer.
 *
 * @param queryClient - The app React Query client.
 */
export function refreshMoneyAccountPlusTrialEligibility(
  queryClient: QueryClient,
): Promise<void> {
  return queryClient.resetQueries({
    queryKey: MONEY_ACCOUNT_PLUS_TRIAL_ELIGIBILITY_QUERY_KEY,
  });
}

/**
 * Loads subscription history, then asks whether this user can start a Plus
 * trial. Both Benefits and checkout use this so they share one controller
 * sequence. The caller owns retries. This does not go through the shared
 * subscriptions query, which has no user identity and would retry again.
 *
 * @returns Whether the controller says this user can start a Plus trial.
 */
export async function fetchPlusTrialEligibility(): Promise<boolean> {
  await Engine.context.SubscriptionController.getSubscriptions();
  return Engine.context.SubscriptionController.isUserEligibleForTrial(
    PRODUCT_TYPES.MONEY_ACCOUNT_PLUS,
  );
}

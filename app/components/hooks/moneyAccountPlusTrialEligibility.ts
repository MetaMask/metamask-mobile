import type { QueryClient } from '@tanstack/react-query';
import { PRODUCT_TYPES } from '@metamask/subscription-controller';

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

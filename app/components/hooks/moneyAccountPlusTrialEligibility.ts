import type { QueryClient } from '@tanstack/react-query';
import { PRODUCT_TYPES } from '@metamask/subscription-controller';
import Logger from '../../util/Logger';
import { ensureError } from '../../util/errorUtils';
import { SUBSCRIPTIONS_QUERY_KEY } from './useSubscriptions';

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
 * Also marks the shared subscriptions query stale. Starting a subscription
 * does not refresh `trialedProducts` itself, and the next eligibility check
 * reads that list after `getSubscriptions`.
 *
 * @param queryClient - The app React Query client.
 */
export async function clearMoneyAccountPlusTrialEligibilityCache(
  queryClient: QueryClient,
): Promise<void> {
  try {
    await queryClient.invalidateQueries({ queryKey: SUBSCRIPTIONS_QUERY_KEY });
    queryClient.removeQueries({
      queryKey: MONEY_ACCOUNT_PLUS_TRIAL_ELIGIBILITY_QUERY_KEY,
    });
  } catch (error) {
    Logger.error(
      ensureError(error, 'clearMoneyAccountPlusTrialEligibilityCache'),
      {
        tags: {
          feature: 'money_account_plus',
          operation: 'clear_trial_eligibility',
        },
      },
    );
  }
}

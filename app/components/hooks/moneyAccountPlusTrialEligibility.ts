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
 * The trial answer is removed before the subscriptions query is touched, so
 * a failure there cannot leave the old answer in place. Subscriptions are
 * marked stale without refetching Home's observer. The next eligibility
 * check loads them through `fetchQuery`. Starting a subscription does not
 * refresh `trialedProducts` itself, and that check reads the list after
 * `getSubscriptions`.
 *
 * @param queryClient - The app React Query client.
 */
export async function clearMoneyAccountPlusTrialEligibilityCache(
  queryClient: QueryClient,
): Promise<void> {
  try {
    queryClient.removeQueries({
      queryKey: MONEY_ACCOUNT_PLUS_TRIAL_ELIGIBILITY_QUERY_KEY,
    });
    await queryClient.invalidateQueries({
      queryKey: SUBSCRIPTIONS_QUERY_KEY,
      refetchType: 'none',
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

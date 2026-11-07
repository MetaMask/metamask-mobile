import useSubscriptions from '../components/hooks/useSubscriptions';
import { useProSubscriptionEnabled } from './useProSubscriptionEnabled';

/**
 * Starts the Plus subscriptions fetch when Home is shown.
 *
 * The accounts menu and the profile drawer read the membership this query
 * stores. Running it from Home means the Orange row already has its label
 * when those menus open. The query stays off unless the Orange flag is on.
 * `useSubscriptions` also requires a signed-in, unlocked user.
 */
export function usePrefetchMoneyAccountPlusSubscriptions(): void {
  const { isProSubscriptionEnabled } = useProSubscriptionEnabled();
  useSubscriptions({ enabled: isProSubscriptionEnabled });
}

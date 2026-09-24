import { useSelector } from 'react-redux';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { Subscription } from '@metamask/subscription-controller';
import Engine from '../../core/Engine';
import { selectIsSignedIn } from '../../selectors/identity';
import { selectIsUnlocked } from '../../selectors/keyringController';

export const SUBSCRIPTIONS_QUERY_KEY = [
  'SubscriptionController:getSubscriptions',
] as const;

/** Matches the controller's own `DEFAULT_POLLING_INTERVAL`. */
export const SUBSCRIPTIONS_REFETCH_INTERVAL = 5 * 60 * 1000;

/**
 * Keeps SubscriptionController state fresh while the caller enables it and the
 * user is signed in and unlocked.
 *
 * The query fetches through the controller rather than SubscriptionService so
 * Redux stays the source of truth for Plus gating, and so the controller's
 * change side effects (access-token refresh, benefits refresh) still run.
 *
 * Mounted by the Money home view so Plus entitlements stay current while the
 * user is on a surface that reacts to them.
 *
 * @param options - Query options.
 * @param options.enabled - Caller gate for fetching subscriptions.
 * @returns The subscriptions query, for callers that need fetch state.
 */
const useSubscriptions = ({
  enabled,
}: {
  enabled: boolean;
}): UseQueryResult<Subscription[]> => {
  const isSignedIn = useSelector(selectIsSignedIn);
  const isUnlocked = Boolean(useSelector(selectIsUnlocked));

  // Backgrounding pauses the interval on its own: ReactQueryService wires
  // AppState into focusManager and `refetchIntervalInBackground` is false.
  // Focus and reconnect refetches stay off because they can run queryFn —
  // and so reach AuthenticationController getBearerToken — before React
  // commits enabled:false after a background auto-lock.
  return useQuery({
    queryKey: SUBSCRIPTIONS_QUERY_KEY,
    queryFn: () => Engine.context.SubscriptionController.getSubscriptions(),
    enabled: enabled && isSignedIn && isUnlocked,
    refetchInterval: SUBSCRIPTIONS_REFETCH_INTERVAL,
    staleTime: SUBSCRIPTIONS_REFETCH_INTERVAL,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
};

export default useSubscriptions;

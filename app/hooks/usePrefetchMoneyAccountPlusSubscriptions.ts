import useSubscriptions, {
  SUBSCRIPTIONS_HOME_REFETCH_INTERVAL,
  SUBSCRIPTIONS_HOME_SLOW_REFETCH_INTERVAL,
} from '../components/hooks/useSubscriptions';
import { getHardwareTier } from '../util/deviceCapability';
import type { HardwareTier, NetworkTier } from '../util/deviceCapability/types';
import { useNetworkTier } from './useNetworkTier';
import { useProSubscriptionEnabled } from './useProSubscriptionEnabled';

export interface HomeSubscriptionsQuery {
  enabled: boolean;
  refetchInterval: number | false;
}

/**
 * How Home should observe the shared subscriptions query.
 *
 * Home stays open for every user, so the product default polls every 30
 * minutes instead of the 5 minute interval used by screens opened briefly.
 * The device matrix in `app/util/deviceCapability/README.md` then narrows
 * that:
 *
 * - `NONE` skips the fetch. Unknown network is not offline.
 * - `LOW` with a known connection skips prefetch. Unknown hardware is not LOW.
 * - `SLOW_CELLULAR` on MID, HIGH, or unknown hardware still prefetches,
 * every 60 minutes.
 *
 * The accounts menu mounts the same query with the short interval, so a
 * skipped Home prefetch still loads when that menu opens.
 *
 * @param params - Flag and device tiers for this Home mount.
 * @param params.isProSubscriptionEnabled - Whether Orange is on for this user.
 * @param params.hardwareTier - Device memory tier. `null` is unknown.
 * @param params.networkTier - Network tier. `null` is unknown.
 * @returns The enabled flag and poll interval for the Home observer.
 */
export function resolveHomeSubscriptionsQuery({
  isProSubscriptionEnabled,
  hardwareTier,
  networkTier,
}: {
  isProSubscriptionEnabled: boolean;
  hardwareTier: HardwareTier | null;
  networkTier: NetworkTier | null;
}): HomeSubscriptionsQuery {
  const skipped: HomeSubscriptionsQuery = {
    enabled: false,
    refetchInterval: false,
  };

  if (!isProSubscriptionEnabled || networkTier === 'NONE') {
    return skipped;
  }

  const lowEndWithKnownConnection =
    hardwareTier === 'LOW' &&
    (networkTier === 'SLOW_CELLULAR' ||
      networkTier === 'FAST_CELLULAR' ||
      networkTier === 'WIFI');

  if (lowEndWithKnownConnection) {
    return skipped;
  }

  return {
    enabled: true,
    refetchInterval:
      networkTier === 'SLOW_CELLULAR'
        ? SUBSCRIPTIONS_HOME_SLOW_REFETCH_INTERVAL
        : SUBSCRIPTIONS_HOME_REFETCH_INTERVAL,
  };
}

/**
 * Starts the Plus subscriptions fetch when Home is shown.
 *
 * The accounts menu reads the membership this query stores. Running it from
 * Home means the Orange row already has its label when that menu opens. The
 * query stays off unless the Orange flag is on, and `useSubscriptions` also
 * requires a signed-in, unlocked user.
 */
export function usePrefetchMoneyAccountPlusSubscriptions(): void {
  const { isProSubscriptionEnabled } = useProSubscriptionEnabled();
  const hardwareTier = getHardwareTier();
  const networkTier = useNetworkTier();
  const { enabled, refetchInterval } = resolveHomeSubscriptionsQuery({
    isProSubscriptionEnabled,
    hardwareTier,
    networkTier,
  });

  useSubscriptions({ enabled, refetchInterval });
}

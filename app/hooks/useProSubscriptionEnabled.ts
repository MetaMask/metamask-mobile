import { useSelector } from 'react-redux';
import { selectProSubscriptionEnabled } from '../selectors/featureFlagController/moneyAccount';

/**
 * Returns whether the MetaMask Pro subscription flow should be shown,
 * driven by the `subscription-money-account-orange-enabled` remote flag.
 *
 * **Dev override**: set `MM_PRO_SUBSCRIPTION_FLOW_ENABLED=true` in your
 * shell before starting Metro to force the Pro flow on regardless of the
 * remote flag:
 *
 * ```bash
 * MM_PRO_SUBSCRIPTION_FLOW_ENABLED=true yarn watch:clean
 * ```
 */
export function useProSubscriptionEnabled() {
  const isProSubscriptionEnabled = useSelector(selectProSubscriptionEnabled);

  return { isProSubscriptionEnabled };
}

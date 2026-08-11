import { useABTest } from './useABTest';
import {
  PRO_SUBSCRIPTION_FLOW_AB_KEY,
  PRO_SUBSCRIPTION_FLOW_AB_TEST_EXPOSURE_OPTIONS,
  PRO_SUBSCRIPTION_FLOW_VARIANTS,
} from '../components/Views/ProSubscription/abTestConfig';

/**
 * Returns whether the MetaMask Pro subscription flow should be shown,
 * driven by the LaunchDarkly A/B test flag
 * `subSUB990AbtestProSubscriptionFlow`.
 *
 * - `control` (default/fallback): Pro flow is **not** shown.
 * - `treatment`: Pro flow **is** shown.
 *
 * The rollout percentage is controlled entirely from LaunchDarkly —
 * no code change needed to adjust from 0% to 25% to 100%.
 *
 * **Dev override**: set `MM_PRO_SUBSCRIPTION_FLOW_ENABLED=true` in your
 * shell before starting Metro to force the Pro flow on without requiring
 * a LaunchDarkly treatment assignment:
 *
 * ```bash
 * MM_PRO_SUBSCRIPTION_FLOW_ENABLED=true yarn watch:clean
 * ```
 */
export function useProSubscriptionEnabled() {
  const { variant, variantName, isActive } = useABTest(
    PRO_SUBSCRIPTION_FLOW_AB_KEY,
    PRO_SUBSCRIPTION_FLOW_VARIANTS,
    PRO_SUBSCRIPTION_FLOW_AB_TEST_EXPOSURE_OPTIONS,
  );

  const devOverride = process.env.MM_PRO_SUBSCRIPTION_FLOW_ENABLED === 'true';

  return {
    isProSubscriptionEnabled: devOverride || variant.isProSubscriptionEnabled,
    variantName,
    isActive,
  };
}

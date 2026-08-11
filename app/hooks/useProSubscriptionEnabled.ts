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
 */
export function useProSubscriptionEnabled() {
  const { variant, variantName, isActive } = useABTest(
    PRO_SUBSCRIPTION_FLOW_AB_KEY,
    PRO_SUBSCRIPTION_FLOW_VARIANTS,
    PRO_SUBSCRIPTION_FLOW_AB_TEST_EXPOSURE_OPTIONS,
  );

  return {
    isProSubscriptionEnabled: variant.isProSubscriptionEnabled,
    variantName,
    isActive,
  };
}

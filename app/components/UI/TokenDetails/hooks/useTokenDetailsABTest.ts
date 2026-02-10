import { useSelector } from 'react-redux';
import { selectTokenDetailsLayoutTestVariant } from '../../../../selectors/featureFlagController/tokenDetailsV2';
import type { TokenDetailsLayoutVariantName } from '../utils/abTesting/types';

/**
 * Return type for the useTokenDetailsABTest hook
 */
export interface UseTokenDetailsABTestResult {
  /** Whether to use new layout (true) or old layout (false) */
  useNewLayout: boolean;
  /** The variant name for analytics tracking */
  variantName: TokenDetailsLayoutVariantName;
  /** Whether the A/B test is active (LaunchDarkly returned a variant) */
  isTestActive: boolean;
}

/**
 * Hook for Token Details Layout A/B test
 *
 * Returns a simple boolean for layout selection based on the assigned variant.
 * Falls back to 'treatment' (new layout) if the test is disabled.
 *
 * @example
 * ```typescript
 * const { useNewLayout, variantName, isTestActive } = useTokenDetailsABTest();
 *
 * // Use in rendering - simple boolean check
 * {useNewLayout ? <TokenDetailsActions /> : <AssetDetailsActions />}
 * {useNewLayout && <StickyBuySellFooter />}
 *
 * // Use in analytics
 * trackEvent({
 *   ...(isTestActive && { ab_test_token_details_layout: variantName }),
 * });
 * ```
 */
export function useTokenDetailsABTest(): UseTokenDetailsABTestResult {
  const launchDarklyVariant = useSelector(selectTokenDetailsLayoutTestVariant);

  // Determine variant: use LaunchDarkly value, or fallback to 'treatment' (new layout)
  // Fallback to treatment ensures users get the new experience when test is off
  const variantName: TokenDetailsLayoutVariantName =
    (launchDarklyVariant as TokenDetailsLayoutVariantName) || 'treatment';

  // Test is active only if LaunchDarkly returned a variant
  const isTestActive = !!launchDarklyVariant;

  // Simple boolean: treatment = new layout, control = old layout
  const useNewLayout = variantName === 'treatment';

  return {
    useNewLayout,
    variantName,
    isTestActive,
  };
}

export default useTokenDetailsABTest;

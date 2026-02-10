/**
 * React hook for Token Details Layout A/B test
 *
 * Follows the same pattern as usePerpsABTest:
 * - Reads variant from LaunchDarkly via feature flag selector
 * - Maps it to variant data from TOKEN_DETAILS_LAYOUT_TEST config
 * - Falls back to 'treatment' (new layout) when the test is inactive
 */

import { useSelector } from 'react-redux';
import { selectTokenDetailsLayoutTestVariant } from '../../../../selectors/featureFlagController/tokenDetailsV2';
import { TOKEN_DETAILS_LAYOUT_TEST } from '../utils/abTesting/tests';
import type {
  TokenDetailsLayoutVariantName,
  UseTokenDetailsABTestResult,
} from '../utils/abTesting/types';

const DEFAULT_VARIANT: TokenDetailsLayoutVariantName = 'treatment';

/**
 * Hook for Token Details Layout A/B test
 *
 * Reads the assigned variant from LaunchDarkly and returns the corresponding
 * layout data from TOKEN_DETAILS_LAYOUT_TEST.
 *
 * Falls back to 'treatment' (new layout) so users get the new experience
 * when the test is off.
 *
 */
export function useTokenDetailsABTest(): UseTokenDetailsABTestResult {
  // Read variant name from LaunchDarkly feature flag
  const launchDarklyVariant = useSelector(selectTokenDetailsLayoutTestVariant);

  // Determine final variant name (LaunchDarkly or fallback to treatment)
  const variantName: TokenDetailsLayoutVariantName =
    (launchDarklyVariant as TokenDetailsLayoutVariantName) || DEFAULT_VARIANT;

  // Test is active only if LaunchDarkly returned a variant
  const isTestActive = !!launchDarklyVariant;

  // Look up variant data from the test config
  const variant = TOKEN_DETAILS_LAYOUT_TEST.variants[variantName];

  if (!variant) {
    // Variant not found — fall back to default
    console.warn(
      `[ABTest] Variant "${variantName}" not found in test "${TOKEN_DETAILS_LAYOUT_TEST.testId}". Falling back to "${DEFAULT_VARIANT}".`,
    );
    const fallback = TOKEN_DETAILS_LAYOUT_TEST.variants[DEFAULT_VARIANT];
    return {
      useNewLayout: fallback.data.useNewLayout,
      variantName: String(DEFAULT_VARIANT),
      isTestActive,
    };
  }

  return {
    useNewLayout: variant.data.useNewLayout,
    variantName: String(variantName),
    isTestActive,
  };
}

export default useTokenDetailsABTest;

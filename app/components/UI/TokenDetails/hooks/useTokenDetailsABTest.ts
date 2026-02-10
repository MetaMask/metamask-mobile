/**
 * React hook for Token Details Layout A/B test
 *
 * Reads the variant from LaunchDarkly and returns layout selection + analytics context.
 * Falls back to 'treatment' (new layout) when the test is inactive.
 */

import { useSelector } from 'react-redux';
import { selectTokenDetailsLayoutTestVariant } from '../../../../selectors/featureFlagController/tokenDetailsV2';

type TokenDetailsLayoutVariantName = 'control' | 'treatment';

const DEFAULT_VARIANT: TokenDetailsLayoutVariantName = 'treatment';

/**
 * Hook for Token Details Layout A/B test
 *

 */
export function useTokenDetailsABTest() {
  const launchDarklyVariant = useSelector(selectTokenDetailsLayoutTestVariant);

  const variantName: TokenDetailsLayoutVariantName =
    (launchDarklyVariant as TokenDetailsLayoutVariantName) || DEFAULT_VARIANT;

  return {
    useNewLayout: variantName === 'treatment',
    variantName: String(variantName),
    isTestActive: !!launchDarklyVariant,
  };
}

export default useTokenDetailsABTest;

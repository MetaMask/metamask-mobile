/**
 * Types for Token Details A/B testing
 *
 * Reuses generic ABTestConfig / ABTestVariant from Perps.
 * Only defines TokenDetails-specific variant data and variant map.
 */

import type { ABTestVariant } from '../../../Perps/utils/abTesting/types';

/**
 * Return value from the useTokenDetailsABTest hook
 */
export interface UseTokenDetailsABTestResult {
  /** Whether to use new layout (true) or old layout (false) */
  useNewLayout: boolean;
  /** The variant name for analytics tracking */
  variantName: string;
  /** Whether the A/B test is active (LaunchDarkly returned a variant) */
  isTestActive: boolean;
}

/**
 * Layout variant data — the payload each variant carries
 */
export interface TokenDetailsLayoutVariantData {
  /** Use new layout (treatment) vs old layout (control) */
  useNewLayout: boolean;
}

/**
 * Type-safe variant definitions for the layout A/B test
 */
export interface TokenDetailsLayoutTestVariants
  extends Record<string, ABTestVariant<TokenDetailsLayoutVariantData>> {
  control: ABTestVariant<TokenDetailsLayoutVariantData>;
  treatment: ABTestVariant<TokenDetailsLayoutVariantData>;
}

/**
 * Valid variant names for the layout test
 */
export type TokenDetailsLayoutVariantName =
  keyof TokenDetailsLayoutTestVariants;

/**
 * Generic A/B Testing Hook
 *
 * Provides a simple, type-safe interface for A/B testing that works with
 * LaunchDarkly feature flags via the RemoteFeatureFlagController.
 *
 * This hook uses a simple API that takes a flag key and variants object directly.
 * It reads the variant from the feature flags and maps it to the provided variants.
 *
 * @example
 * ```typescript
 * const { variant, variantName, isActive } = useABTest('buttonColor', {
 *   control: { color: 'green' },
 *   treatment: { color: 'blue' },
 * });
 *
 * // Track with single JSON property (no per-test schema changes)
 * trackEvent('Screen Viewed', {
 *   screen: 'details',
 *   ...(isActive && { ab_tests: { button_color: variantName } }),
 * });
 * ```
 */

import { useSelector } from 'react-redux';
import { selectRemoteFeatureFlags } from '../selectors/featureFlagController';

/**
 * Return type for the useABTest hook
 * @template T - The type of the variants object
 */
export interface UseABTestResult<T extends Record<string, unknown>> {
  /** The variant data for the assigned variant */
  variant: T[keyof T];
  /** The name of the assigned variant (e.g., 'control', 'treatment') */
  variantName: string;
  /** Whether the A/B test is active (flag is set and matches a valid variant) */
  isActive: boolean;
}

/**
 * Generic hook for A/B testing in React components
 *
 * Reads the assigned variant from LaunchDarkly via feature flags and returns
 * the corresponding variant data. LaunchDarkly handles user identification,
 * variant assignment, and persistence.
 *
 * @template T - The shape of the variants object (keys are variant names, values are variant data)
 * @param flagKey - The feature flag key in LaunchDarkly (camelCase, e.g., 'buttonColorTest')
 * @param variants - Object mapping variant names to their data
 * @returns Object containing variant data, variant name, and active state
 *
 * @example Basic usage
 * ```typescript
 * const { variant, variantName, isActive } = useABTest('swapsQuoteLayout', {
 *   control: { showFees: false },
 *   expanded: { showFees: true },
 * });
 *
 * // Use the variant data
 * if (variant.showFees) {
 *   // Show expanded quote with fees
 * }
 * ```
 *
 * @example Tracking A/B test in analytics
 * ```typescript
 * const { variantName, isActive } = useABTest('buttonStyle', {
 *   control: { style: 'default' },
 *   bold: { style: 'bold' },
 * });
 *
 * trackEvent(
 *   createEventBuilder(MetaMetricsEvents.BUTTON_CLICKED)
 *     .addProperties({
 *       button_id: 'submit',
 *       ...(isActive && { ab_tests: { button_style: variantName } }),
 *     })
 *     .build()
 * );
 * ```
 *
 * @example Multiple concurrent tests
 * ```typescript
 * const buttonTest = useABTest('buttonColorTest', {
 *   control: { color: 'green' },
 *   treatment: { color: 'blue' },
 * });
 *
 * const ctaTest = useABTest('ctaTextTest', {
 *   control: { text: 'Get Started' },
 *   urgent: { text: 'Start Now!' },
 * });
 *
 * trackEvent('Screen Viewed', {
 *   ab_tests: {
 *     ...(buttonTest.isActive && { button_color: buttonTest.variantName }),
 *     ...(ctaTest.isActive && { cta_text: ctaTest.variantName }),
 *   },
 * });
 * ```
 */
export function useABTest<T extends Record<string, unknown>>(
  flagKey: string,
  variants: T,
): UseABTestResult<T> {
  const flags = useSelector(selectRemoteFeatureFlags);
  const flagData = flags?.[flagKey];

  // Handle both object format { name } from controller and legacy string format
  // The RemoteFeatureFlagController stores A/B test results as { name: "variant_name" }
  // after processing array-based flags with scope thresholds
  const flagValue =
    typeof flagData === 'object' && flagData !== null && 'name' in flagData
      ? (flagData as { name: string }).name
      : (flagData as string | undefined);
  // Get the first variant name as fallback
  const variantNames = Object.keys(variants);
  const fallback = variantNames[0];

  // Determine the variant name: use flag value if it's a valid variant, otherwise fallback
  const variantName = flagValue && flagValue in variants ? flagValue : fallback;

  // Check if the test is active (flag is set AND matches a valid variant)
  const isActive = Boolean(flagValue && flagValue in variants);

  return {
    variant: variants[variantName as keyof T],
    variantName: String(variantName),
    isActive,
  };
}

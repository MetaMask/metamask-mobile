/**
 * React hook for A/B testing in Perps
 *
 * Simplified for LaunchDarkly integration. LaunchDarkly handles:
 * - User identification and tracking
 * - Variant assignment (stable per user)
 * - Persistence across sessions
 * - Remote control and rollout
 *
 * This hook just reads the variant from the feature flag and maps it to variant data.
 */

import { useSelector } from 'react-redux';
import type {
  ABTestConfig,
  ABTestVariant,
  UsePerpsABTestResult,
} from './types';

/**
 * Hook parameters
 */
interface UsePerpsABTestParams<
  V extends Record<string, ABTestVariant>,
  S = unknown,
> {
  /** The A/B test configuration */
  test: ABTestConfig<V>;
  /** Feature flag selector that returns the variant name from LaunchDarkly */
  featureFlagSelector: (state: S) => string | null;
}

/**
 * Hook for A/B testing in Perps components
 *
 * Reads the assigned variant from LaunchDarkly via feature flag and returns the corresponding data.
 * LaunchDarkly handles all assignment logic, persistence, and user tracking.
 *
 * @template V - The shape of variants object
 * @template T - The type of data in the variants
 * @param params - Hook parameters including test config and feature flag selector
 * @returns Object containing variant data, variant name, and enabled state
 *
 * @example
 * ```typescript
 * // In component
 * const { variant, variantName, isEnabled } = usePerpsABTest({
 *   test: BUTTON_COLOR_TEST,
 *   featureFlagSelector: selectPerpsButtonColorTestVariant,
 * });
 *
 * // Use variant data
 * const buttonColor = variant.long; // 'green' or 'white'
 *
 * // For local testing, tap the dev banner OR temporarily hardcode:
 * // const buttonColorVariant = 'monochrome'; // Remove before commit!
 * ```
 */
export function usePerpsABTest<
  V extends Record<string, ABTestVariant<T>>,
  T = unknown,
  S = unknown,
>(params: UsePerpsABTestParams<V, S>): UsePerpsABTestResult<T> {
  const { test, featureFlagSelector } = params;

  // Read variant name from LaunchDarkly feature flag
  const launchDarklyVariant = useSelector(featureFlagSelector) as string | null;

  // Determine final variant name (LaunchDarkly or fallback to first variant)
  const variantName =
    launchDarklyVariant || (Object.keys(test.variants)[0] as keyof V);

  // Check if variant exists in config
  const variant = test.variants[variantName as keyof V];
  const isEnabled = !!launchDarklyVariant;

  if (!variant) {
    // Variant not found - fall back to first variant
    console.warn(
      `[ABTest] Variant "${String(variantName)}" not found in test "${test.testId}". Falling back to first variant.`,
    );
    const fallbackVariantName = Object.keys(test.variants)[0] as keyof V;
    const fallbackVariant = test.variants[fallbackVariantName];
    return {
      variant: fallbackVariant.data,
      variantName: String(fallbackVariantName),
      isEnabled,
    };
  }

  return {
    variant: variant.data,
    variantName: String(variantName),
    isEnabled,
  };
}

/**
 * Type-safe hook specifically for button color test
 * Provides better type inference for button colors
 *
 * @example
 * ```typescript
 * const { variant, variantName } = usePerpsButtonColorTest();
 * // variant is typed as ButtonColorVariant
 * const longColor = variant.long; // 'green' | 'white' | 'blue'
 * ```
 */
export function usePerpsButtonColorTest(
  _featureFlagSelector: (state: unknown) => string | null,
): UsePerpsABTestResult<{
  long: 'green' | 'white' | 'blue';
  short: 'red' | 'white' | 'orange';
}> {
  // This is a placeholder - the actual import needs to be done in the consuming file
  // to avoid circular dependencies
  throw new Error(
    'usePerpsButtonColorTest: Please use usePerpsABTest directly with BUTTON_COLOR_TEST config',
  );
}

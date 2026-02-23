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
 * const { variant, variantName, isActive } = useABTest(
 *   'swapsSWAPS4135AbtestButtonColor',
 *   {
 *   control: { color: 'green' },
 *   treatment: { color: 'blue' },
 *   },
 * );
 *
 * // Track with single JSON property (no per-test schema changes)
 * trackEvent('Screen Viewed', {
 *   screen: 'details',
 *   ...(isActive && {
 *     active_ab_tests: [
 *       { key: 'swapsSWAPS4135AbtestButtonColor', value: variantName },
 *     ],
 *   }),
 * });
 * ```
 */

import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { selectRemoteFeatureFlags } from '../selectors/featureFlagController';
import { MetaMetricsEvents } from '../core/Analytics';
import { useAnalytics } from '../components/hooks/useAnalytics/useAnalytics';

/**
 * Type constraint for variants object - must include a 'control' key
 */
export type ABTestVariants = { control: unknown } & Record<string, unknown>;

/**
 * Return type for the useABTest hook
 * @template T - The type of the variants object (must include 'control')
 */
export interface UseABTestResult<T extends ABTestVariants> {
  /** The variant data for the assigned variant */
  variant: T[keyof T];
  /** The name of the assigned variant (e.g., 'control', 'treatment') */
  variantName: string;
  /** Whether the A/B test is active (flag is set and matches a valid variant) */
  isActive: boolean;
}

/**
 * Optional metadata for experiment exposure tracking.
 */
export interface ABTestExposureMetadata<T extends ABTestVariants> {
  /** Human-readable experiment name */
  experimentName?: string;
  /** Optional map from variant id to human-readable variant name */
  variationNames?: Partial<Record<Extract<keyof T, string>, string>>;
}

const trackedExposureAssignments = new Set<string>();
const MAX_TRACKED_EXPOSURE_ASSIGNMENTS = 500;

const getExposureCacheKey = (experimentId: string, variationId: string) =>
  `${experimentId}::${variationId}`;

const rememberExposureAssignment = (assignmentKey: string) => {
  if (trackedExposureAssignments.has(assignmentKey)) {
    return;
  }
  if (trackedExposureAssignments.size >= MAX_TRACKED_EXPOSURE_ASSIGNMENTS) {
    const oldestAssignment = trackedExposureAssignments.values().next().value;
    if (oldestAssignment) {
      trackedExposureAssignments.delete(oldestAssignment);
    }
  }
  trackedExposureAssignments.add(assignmentKey);
};

/**
 * Generic hook for A/B testing in React components
 *
 * Reads the assigned variant from LaunchDarkly via feature flags and returns
 * the corresponding variant data. LaunchDarkly handles user identification,
 * variant assignment, and persistence.
 *
 * **Fallback behavior:** When the flag is not set, invalid, or doesn't match any variant,
 * the hook falls back to the `control` variant. This ensures users see the default experience
 * when the A/B test is inactive.
 *
 * @template T - The shape of the variants object (must include 'control' key)
 * @param flagKey - The feature flag key in LaunchDarkly (e.g., 'swapsSWAPS4135AbtestButtonColor')
 * @param variants - Object mapping variant names to their data. Must include a `control` key for fallback.
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
 * const { variantName, isActive } = useABTest(
 *   'swapsSWAPS4135AbtestButtonStyle',
 *   {
 *   control: { style: 'default' },
 *   bold: { style: 'bold' },
 *   },
 * );
 *
 * trackEvent(
 *   createEventBuilder(MetaMetricsEvents.BUTTON_CLICKED)
 *     .addProperties({
 *       button_id: 'submit',
 *       ...(isActive && {
 *         active_ab_tests: [
 *           { key: 'swapsSWAPS4135AbtestButtonStyle', value: variantName },
 *         ],
 *       }),
 *     })
 *     .build()
 * );
 * ```
 *
 * @example Multiple concurrent tests
 * ```typescript
 * const buttonTest = useABTest('swapsSWAPS4135AbtestButtonColor', {
 *   control: { color: 'green' },
 *   treatment: { color: 'blue' },
 * });
 *
 * const ctaTest = useABTest('swapsSWAPS4135AbtestCtaText', {
 *   control: { text: 'Get Started' },
 *   urgent: { text: 'Start Now!' },
 * });
 *
 * trackEvent('Screen Viewed', {
 *   active_ab_tests: [
 *     ...(buttonTest.isActive
 *       ? [{ key: 'swapsSWAPS4135AbtestButtonColor', value: buttonTest.variantName }]
 *       : []),
 *     ...(ctaTest.isActive
 *       ? [{ key: 'swapsSWAPS4135AbtestCtaText', value: ctaTest.variantName }]
 *       : []),
 *   ],
 * });
 * ```
 */
export function useABTest<T extends ABTestVariants>(
  flagKey: string,
  variants: T,
  exposureMetadata?: ABTestExposureMetadata<T>,
): UseABTestResult<T> {
  const { trackEvent, createEventBuilder } = useAnalytics();
  const flags = useSelector(selectRemoteFeatureFlags);
  const flagData = flags?.[flagKey];

  // Handle both object format { name } from controller and legacy string format
  // The RemoteFeatureFlagController stores A/B test results as { name: "variant_name" }
  // after processing array-based flags with scope thresholds
  const flagValue =
    typeof flagData === 'object' && flagData !== null && 'name' in flagData
      ? (flagData as { name: string }).name
      : (flagData as string | undefined);

  // Determine the variant name: use flag value if it's a valid variant, otherwise fallback to 'control'
  // Use hasOwnProperty to avoid matching prototype methods (e.g. "toString", "constructor")
  // since flagValue comes from remote feature flags (external data)
  const hasVariant = (key: string) =>
    Object.prototype.hasOwnProperty.call(variants, key);

  const variantName =
    flagValue && hasVariant(flagValue) ? flagValue : 'control';

  // Check if the test is active (flag is set AND matches a valid variant)
  const isActive = Boolean(flagValue && hasVariant(flagValue));

  useEffect(() => {
    if (!isActive) {
      return;
    }

    const variationId = String(variantName);
    const assignmentKey = getExposureCacheKey(flagKey, variationId);

    // Emit one exposure per experiment+variation assignment per app session.
    if (trackedExposureAssignments.has(assignmentKey)) {
      return;
    }

    const variationName =
      exposureMetadata?.variationNames?.[
        variationId as Extract<keyof T, string>
      ];

    try {
      trackEvent(
        createEventBuilder(MetaMetricsEvents.EXPERIMENT_VIEWED)
          .addProperties({
            experiment_id: flagKey,
            variation_id: variationId,
            ...(exposureMetadata?.experimentName && {
              experiment_name: exposureMetadata.experimentName,
            }),
            ...(variationName && { variation_name: variationName }),
          })
          .build(),
      );
      rememberExposureAssignment(assignmentKey);
    } catch {
      // Do not cache failed emits so the hook can retry next evaluation.
      return;
    }
  }, [
    createEventBuilder,
    exposureMetadata?.experimentName,
    exposureMetadata?.variationNames,
    flagKey,
    isActive,
    trackEvent,
    variantName,
  ]);

  return {
    variant: variants[variantName as keyof T],
    variantName: String(variantName),
    isActive,
  };
}

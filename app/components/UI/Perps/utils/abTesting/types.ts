/**
 * Core types for A/B testing in Perps
 *
 * Simplified for LaunchDarkly integration - LaunchDarkly handles user identification,
 * variant assignment, and persistence. We only read the variant and apply it.
 */

/**
 * Button color configuration for the button color test
 */
export interface ButtonColorVariant {
  long: 'green' | 'white' | 'blue';
  short: 'red' | 'white' | 'orange';
}

/**
 * Represents a single variant in an A/B test
 * @template T - The type of data associated with this variant
 */
export interface ABTestVariant<T = unknown> {
  /** Weight for this variant (informational only - LaunchDarkly controls distribution) */
  weight: number;
  /** Variant-specific data (e.g., colors, text, layouts) */
  data: T;
}

/**
 * Configuration for a complete A/B test
 * @template V - The shape of variants object (e.g., { control: {...}, treatment: {...} })
 */
export interface ABTestConfig<V extends Record<string, ABTestVariant>> {
  /** Unique identifier for this test */
  testId: string;
  /** Feature flag key to read variant from LaunchDarkly */
  featureFlagKey: string;
  /** Map of variant names to their configurations */
  variants: V;
  /** Optional description of the test */
  description?: string;
  /** Optional minimum app version required */
  minVersion?: string;
}

/**
 * Return value from the usePerpsABTest hook
 * @template T - The type of data in the variant
 */
export interface UsePerpsABTestResult<T = unknown> {
  /** The assigned variant data */
  variant: T;
  /** Name of the assigned variant */
  variantName: string;
  /** Whether the test is enabled */
  isEnabled: boolean;
}

/**
 * Type-safe variant names for button color test
 */
export interface ButtonColorTestVariants
  extends Record<string, ABTestVariant<ButtonColorVariant>> {
  control: ABTestVariant<ButtonColorVariant>;
  monochrome: ABTestVariant<ButtonColorVariant>;
}

/**
 * Valid variant names for button color test
 */
export type ButtonColorVariantName = keyof ButtonColorTestVariants;

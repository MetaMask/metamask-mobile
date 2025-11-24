/**
 * A/B Test configurations for Perps
 *
 * This module contains all active A/B test configurations.
 * Each test should have a corresponding LaunchDarkly feature flag.
 *
 * IMPORTANT: LaunchDarkly handles user identification, variant assignment,
 * and distribution. Weights here are informational only and for mapping
 * variant names to their data (colors, text, etc.).
 */

import type { ABTestConfig, ButtonColorTestVariants } from './types';

/**
 * TAT-1937: Long/Short Button Color Test
 *
 * Tests the impact of button colors on trading behavior:
 * - Control: Traditional green (long) / red (short) - familiar and intuitive
 * - Monochrome: White buttons for both - reduces risk anxiety, promotes balanced participation
 *
 * Metrics tracked:
 * - Trade initiation rate (asset screen → trade screen)
 * - Trade execution rate (trade screen → confirmed trade)
 * - Misclick rate (cancelled trades within 10s)
 * - Time to execution
 *
 * Feature flag: perpsAbtestButtonColor
 * Duration: 2-4 weeks
 * Distribution: 50/50 (controlled by LaunchDarkly)
 *
 * LaunchDarkly returns: 'control' | 'monochrome'
 */
export const BUTTON_COLOR_TEST: ABTestConfig<ButtonColorTestVariants> = {
  testId: 'button_color_test',
  featureFlagKey: 'perpsAbtestButtonColor',
  description:
    'Tests impact of button colors (green/red vs white/white) on trading behavior',
  minVersion: '7.60.0',
  variants: {
    control: {
      weight: 50,
      data: {
        long: 'green',
        short: 'red',
      },
    },
    monochrome: {
      weight: 50,
      data: {
        long: 'white',
        short: 'white',
      },
    },
  },
};

/**
 * Export all active tests
 * Makes it easy to iterate over all tests for debugging or analytics
 */
export const ALL_PERPS_AB_TESTS = {
  BUTTON_COLOR_TEST,
} as const;

/**
 * Type helper to get test IDs
 */
export type PerpsABTestId = keyof typeof ALL_PERPS_AB_TESTS;

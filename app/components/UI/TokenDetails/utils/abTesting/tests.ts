/**
 * A/B Test configurations for Token Details
 *
 * This module contains all active A/B test configurations.
 * Each test should have a corresponding LaunchDarkly feature flag.
 *
 * IMPORTANT: LaunchDarkly handles user identification, variant assignment,
 * and distribution. Weights here are informational only and for mapping
 * variant names to their data.
 */

import type { ABTestConfig } from '../../../Perps/utils/abTesting/types';
import type { TokenDetailsLayoutTestVariants } from './types';

/**
 * Token Details Layout A/B Test
 *
 * Tests the new token details layout with sticky Buy/Sell footer
 * vs the old layout with Swap button.
 *
 * Hypothesis: The new layout with sticky Buy/Sell buttons and simplified
 * action row will drive higher engagement than the old layout with
 * the Swap button prominently displayed.
 *
 * Feature flag: tokenDetailsLayoutAbTest
 * Distribution: 50/50 (controlled by LaunchDarkly)
 *
 * LaunchDarkly returns: 'control' | 'treatment'
 */
export const TOKEN_DETAILS_LAYOUT_TEST: ABTestConfig<TokenDetailsLayoutTestVariants> =
  {
    testId: 'token_details_layout',
    featureFlagKey: 'tokenDetailsLayoutAbTest',
    description:
      'Tests new token details layout with sticky Buy/Sell footer vs old layout with Swap button',
    variants: {
      control: {
        weight: 50,
        data: {
          useNewLayout: false,
        },
      },
      treatment: {
        weight: 50,
        data: {
          useNewLayout: true,
        },
      },
    },
  };

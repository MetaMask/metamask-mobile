/**
 * Token Details Layout A/B Test Configuration
 *
 * Tests the new token details layout with sticky Buy/Sell footer
 * vs the old layout with Swap button.
 *
 * Hypothesis: The new layout with sticky Buy/Sell buttons and simplified
 * action row will drive higher engagement than the old layout with
 * the Swap button prominently displayed.
 *
 * Metrics:
 * - Button click rates (Buy, Sell, Swap, Send, Receive)
 * - Swap/trade completion rates
 * - Time spent on token details page
 * - Navigation patterns (which buttons are used most)
 *
 * Feature flag: tokenDetailsLayoutAbTest
 * Distribution: 50/50 (controlled by LaunchDarkly)
 *
 * Variants:
 * - control: Old layout (Buy, Swap, Send, Receive) + no sticky footer
 * - treatment: New layout (Cash Buy, Send, Receive, More) + sticky Buy/Sell
 */
export const TOKEN_DETAILS_LAYOUT_TEST = {
  testId: 'token_details_layout',
  featureFlagKey: 'tokenDetailsLayoutAbTest',
  description:
    'Tests new token details layout with sticky Buy/Sell footer vs old layout with Swap button',
} as const;

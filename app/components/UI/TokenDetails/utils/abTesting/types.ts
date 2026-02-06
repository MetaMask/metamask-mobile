/**
 * Types for Token Details A/B testing
 */

/**
 * Valid variant names for the layout test
 */
export type TokenDetailsLayoutVariantName = 'control' | 'treatment';

/**
 * Layout configuration - simplified since it's binary (old vs new)
 *
 * Control (old layout):
 *   - Buttons: Buy, Swap, Send, Receive
 *   - No sticky footer
 *
 * Treatment (new layout):
 *   - Buttons: Cash Buy, Send, Receive, More
 *   - Sticky Buy/Sell footer
 */
export interface TokenDetailsLayoutConfig {
  /** Use new layout (treatment) vs old layout (control) */
  useNewLayout: boolean;
}

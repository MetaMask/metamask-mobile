/* eslint-disable @metamask/design-tokens/color-no-hex */
/**
 * Gradient tokens for Market Insights entry UI chrome, shared by
 * `MarketInsightsEntryCard` (title, sparkle, arrow) and
 * `AnimatedGradientBorder` (SVG sweep stops).
 *
 * NOTE: These are intentional AI-branding gradient colors not yet available
 * as official design tokens. Disable is scoped to this file only.
 * Follow up with the design system team (#metamask-design-system) to get
 * official tokens added.
 */

/** Trailing stop (mauve). */
export const CHROME_GRADIENT_TAIL = '#D86FCF';

/** Leading stop (coral). */
export const CHROME_GRADIENT_HEAD = '#ED666E';

/**
 * Normalized start/end for `react-native-linear-gradient` (left → right),
 * paired with {@link CHROME_GRADIENT_HEAD} and {@link CHROME_GRADIENT_TAIL}.
 */
export const CHROME_GRADIENT_LINEAR_START = { x: 0, y: 0 } as const;
export const CHROME_GRADIENT_LINEAR_END = { x: 1, y: 0 } as const;

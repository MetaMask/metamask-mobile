/* eslint-disable @metamask/design-tokens/color-no-hex */
/**
 * Leverage risk level color constants
 * These colors are used consistently across leverage-related UI components
 * to indicate risk levels from safe (green) to dangerous (red).
 *
 * NOTE: These are temporary hardcoded values until official design tokens
 * are available from the design system team.
 */

/**
 * Solid colors for text and icons
 */
export const LEVERAGE_COLORS = {
  // Safe leverage (green) - typically leverage < 33% of max
  SAFE: '#4CAF50',

  // Light green - transition color in gradient
  SAFE_LIGHT: '#8BC34A',

  // Caution leverage (yellow) - typically leverage 33-50% of max
  CAUTION: '#CDDC39',

  // Medium/Warning leverage (orange) - typically leverage 50-75% of max
  MEDIUM: '#FF6B35',

  // High/Danger leverage (red) - typically leverage > 75% of max
  // This should match colors.error.default from theme
  HIGH: 'colors.error.default', // Will be replaced with actual color from theme
} as const;

/**
 * Background colors with opacity for containers
 */
export const LEVERAGE_BACKGROUND_COLORS = {
  // Safe leverage background (green with 10% opacity)
  SAFE: 'rgba(76, 175, 80, 0.1)',

  // Caution leverage background (yellow with 10% opacity)
  CAUTION: 'rgba(205, 220, 57, 0.1)',

  // Medium leverage background (orange with 10% opacity)
  MEDIUM: 'rgba(255, 107, 53, 0.1)',

  // High leverage background (red with 10% opacity)
  HIGH: 'rgba(215, 44, 44, 0.1)',
} as const;

/**
 * Gradient colors array for leverage slider
 * Ordered from safe (green) to dangerous (red)
 */
export const LEVERAGE_GRADIENT_COLORS = [
  LEVERAGE_COLORS.SAFE, // #4CAF50
  LEVERAGE_COLORS.SAFE_LIGHT, // #8BC34A
  LEVERAGE_COLORS.CAUTION, // #CDDC39
  // Note: colors.warning.default will be injected dynamically from theme
  'colors.warning.default', // Theme warning color
  LEVERAGE_COLORS.MEDIUM, // #FF6B35
  'colors.error.default', // Theme error color
] as const;

/**
 * Risk level thresholds as percentages (0-1)
 * These determine which color/style to apply based on leverage percentage
 */
export const LEVERAGE_RISK_THRESHOLDS = {
  // Below this threshold = SAFE (green)
  SAFE_MAX: 0.33,

  // Below this threshold = CAUTION (yellow)
  CAUTION_MAX: 0.5,

  // Below this threshold = MEDIUM (orange)
  MEDIUM_MAX: 0.75,

  // Above MEDIUM_MAX = HIGH (red)
} as const;

/**
 * Helper function to get risk level based on percentage
 * @param percentage - Value between 0 and 1 representing leverage percentage
 * @returns Risk level string: 'safe' | 'caution' | 'medium' | 'high'
 */
export const getLeverageRiskLevel = (
  percentage: number,
): 'safe' | 'caution' | 'medium' | 'high' => {
  if (percentage < LEVERAGE_RISK_THRESHOLDS.SAFE_MAX) {
    return 'safe';
  } else if (percentage < LEVERAGE_RISK_THRESHOLDS.CAUTION_MAX) {
    return 'caution';
  } else if (percentage < LEVERAGE_RISK_THRESHOLDS.MEDIUM_MAX) {
    return 'medium';
  }
  return 'high';
};

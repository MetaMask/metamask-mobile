/**
 * Button color configurations for A/B testing
 *
 * This module provides mappings between color names (from A/B test variants)
 * and ButtonSemantic severity values used in the UI.
 */

import { ButtonSemanticSeverity } from '../../../../component-library/components-temp/Buttons/ButtonSemantic/ButtonSemantic.types';
import type { ButtonColorVariant } from '../utils/abTesting/types';

/**
 * Maps color names to ButtonSemantic severity values
 */
const COLOR_TO_SEVERITY_MAP = {
  green: ButtonSemanticSeverity.Success,
  red: ButtonSemanticSeverity.Danger,
  // Note: ButtonSemantic doesn't have a native "white" or "neutral" severity.
  // For the monochrome variant, we use Success for both directions.
  // This creates a neutral appearance by removing the semantic distinction.
  // Alternative approaches could include:
  // 1. Using a different button component (ButtonPrimary/ButtonSecondary)
  // 2. Adding a new Neutral severity to ButtonSemanticSeverity
  // 3. Applying custom styling overrides
  white: ButtonSemanticSeverity.Success,
  blue: ButtonSemanticSeverity.Success,
  orange: ButtonSemanticSeverity.Danger,
} as const;

/**
 * Converts a button color variant to ButtonSemantic severity values
 *
 * @param colors - Button color configuration from A/B test variant
 * @returns Object with severity values for long and short buttons
 *
 * @example
 * ```typescript
 * const colors = { long: 'green', short: 'red' };
 * const severities = getButtonSeverities(colors);
 * // Returns: { long: ButtonSemanticSeverity.Success, short: ButtonSemanticSeverity.Danger }
 * ```
 */
export function getButtonSeverities(colors: ButtonColorVariant): {
  long: ButtonSemanticSeverity;
  short: ButtonSemanticSeverity;
} {
  return {
    long: COLOR_TO_SEVERITY_MAP[colors.long],
    short: COLOR_TO_SEVERITY_MAP[colors.short],
  };
}

/**
 * Default button colors (control variant)
 * Used as fallback when A/B test is disabled
 */
export const DEFAULT_BUTTON_COLORS: ButtonColorVariant = {
  long: 'green',
  short: 'red',
};

/**
 * Gets the button severity for a specific direction
 *
 * @param direction - Trading direction ('long' or 'short')
 * @param colors - Button color configuration
 * @returns ButtonSemantic severity value
 *
 * @example
 * ```typescript
 * const severity = getButtonSeverityForDirection('long', { long: 'green', short: 'red' });
 * // Returns: ButtonSemanticSeverity.Success
 * ```
 */
export function getButtonSeverityForDirection(
  direction: 'long' | 'short',
  colors: ButtonColorVariant,
): ButtonSemanticSeverity {
  const severities = getButtonSeverities(colors);
  return severities[direction];
}

/**
 * Type guard to check if a color is valid
 */
export function isValidButtonColor(
  color: string,
): color is keyof typeof COLOR_TO_SEVERITY_MAP {
  return color in COLOR_TO_SEVERITY_MAP;
}

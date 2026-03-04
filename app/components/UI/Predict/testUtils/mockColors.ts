/* eslint-disable @metamask/design-tokens/color-no-hex */
/**
 * Centralized static color fixtures for Predict tests.
 * Keep hardcoded test-only colors in this file to avoid repeated
 * `color-no-hex` suppressions across test suites.
 */
export const TEST_HEX_COLORS = {
  TEAM_SEA: '#002244',
  TEAM_DEN: '#FB4F14',
  CHART_SUCCESS: '#28C76F',
  CHART_PRIMARY: '#4459FF',
  CHART_ERROR: '#CA3542',
  CHART_WARNING: '#F0B034',
  CHART_CORAL: '#FF6B6B',
  PURE_GREEN: '#00FF00',
  PURE_RED: '#FF0000',
  PURE_BLUE: '#0000FF',
  PURE_BLACK: '#000',
  EXAMPLE: '#123456',
} as const;

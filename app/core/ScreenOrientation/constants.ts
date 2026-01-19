/**
 * Screen identifiers that are allowed to display in landscape orientation.
 * Add screen identifiers here to enable landscape support for specific screens.
 */
export const LANDSCAPE_ALLOWED_SCREENS = {
  PERPS_CHART_FULLSCREEN: 'PerpsChartFullscreenModal',
} as const;

export type LandscapeAllowedScreen =
  (typeof LANDSCAPE_ALLOWED_SCREENS)[keyof typeof LANDSCAPE_ALLOWED_SCREENS];

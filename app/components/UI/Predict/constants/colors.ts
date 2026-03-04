/* eslint-disable @metamask/design-tokens/color-no-hex */
/**
 * Predict-specific color registry for legitimate non-token values
 * (for example, team brand colors coming from sports data).
 */

export const PREDICT_TEAM_COLOR_OVERRIDES = {
  ne: '#1D4E9B',
  sea: '#5BA423',
} as const;

type TeamColorOverrideKey = keyof typeof PREDICT_TEAM_COLOR_OVERRIDES;

interface PredictChartThemeColors {
  primary: { default: string };
  error: { default: string };
  success: { default: string };
}

export const getPredictTeamColorOverride = (
  abbreviation?: string,
): string | undefined => {
  if (!abbreviation) {
    return undefined;
  }

  return PREDICT_TEAM_COLOR_OVERRIDES[
    abbreviation.toLowerCase() as TeamColorOverrideKey
  ];
};

export const getPredictChartPalette = (
  colors: PredictChartThemeColors,
): string[] => [
  colors.primary.default,
  colors.error.default,
  colors.success.default,
];

export const getPredictChartSeriesColor = (
  index: number,
  outcomesCount: number,
  colors: PredictChartThemeColors,
): string => {
  if (outcomesCount === 1) {
    return colors.success.default;
  }

  const palette = getPredictChartPalette(colors);
  return palette[index] ?? colors.success.default;
};

export const getPredictHelmetFacemaskColor = (isDarkMode: boolean): string =>
  isDarkMode ? 'white' : 'black';

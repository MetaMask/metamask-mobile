export const PERPS_CHART_ANALYTICS_PROPERTY = {
  CHART_LIBRARY: 'chart_library',
  ASSET_TYPE: 'asset_type',
} as const;

export const PERPS_CHART_ANALYTICS_VALUE = {
  CHART_LIBRARY: {
    LIGHTWEIGHT: 'lightweight',
    ADVANCED: 'advanced',
  },
  ASSET_TYPE: {
    PERP: 'perp',
  },
} as const;

export const getPerpsChartLibrary = (isAdvancedChartEnabled: boolean) =>
  isAdvancedChartEnabled
    ? PERPS_CHART_ANALYTICS_VALUE.CHART_LIBRARY.ADVANCED
    : PERPS_CHART_ANALYTICS_VALUE.CHART_LIBRARY.LIGHTWEIGHT;

export const getPerpsChartAnalyticsProperties = (
  isAdvancedChartEnabled: boolean,
) => ({
  [PERPS_CHART_ANALYTICS_PROPERTY.CHART_LIBRARY]: getPerpsChartLibrary(
    isAdvancedChartEnabled,
  ),
  [PERPS_CHART_ANALYTICS_PROPERTY.ASSET_TYPE]:
    PERPS_CHART_ANALYTICS_VALUE.ASSET_TYPE.PERP,
});

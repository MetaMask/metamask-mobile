import {
  PERPS_EVENT_PROPERTY,
  PERPS_EVENT_VALUE,
} from '@metamask/perps-controller/constants';

export const PERPS_CHART_EVENT_PROPERTY = {
  CHART_LIBRARY: PERPS_EVENT_PROPERTY.CHART_LIBRARY,
  ASSET_TYPE: PERPS_EVENT_PROPERTY.ASSET_TYPE,
} as const;

export const PERPS_CHART_EVENT_VALUE = {
  CHART_LIBRARY: {
    LIGHTWEIGHT: PERPS_EVENT_VALUE.CHART_LIBRARY.LIGHTWEIGHT,
    ADVANCED: PERPS_EVENT_VALUE.CHART_LIBRARY.ADVANCED,
  },
  ASSET_TYPE: {
    PERP: PERPS_EVENT_VALUE.ASSET_TYPE.PERP,
  },
} as const;

export const getPerpsChartLibrary = (isAdvancedChartEnabled: boolean) =>
  isAdvancedChartEnabled
    ? PERPS_CHART_EVENT_VALUE.CHART_LIBRARY.ADVANCED
    : PERPS_CHART_EVENT_VALUE.CHART_LIBRARY.LIGHTWEIGHT;

export const getPerpsChartAnalyticsPropertiesForLibrary = (
  chartLibrary: string,
) => ({
  [PERPS_CHART_EVENT_PROPERTY.CHART_LIBRARY]: chartLibrary,
  [PERPS_CHART_EVENT_PROPERTY.ASSET_TYPE]:
    PERPS_CHART_EVENT_VALUE.ASSET_TYPE.PERP,
});

export const getPerpsChartAnalyticsProperties = (
  isAdvancedChartEnabled: boolean,
) =>
  getPerpsChartAnalyticsPropertiesForLibrary(
    getPerpsChartLibrary(isAdvancedChartEnabled),
  );

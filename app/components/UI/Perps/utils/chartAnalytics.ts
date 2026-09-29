import {
  PERPS_EVENT_PROPERTY,
  PERPS_EVENT_VALUE,
} from '@metamask/perps-controller/constants';

export const getPerpsChartLibrary = (isAdvancedChartEnabled: boolean) =>
  isAdvancedChartEnabled
    ? PERPS_EVENT_VALUE.CHART_LIBRARY.ADVANCED
    : PERPS_EVENT_VALUE.CHART_LIBRARY.LIGHTWEIGHT;

export const getPerpsChartAnalyticsProperties = (chartLibrary: string) => ({
  [PERPS_EVENT_PROPERTY.CHART_LIBRARY]: chartLibrary,
  [PERPS_EVENT_PROPERTY.ASSET_TYPE]: PERPS_EVENT_VALUE.ASSET_TYPE.PERP,
});

export type PerpsChartAnalyticsProperties = ReturnType<
  typeof getPerpsChartAnalyticsProperties
>;

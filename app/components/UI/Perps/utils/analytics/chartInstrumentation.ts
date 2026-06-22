import {
  PERPS_EVENT_PROPERTY,
  PERPS_EVENT_VALUE,
} from '@metamask/perps-controller';

export const getPerpsChartLibrary = (isAdvancedChartEnabled: boolean) =>
  isAdvancedChartEnabled
    ? PERPS_EVENT_VALUE.CHART_LIBRARY.ADVANCED
    : PERPS_EVENT_VALUE.CHART_LIBRARY.LIGHTWEIGHT;

export const getPerpsChartAnalyticsProperties = (
  isAdvancedChartEnabled: boolean,
) => ({
  [PERPS_EVENT_PROPERTY.CHART_LIBRARY]: getPerpsChartLibrary(
    isAdvancedChartEnabled,
  ),
  [PERPS_EVENT_PROPERTY.ASSET_TYPE]: PERPS_EVENT_VALUE.ASSET_TYPE.PERP,
});

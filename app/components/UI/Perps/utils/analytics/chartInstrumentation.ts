import {
  PERPS_EVENT_PROPERTY,
  PERPS_EVENT_VALUE,
} from '@metamask/perps-controller';

const perpsEventProperty = PERPS_EVENT_PROPERTY as typeof PERPS_EVENT_PROPERTY &
  Record<string, string>;
const perpsEventValue = PERPS_EVENT_VALUE as typeof PERPS_EVENT_VALUE &
  Record<string, Record<string, string>>;

export const PERPS_CHART_EVENT_PROPERTY = {
  CHART_LIBRARY: perpsEventProperty.CHART_LIBRARY ?? 'chart_library',
  ASSET_TYPE: perpsEventProperty.ASSET_TYPE ?? 'asset_type',
} as const;

export const PERPS_CHART_EVENT_VALUE = {
  CHART_LIBRARY: {
    LIGHTWEIGHT: perpsEventValue.CHART_LIBRARY?.LIGHTWEIGHT ?? 'lightweight',
    ADVANCED: perpsEventValue.CHART_LIBRARY?.ADVANCED ?? 'advanced',
  },
  ASSET_TYPE: {
    PERP: perpsEventValue.ASSET_TYPE?.PERP ?? 'perp',
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

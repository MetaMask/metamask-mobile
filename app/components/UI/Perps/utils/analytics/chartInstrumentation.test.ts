jest.mock('@metamask/perps-controller', () => ({
  PERPS_EVENT_PROPERTY: {
    CHART_LIBRARY: 'chart_library',
    ASSET_TYPE: 'asset_type',
  },
  PERPS_EVENT_VALUE: {
    CHART_LIBRARY: {
      LIGHTWEIGHT: 'lightweight',
      ADVANCED: 'advanced',
    },
    ASSET_TYPE: {
      PERP: 'perp',
    },
  },
}));

import {
  PERPS_CHART_EVENT_PROPERTY,
  PERPS_CHART_EVENT_VALUE,
  getPerpsChartAnalyticsProperties,
  getPerpsChartAnalyticsPropertiesForLibrary,
  getPerpsChartLibrary,
} from './chartInstrumentation';

describe('chartInstrumentation', () => {
  it('returns the advanced chart library value when advanced chart is enabled', () => {
    expect(getPerpsChartLibrary(true)).toBe(
      PERPS_CHART_EVENT_VALUE.CHART_LIBRARY.ADVANCED,
    );
  });

  it('returns the lightweight chart library value when advanced chart is disabled', () => {
    expect(getPerpsChartLibrary(false)).toBe(
      PERPS_CHART_EVENT_VALUE.CHART_LIBRARY.LIGHTWEIGHT,
    );
  });

  it('returns reusable chart analytics properties from core constants', () => {
    expect(getPerpsChartAnalyticsProperties(true)).toStrictEqual({
      [PERPS_CHART_EVENT_PROPERTY.CHART_LIBRARY]:
        PERPS_CHART_EVENT_VALUE.CHART_LIBRARY.ADVANCED,
      [PERPS_CHART_EVENT_PROPERTY.ASSET_TYPE]:
        PERPS_CHART_EVENT_VALUE.ASSET_TYPE.PERP,
    });
  });

  it('returns reusable chart analytics properties for the actual rendered library', () => {
    expect(
      getPerpsChartAnalyticsPropertiesForLibrary(
        PERPS_CHART_EVENT_VALUE.CHART_LIBRARY.LIGHTWEIGHT,
      ),
    ).toStrictEqual({
      [PERPS_CHART_EVENT_PROPERTY.CHART_LIBRARY]:
        PERPS_CHART_EVENT_VALUE.CHART_LIBRARY.LIGHTWEIGHT,
      [PERPS_CHART_EVENT_PROPERTY.ASSET_TYPE]:
        PERPS_CHART_EVENT_VALUE.ASSET_TYPE.PERP,
    });
  });
});

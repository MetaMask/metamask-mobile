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
  getPerpsChartAnalyticsProperties,
  getPerpsChartLibrary,
} from './chartInstrumentation';

describe('chartInstrumentation', () => {
  it('returns the advanced chart library value when advanced chart is enabled', () => {
    expect(getPerpsChartLibrary(true)).toBe('advanced');
  });

  it('returns the lightweight chart library value when advanced chart is disabled', () => {
    expect(getPerpsChartLibrary(false)).toBe('lightweight');
  });

  it('returns reusable chart analytics properties', () => {
    expect(getPerpsChartAnalyticsProperties(true)).toStrictEqual({
      chart_library: 'advanced',
      asset_type: 'perp',
    });
  });
});

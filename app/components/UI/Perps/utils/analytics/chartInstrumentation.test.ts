import {
  getPerpsChartAnalyticsProperties,
  getPerpsChartLibrary,
  PERPS_CHART_ANALYTICS_PROPERTY,
  PERPS_CHART_ANALYTICS_VALUE,
} from './chartInstrumentation';

describe('chartInstrumentation', () => {
  it('exports chart analytics property keys', () => {
    expect(PERPS_CHART_ANALYTICS_PROPERTY.CHART_LIBRARY).toBe('chart_library');
    expect(PERPS_CHART_ANALYTICS_PROPERTY.ASSET_TYPE).toBe('asset_type');
  });

  it('exports chart analytics values', () => {
    expect(PERPS_CHART_ANALYTICS_VALUE.CHART_LIBRARY.ADVANCED).toBe('advanced');
    expect(PERPS_CHART_ANALYTICS_VALUE.CHART_LIBRARY.LIGHTWEIGHT).toBe(
      'lightweight',
    );
    expect(PERPS_CHART_ANALYTICS_VALUE.ASSET_TYPE.PERP).toBe('perp');
  });

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

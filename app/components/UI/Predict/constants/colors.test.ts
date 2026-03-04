import {
  getPredictChartPalette,
  getPredictChartSeriesColor,
  getPredictHelmetFacemaskColor,
  getPredictTeamColorOverride,
  PREDICT_TEAM_COLOR_OVERRIDES,
} from './colors';

describe('Predict colors', () => {
  describe('getPredictTeamColorOverride', () => {
    it('returns known override color (case-insensitive)', () => {
      expect(getPredictTeamColorOverride('SEA')).toBe(
        PREDICT_TEAM_COLOR_OVERRIDES.sea,
      );
      expect(getPredictTeamColorOverride('ne')).toBe(
        PREDICT_TEAM_COLOR_OVERRIDES.ne,
      );
    });

    it('returns undefined for unknown or empty abbreviation', () => {
      expect(getPredictTeamColorOverride('DEN')).toBeUndefined();
      expect(getPredictTeamColorOverride('')).toBeUndefined();
      expect(getPredictTeamColorOverride(undefined)).toBeUndefined();
    });
  });

  describe('chart palette helpers', () => {
    const mockColors = {
      primary: { default: 'primary' },
      error: { default: 'error' },
      success: { default: 'success' },
    };

    it('builds chart palette in expected order', () => {
      expect(getPredictChartPalette(mockColors)).toStrictEqual([
        'primary',
        'error',
        'success',
      ]);
    });

    it('uses success color for single-outcome charts', () => {
      expect(getPredictChartSeriesColor(0, 1, mockColors)).toBe('success');
      expect(getPredictChartSeriesColor(2, 1, mockColors)).toBe('success');
    });

    it('uses palette index for multi-outcome charts with success fallback', () => {
      expect(getPredictChartSeriesColor(0, 2, mockColors)).toBe('primary');
      expect(getPredictChartSeriesColor(1, 2, mockColors)).toBe('error');
      expect(getPredictChartSeriesColor(2, 2, mockColors)).toBe('success');
      expect(getPredictChartSeriesColor(9, 2, mockColors)).toBe('success');
    });
  });

  describe('getPredictHelmetFacemaskColor', () => {
    it('returns white for dark mode', () => {
      expect(getPredictHelmetFacemaskColor(true)).toBe('white');
    });

    it('returns black for light mode', () => {
      expect(getPredictHelmetFacemaskColor(false)).toBe('black');
    });
  });
});

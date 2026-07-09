import {
  createIndicatorStudy,
  getMAColor,
  isSubPaneIndicator,
  MA_LENGTHS,
  resolveStudyPreset,
} from '../studies';
import type { IndicatorColors, TVActiveChart } from '../../../core/types';

const colors: IndicatorColors = {
  MA: { MA5: 'rgb(1,1,1)', MA200: 'rgb(2,2,2)' },
  MACD: {
    macd: 'rgb(3,3,3)',
    signal: 'rgb(4,4,4)',
    histogramPositive: 'rgb(5,5,5)',
    histogramNegative: 'rgb(6,6,6)',
  },
  RSI: { plot: 'rgb(7,7,7)' },
  BOL: { upper: 'rgb(8,8,8)', basis: 'rgb(9,9,9)', lower: 'rgb(10,10,10)' },
};

describe('resolveStudyPreset', () => {
  it('returns MACD preset with all four colours', () => {
    const preset = resolveStudyPreset('MACD', colors);
    expect(preset.studyName).toBe('MACD');
    expect(preset.inputs).toEqual({ in_0: 12, in_1: 26, in_2: 9 });
    expect(preset.overrides).toMatchObject({
      'MACD.color': 'rgb(3,3,3)',
      'Signal.color': 'rgb(4,4,4)',
      'Histogram.color.0': 'rgb(5,5,5)',
      'Histogram.color.1': 'rgb(6,6,6)',
    });
  });

  it('returns RSI preset with default 14 period', () => {
    const preset = resolveStudyPreset('RSI', colors);
    expect(preset.studyName).toBe('Relative Strength Index');
    expect(preset.inputs).toEqual({ in_0: 14 });
    expect(preset.overrides['Plot.color']).toBe('rgb(7,7,7)');
  });

  it('returns BOL preset', () => {
    const preset = resolveStudyPreset('BOL', colors);
    expect(preset.studyName).toBe('Bollinger Bands');
    expect(preset.inputs).toEqual({ in_0: 20, in_1: 2 });
    expect(preset.overrides['Upper.color']).toBe('rgb(8,8,8)');
  });

  it('returns MA200 preset without colour override', () => {
    const preset = resolveStudyPreset('MA200', colors);
    expect(preset.studyName).toBe('Moving Average');
    expect(preset.inputs).toEqual({ length: 200 });
    expect(preset.overrides).not.toHaveProperty('Plot.color');
  });

  it('returns MA variants with the right length and colour', () => {
    const preset = resolveStudyPreset('MA5', colors);
    expect(preset.inputs).toEqual({ length: MA_LENGTHS.MA5 });
    expect(preset.overrides['Plot.color']).toBe('rgb(1,1,1)');
  });

  it('falls back to default MA colour when not in config', () => {
    expect(getMAColor('MA10', colors)).toBeDefined();
    expect(getMAColor('MA5', undefined)).toBeDefined();
  });

  it('returns a generic preset for unknown names', () => {
    const preset = resolveStudyPreset('UNKNOWN', colors, { foo: 1 });
    expect(preset.studyName).toBe('UNKNOWN');
    expect(preset.inputs).toEqual({ foo: 1 });
  });
});

describe('isSubPaneIndicator', () => {
  it('returns true for MACD and RSI only', () => {
    expect(isSubPaneIndicator('MACD')).toBe(true);
    expect(isSubPaneIndicator('RSI')).toBe(true);
    expect(isSubPaneIndicator('BOL')).toBe(false);
    expect(isSubPaneIndicator('MA200')).toBe(false);
  });
});

describe('createIndicatorStudy', () => {
  it('forwards the preset to chart.createStudy', async () => {
    const createStudy = jest.fn().mockResolvedValue('study-1');
    const chart = { createStudy } as unknown as TVActiveChart;
    const preset = resolveStudyPreset('MACD', colors);
    const id = await createIndicatorStudy(chart, preset);
    expect(id).toBe('study-1');
    expect(createStudy).toHaveBeenCalledWith(
      'MACD',
      false,
      false,
      preset.inputs,
      preset.overrides,
    );
  });
});

import {
  createIndicatorStudy,
  getMAColor,
  isSubPanePreset,
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
    });
  });

  it('sets all four MACD histogram palette slots (v30.1.0 colorer)', () => {
    const preset = resolveStudyPreset('MACD', colors);
    // 0 = above zero rising, 1 = above zero falling,
    // 2 = below zero rising, 3 = below zero falling.
    expect(preset.overrides['Histogram.color.0']).toBe('rgb(5,5,5)');
    expect(preset.overrides['Histogram.color.1']).toBe('rgb(5,5,5)');
    expect(preset.overrides['Histogram.color.2']).toBe('rgb(6,6,6)');
    expect(preset.overrides['Histogram.color.3']).toBe('rgb(6,6,6)');
  });

  it('returns RSI preset with default 14 period', () => {
    const preset = resolveStudyPreset('RSI', colors);
    expect(preset.studyName).toBe('Relative Strength Index');
    // v30.1.0 RSI input id is `length`; `in_0` is silently ignored by TV.
    expect(preset.inputs).toEqual({ length: 14 });
    expect(preset.overrides['Plot.color']).toBe('rgb(7,7,7)');
  });

  it('returns BOL preset', () => {
    const preset = resolveStudyPreset('BOL', colors);
    expect(preset.studyName).toBe('Bollinger Bands');
    expect(preset.inputs).toEqual({ in_0: 20, in_1: 2 });
    expect(preset.overrides['Upper.color']).toBe('rgb(8,8,8)');
    expect(preset.overrides['Lower.color']).toBe('rgb(10,10,10)');
  });

  it('colours the BOL middle band via Median.color (v30.1.0 plot title)', () => {
    const preset = resolveStudyPreset('BOL', colors);
    expect(preset.overrides['Median.color']).toBe('rgb(9,9,9)');
    expect(Object.keys(preset.overrides)).not.toContain('Basis.color');
  });

  it('returns MA200 preset with its legend colour so line and pill match', () => {
    const preset = resolveStudyPreset('MA200', colors);
    expect(preset.studyName).toBe('Moving Average');
    expect(preset.inputs).toEqual({ length: 200 });
    expect(preset.overrides['Plot.color']).toBe('rgb(2,2,2)');
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

describe('isSubPanePreset', () => {
  it('returns true for presets with paneTarget sub', () => {
    const macd = resolveStudyPreset('MACD', colors);
    const rsi = resolveStudyPreset('RSI', colors);
    const bol = resolveStudyPreset('BOL', colors);
    const ma200 = resolveStudyPreset('MA200', colors);

    expect(isSubPanePreset(macd)).toBe(true);
    expect(isSubPanePreset(rsi)).toBe(true);
    expect(isSubPanePreset(bol)).toBe(false);
    expect(isSubPanePreset(ma200)).toBe(false);
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

  it('rejects when createStudy resolves null (v30.1.0 failure signal)', async () => {
    const createStudy = jest.fn().mockResolvedValue(null);
    const chart = { createStudy } as unknown as TVActiveChart;
    const preset = resolveStudyPreset('RSI', colors);
    await expect(createIndicatorStudy(chart, preset)).rejects.toThrow(
      'createStudy returned null',
    );
  });
});

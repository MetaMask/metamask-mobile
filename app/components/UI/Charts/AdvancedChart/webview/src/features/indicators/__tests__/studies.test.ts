import {
  createIndicatorStudy,
  getIndicatorDefinition,
  isSubPanePreset,
  resolveStudyPreset,
} from '../studies';
import type {
  IndicatorDefinitionsCfg,
  TVActiveChart,
} from '../../../core/types';

const definitions: IndicatorDefinitionsCfg = {
  MACD: {
    study: {
      name: 'MACD',
      inputs: { in_0: 12, in_1: 26, in_2: 9 },
      overrides: { 'MACD.color': 'rgb(3,3,3)' },
      pane: 'sub',
    },
  },
  RSI: {
    study: {
      name: 'Relative Strength Index',
      inputs: { length: 14 },
      overrides: { 'Plot.color': 'rgb(7,7,7)' },
      pane: 'sub',
    },
  },
  MA200: {
    study: {
      name: 'Moving Average',
      inputs: { length: 200 },
      overrides: { 'Plot.color': 'rgb(2,2,2)' },
    },
    group: 'MA',
  },
};

describe('resolveStudyPreset', () => {
  it('reads study name, inputs, overrides and pane from the definition', () => {
    const preset = resolveStudyPreset('MACD', definitions);

    expect(preset).toEqual({
      studyName: 'MACD',
      inputs: { in_0: 12, in_1: 26, in_2: 9 },
      overrides: { 'MACD.color': 'rgb(3,3,3)' },
      pane: 'sub',
    });
  });

  it('resolves moving averages like any other indicator', () => {
    const preset = resolveStudyPreset('MA200', definitions);

    expect(preset.studyName).toBe('Moving Average');
    expect(preset.inputs).toEqual({ length: 200 });
    expect(preset.overrides['Plot.color']).toBe('rgb(2,2,2)');
    expect(preset.pane).toBeUndefined();
  });

  it('shallow-merges runtime inputs over the definition inputs', () => {
    const preset = resolveStudyPreset('RSI', definitions, { length: 21 });

    expect(preset.inputs).toEqual({ length: 21 });
  });

  it('does not mutate the definition when merging inputs', () => {
    resolveStudyPreset('RSI', definitions, { length: 21 });

    expect(definitions.RSI.study.inputs).toEqual({ length: 14 });
  });

  it('falls back to a generic preset for names without a definition', () => {
    const preset = resolveStudyPreset('Stochastic', definitions, { foo: 1 });

    expect(preset).toEqual({
      studyName: 'Stochastic',
      inputs: { foo: 1 },
      overrides: {},
    });
  });

  it('falls back to a generic preset when no definitions are supplied', () => {
    const preset = resolveStudyPreset('MACD', undefined);

    expect(preset.studyName).toBe('MACD');
    expect(preset.inputs).toEqual({});
  });

  it('ignores inherited object keys', () => {
    const preset = resolveStudyPreset('constructor', definitions);

    expect(preset.studyName).toBe('constructor');
    expect(preset.overrides).toEqual({});
  });
});

describe('getIndicatorDefinition', () => {
  it('returns own definitions only', () => {
    expect(getIndicatorDefinition(definitions, 'RSI')).toBe(definitions.RSI);
    expect(getIndicatorDefinition(definitions, 'toString')).toBeUndefined();
    expect(getIndicatorDefinition(undefined, 'RSI')).toBeUndefined();
  });
});

describe('isSubPanePreset', () => {
  it('is true only for definitions with pane sub', () => {
    expect(isSubPanePreset(resolveStudyPreset('MACD', definitions))).toBe(true);
    expect(isSubPanePreset(resolveStudyPreset('RSI', definitions))).toBe(true);
    expect(isSubPanePreset(resolveStudyPreset('MA200', definitions))).toBe(
      false,
    );
    expect(isSubPanePreset(resolveStudyPreset('Unknown', definitions))).toBe(
      false,
    );
  });
});

describe('createIndicatorStudy', () => {
  it('forwards the preset to chart.createStudy', async () => {
    const createStudy = jest.fn().mockResolvedValue('study-1');
    const chart = { createStudy } as unknown as TVActiveChart;
    const preset = resolveStudyPreset('MACD', definitions);

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
    const preset = resolveStudyPreset('RSI', definitions);

    await expect(createIndicatorStudy(chart, preset)).rejects.toThrow(
      'createStudy returned null',
    );
  });
});

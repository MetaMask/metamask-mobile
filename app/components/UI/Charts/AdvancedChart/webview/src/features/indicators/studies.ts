// Study presets — the createStudy() shape for each indicator we support.
//
// Ported from chartLogic.js: handleAddIndicator's switch (~line 818),
// MA_LENGTHS / MA_COLORS (~line 920), handleSetMAVisibility createStudy
// call (~line 959). Phase 3 keeps the curated TV-study surface used by
// Token Details; consumers needing TV's full study picker can re-enable
// header_widget via the disabledFeatures prop.

import type { IndicatorColors, StudyId, TVActiveChart } from '../../core/types';

/**
 * Built-in MA visibility periods. Used by SET_MA_VISIBILITY to keep the
 * MA dropdown in sync. Order matters for the default rendering order.
 */
export const MA_LENGTHS: Readonly<Record<string, number>> = {
  MA5: 5,
  MA10: 10,
  MA20: 20,
  MA50: 50,
  MA200: 200,
};

const DEFAULT_MA_COLORS: Readonly<Record<string, string>> = {
  MA5: 'rgb(139,139,245)',
  MA10: 'rgb(255,107,157)',
  MA20: 'rgb(245,166,35)',
  MA50: 'rgb(184,230,46)',
  MA200: 'rgb(92,201,245)',
};

export function getMAColor(
  name: string,
  indicatorColors: IndicatorColors | undefined,
): string {
  const fromConfig = indicatorColors?.MA?.[name];
  if (fromConfig) return fromConfig;
  return DEFAULT_MA_COLORS[name] ?? DEFAULT_MA_COLORS.MA200;
}

export interface StudyPreset {
  studyName: string;
  inputs: Record<string, unknown>;
  overrides: Record<string, unknown>;
  /** 'sub' places the study in a dedicated pane below the main series. */
  paneTarget?: 'main' | 'sub';
}

function macdPreset(colors: IndicatorColors | undefined): StudyPreset {
  const c = colors?.MACD ?? {};
  return {
    studyName: 'MACD',
    inputs: { in_0: 12, in_1: 26, in_2: 9 },
    overrides: {
      'MACD.color': c.macd,
      'Signal.color': c.signal,
      'Histogram.color.0': c.histogramPositive,
      'Histogram.color.1': c.histogramNegative,
    },
    paneTarget: 'sub',
  };
}

function rsiPreset(colors: IndicatorColors | undefined): StudyPreset {
  const c = colors?.RSI ?? {};
  return {
    studyName: 'Relative Strength Index',
    inputs: { in_0: 14 },
    overrides: {
      'Plot.color': c.plot,
      'hlines background.visible': false,
    },
    paneTarget: 'sub',
  };
}

function bolPreset(colors: IndicatorColors | undefined): StudyPreset {
  const c = colors?.BOL ?? {};
  return {
    studyName: 'Bollinger Bands',
    inputs: { in_0: 20, in_1: 2 },
    overrides: {
      'Upper.color': c.upper,
      'Basis.color': c.basis,
      'Lower.color': c.lower,
    },
  };
}

function ma200Preset(): StudyPreset {
  return {
    studyName: 'Moving Average',
    inputs: { length: 200 },
    overrides: {},
  };
}

function maVariantPreset(
  name: string,
  colors: IndicatorColors | undefined,
): StudyPreset {
  return {
    studyName: 'Moving Average',
    inputs: { length: MA_LENGTHS[name] },
    overrides: {
      'Plot.color': getMAColor(name, colors),
    },
  };
}

function fallbackPreset(
  inputs: Record<string, unknown> | undefined,
): StudyPreset {
  return {
    studyName: '',
    inputs: inputs ?? {},
    overrides: {},
  };
}

/**
 * Resolves the createStudy preset for one of the curated indicators. Unknown
 * names fall back to a generic preset that uses the name verbatim as the
 * study name and the inputs as provided.
 */
export function resolveStudyPreset(
  name: string,
  indicatorColors: IndicatorColors | undefined,
  inputsOverride?: Record<string, unknown>,
): StudyPreset {
  switch (name) {
    case 'MACD':
      return macdPreset(indicatorColors);
    case 'RSI':
      return rsiPreset(indicatorColors);
    case 'BOL':
      return bolPreset(indicatorColors);
    case 'MA200':
      return ma200Preset();
    case 'MA5':
    case 'MA10':
    case 'MA20':
    case 'MA50':
      return maVariantPreset(name, indicatorColors);
    default: {
      const preset = fallbackPreset(inputsOverride);
      preset.studyName = name;
      return preset;
    }
  }
}

export function isSubPanePreset(preset: StudyPreset): boolean {
  return preset.paneTarget === 'sub';
}

/**
 * Creates the indicator study on the given chart, returning the studyId once
 * TradingView resolves the create promise.
 */
export function createIndicatorStudy(
  chart: TVActiveChart,
  preset: StudyPreset,
): Promise<StudyId> {
  return chart.createStudy(
    preset.studyName,
    false,
    false,
    preset.inputs,
    preset.overrides,
  );
}

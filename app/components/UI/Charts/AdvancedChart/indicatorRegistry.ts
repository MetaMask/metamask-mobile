import { AppThemeKey } from '../../../../util/theme/models';
import type {
  IndicatorDefinition,
  IndicatorDefinitions,
} from './AdvancedChart.types';

/**
 * Indicator registry — the single source of truth for every technical
 * indicator the AdvancedChart can draw. Each definition carries both the
 * TradingView `createStudy` arguments and the custom legend overlay labels,
 * so the WebView never hard-codes study names, inputs, colors or labels.
 *
 * Consumers extend or override entries via the `indicatorDefinitions` prop.
 */

/* eslint-disable @metamask/design-tokens/color-no-hex */

export const MA_INDICATOR_COLORS_DARK = {
  MA5: '#8B8BF5',
  MA10: '#FF6B9D',
  MA20: '#F5A623',
  MA50: '#B8E62E',
  MA200: '#5CC9F5',
} as const;

/** Darker / higher-contrast variants for light chart backgrounds. */
export const MA_INDICATOR_COLORS_LIGHT = {
  MA5: '#4F46E5',
  MA10: '#DB2777',
  MA20: '#D97706',
  MA50: '#16A34A',
  MA200: '#0284C7',
} as const;

export const MACD_COLORS_DARK = {
  macd: '#5C8FFF',
  signal: '#FF6D00',
  histogramPositive: '#26A69A',
  histogramNegative: '#EF5350',
} as const;

export const MACD_COLORS_LIGHT = {
  macd: '#2563EB',
  signal: '#EA580C',
  histogramPositive: '#059669',
  histogramNegative: '#DC2626',
} as const;

export const RSI_COLORS_DARK = {
  plot: '#E91E90',
} as const;

export const RSI_COLORS_LIGHT = {
  plot: '#BE185D',
} as const;

export const BOL_COLORS_DARK = {
  upper: '#E040FB',
  basis: '#E040FB',
  lower: '#E040FB',
} as const;

export const BOL_COLORS_LIGHT = {
  upper: '#7C3AED',
  basis: '#7C3AED',
  lower: '#7C3AED',
} as const;

/* eslint-enable @metamask/design-tokens/color-no-hex */

export type ChartThemeAppearance = AppThemeKey.light | AppThemeKey.dark;

export type MAIndicatorKey = keyof typeof MA_INDICATOR_COLORS_DARK;

export interface IndicatorColorSet {
  MA: Record<MAIndicatorKey, string>;
  MACD: Record<keyof typeof MACD_COLORS_DARK, string>;
  RSI: Record<keyof typeof RSI_COLORS_DARK, string>;
  BOL: Record<keyof typeof BOL_COLORS_DARK, string>;
}

const INDICATOR_COLOR_SETS: Record<ChartThemeAppearance, IndicatorColorSet> = {
  [AppThemeKey.dark]: {
    MA: { ...MA_INDICATOR_COLORS_DARK },
    MACD: { ...MACD_COLORS_DARK },
    RSI: { ...RSI_COLORS_DARK },
    BOL: { ...BOL_COLORS_DARK },
  },
  [AppThemeKey.light]: {
    MA: { ...MA_INDICATOR_COLORS_LIGHT },
    MACD: { ...MACD_COLORS_LIGHT },
    RSI: { ...RSI_COLORS_LIGHT },
    BOL: { ...BOL_COLORS_LIGHT },
  },
};

export const getIndicatorColorSet = (
  themeAppearance: ChartThemeAppearance = AppThemeKey.dark,
): IndicatorColorSet => INDICATOR_COLOR_SETS[themeAppearance];

// ----- Parameters (labels are generated from these numbers) ----------------

export const MA_LENGTHS: Record<MAIndicatorKey, number> = {
  MA5: 5,
  MA10: 10,
  MA20: 20,
  MA50: 50,
  MA200: 200,
};

export const MACD_PARAMS = { fast: 12, slow: 26, signal: 9 } as const;
export const RSI_PARAMS = { length: 14 } as const;
export const BOL_PARAMS = { length: 20, mult: 2 } as const;

/** Group key shared by every moving-average definition. */
export const MA_GROUP = 'MA';

// ----- Definition builders --------------------------------------------------
//
// Plot titles (`tvTitle`) and input ids must match the TradingView v30.1.0
// study metainfo. Plots are matched by title, never by column position
// (TV orders MACD columns as Histogram, MACD, Signal and BB columns as
// Median, Upper, Lower).

const buildMACD = (c: IndicatorColorSet['MACD']): IndicatorDefinition => ({
  study: {
    name: 'MACD',
    inputs: {
      in_0: MACD_PARAMS.fast,
      in_1: MACD_PARAMS.slow,
      in_2: MACD_PARAMS.signal,
    },
    overrides: {
      'MACD.color': c.macd,
      'Signal.color': c.signal,
      // v30.1.0 MACD histogram palette has 4 colorer slots:
      //   0 = above zero & rising,  1 = above zero & falling,
      //   2 = below zero & rising,  3 = below zero & falling.
      'Histogram.color.0': c.histogramPositive,
      'Histogram.color.1': c.histogramPositive,
      'Histogram.color.2': c.histogramNegative,
      'Histogram.color.3': c.histogramNegative,
    },
    pane: 'sub',
  },
  legend: {
    plots: [
      {
        tvTitle: 'MACD',
        label: `MACD(${MACD_PARAMS.fast},${MACD_PARAMS.slow})`,
        color: c.macd,
      },
      { tvTitle: 'Signal', label: 'Signal', color: c.signal },
      { tvTitle: 'Histogram', label: 'Hist', color: c.histogramPositive },
    ],
    negativeColorPlot: 'Histogram',
    negativeColor: c.histogramNegative,
  },
});

const buildRSI = (c: IndicatorColorSet['RSI']): IndicatorDefinition => ({
  study: {
    name: 'Relative Strength Index',
    // v30.1.0 RSI input id is `length` (positional `in_0` is ignored).
    inputs: { length: RSI_PARAMS.length },
    overrides: {
      'Plot.color': c.plot,
      'hlines background.visible': false,
    },
    pane: 'sub',
  },
  legend: {
    plots: [
      { tvTitle: 'Plot', label: `RSI(${RSI_PARAMS.length})`, color: c.plot },
    ],
  },
});

const buildBOL = (c: IndicatorColorSet['BOL']): IndicatorDefinition => ({
  study: {
    name: 'Bollinger Bands',
    inputs: { in_0: BOL_PARAMS.length, in_1: BOL_PARAMS.mult },
    overrides: {
      'Upper.color': c.upper,
      // v30.1.0 BB middle plot is titled "Median" (not "Basis").
      'Median.color': c.basis,
      'Lower.color': c.lower,
    },
  },
  legend: {
    title: `BB(${BOL_PARAMS.length},${BOL_PARAMS.mult})`,
    plots: [
      { tvTitle: 'Upper', label: 'U:', color: c.upper },
      { tvTitle: 'Median', label: 'M:', color: c.basis },
      { tvTitle: 'Lower', label: 'L:', color: c.lower },
    ],
  },
});

/**
 * Volume is created by the TOGGLE_VOLUME path (`showVolume` prop), which owns
 * its pane placement and up/down colors. Only the legend block is consumed.
 */
const VOLUME_DEFINITION: IndicatorDefinition = {
  study: { name: 'Volume' },
  legend: {
    valueFormat: 'compact',
    plots: [{ tvTitle: 'Volume', label: 'Vol', color: null }],
  },
};

const buildMA = (key: MAIndicatorKey, color: string): IndicatorDefinition => ({
  study: {
    name: 'Moving Average',
    inputs: { length: MA_LENGTHS[key] },
    overrides: { 'Plot.color': color },
  },
  legend: {
    plots: [{ tvTitle: 'Plot', label: `MA(${MA_LENGTHS[key]})`, color }],
  },
  group: MA_GROUP,
});

/**
 * Built-in indicator definitions for the given theme. MA entries keep the
 * MA_LENGTHS order (MA5 … MA200).
 */
export const buildIndicatorDefinitions = (
  themeAppearance: ChartThemeAppearance = AppThemeKey.dark,
): IndicatorDefinitions => {
  const colors = getIndicatorColorSet(themeAppearance);
  const maDefinitions = Object.fromEntries(
    (Object.keys(MA_LENGTHS) as MAIndicatorKey[]).map((key) => [
      key,
      buildMA(key, colors.MA[key]),
    ]),
  );
  return {
    MACD: buildMACD(colors.MACD),
    RSI: buildRSI(colors.RSI),
    BOL: buildBOL(colors.BOL),
    Volume: VOLUME_DEFINITION,
    ...maDefinitions,
  };
};

/**
 * Built-in definitions with consumer entries merged on top (consumer wins per
 * indicator name).
 */
export const mergeIndicatorDefinitions = (
  themeAppearance: ChartThemeAppearance = AppThemeKey.dark,
  overrides?: IndicatorDefinitions,
): IndicatorDefinitions => ({
  ...buildIndicatorDefinitions(themeAppearance),
  ...(overrides ?? {}),
});

// ----- Derived helpers -------------------------------------------------------

const DEFAULT_DEFINITIONS = buildIndicatorDefinitions();

/** True when `name` is a built-in moving-average indicator (MA5, MA20, …). */
export const isMovingAverage = (name: string): boolean =>
  Object.prototype.hasOwnProperty.call(DEFAULT_DEFINITIONS, name) &&
  DEFAULT_DEFINITIONS[name].group === MA_GROUP;

/** Label for the MA picker trigger: 'MA', 'MA20' or 'MA x3'. */
export const getMALabel = (indicators: Iterable<string>): string => {
  const movingAverages = [...indicators].filter(isMovingAverage);
  if (movingAverages.length === 0) return MA_GROUP;
  if (movingAverages.length === 1) return movingAverages[0];
  return `${MA_GROUP} x${movingAverages.length}`;
};

export const getMAOptions = (
  themeAppearance: ChartThemeAppearance = AppThemeKey.dark,
) => {
  const maColors = getIndicatorColorSet(themeAppearance).MA;
  return (Object.keys(MA_LENGTHS) as MAIndicatorKey[]).map((key) => ({
    label: key,
    color: maColors[key],
  }));
};

/** Indicators whose study (and overlay legend) live in their own sub-pane. */
export const SUB_PANE_INDICATORS = Object.entries(DEFAULT_DEFINITIONS)
  .filter(([, def]) => def.study.pane === 'sub')
  .map(([name]) => name) as readonly string[];

export interface ToggleIndicatorOption {
  name: string;
  showDividerAfter?: boolean;
}

/** Toggle buttons shown by Token Details' IndicatorBar (after the MA picker). */
export const TOKEN_DETAILS_TOGGLE_INDICATORS: readonly ToggleIndicatorOption[] =
  [
    { name: 'BOL', showDividerAfter: true },
    { name: 'RSI' },
    { name: 'Volume' },
    { name: 'MACD' },
  ];

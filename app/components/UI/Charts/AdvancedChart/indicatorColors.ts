import { AppThemeKey } from '../../../../util/theme/models';
import type {
  LegendIndicatorConfig,
  LegendOverlayConfig,
} from './AdvancedChart.types';

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

export const MA_LENGTHS: Record<MAIndicatorKey, number> = {
  MA5: 5,
  MA10: 10,
  MA20: 20,
  MA50: 50,
  MA200: 200,
};

export const getMAOptions = (
  themeAppearance: ChartThemeAppearance = AppThemeKey.dark,
) => {
  const maColors = getIndicatorColorSet(themeAppearance).MA;
  return (Object.keys(maColors) as MAIndicatorKey[]).map((key) => ({
    label: key,
    color: maColors[key],
  }));
};

export const buildIndicatorLegendConfig = (
  colors: IndicatorColorSet,
): Record<string, LegendIndicatorConfig> => {
  const maLegendEntries = Object.fromEntries(
    (Object.keys(colors.MA) as MAIndicatorKey[]).map((key) => [
      key,
      {
        isMA: true,
        useIndex: true,
        plots: [
          {
            tvTitle: 'Plot',
            label: `MA(${MA_LENGTHS[key]})`,
            color: colors.MA[key],
          },
        ],
      },
    ]),
  );

  return {
    MACD: {
      subPaneLegend: true,
      plots: [
        { tvTitle: 'MACD', label: 'MACD(12,26)', color: colors.MACD.macd },
        { tvTitle: 'Signal', label: 'Signal', color: colors.MACD.signal },
        {
          tvTitle: 'Histogram',
          label: 'Hist',
          color: colors.MACD.histogramPositive,
        },
      ],
      useIndex: true,
    },
    RSI: {
      subPaneLegend: true,
      plots: [{ tvTitle: 'Plot', label: 'RSI(14)', color: colors.RSI.plot }],
      useIndex: true,
    },
    BOL: {
      combineInOnePill: true,
      title: 'BB(20,2)',
      plots: [
        { tvTitle: 'Upper', label: 'U:', color: colors.BOL.upper },
        { tvTitle: 'Median', label: 'M:', color: colors.BOL.basis },
        { tvTitle: 'Lower', label: 'L:', color: colors.BOL.lower },
      ],
      useIndex: true,
    },
    Volume: {
      plots: [{ tvTitle: 'Vol', label: 'Vol', color: null }],
      useIndex: true,
    },
    ...maLegendEntries,
  };
};

export const getTokenDetailsLegendOverlay = (
  themeAppearance: ChartThemeAppearance = AppThemeKey.dark,
): LegendOverlayConfig => ({
  enabled: true,
  config: buildIndicatorLegendConfig(getIndicatorColorSet(themeAppearance)),
});

/**
 * Sub-pane indicator names derived from legend config so there's a single
 * source of truth — adding `subPaneLegend: true` to a new entry is enough.
 */
export const SUB_PANE_INDICATORS = Object.entries(
  buildIndicatorLegendConfig(getIndicatorColorSet()),
)
  .filter(([, cfg]) => cfg.subPaneLegend === true)
  .map(([name]) => name) as readonly string[];

export const getIndicatorColorsForWebview = (
  themeAppearance: ChartThemeAppearance = AppThemeKey.dark,
) => {
  const colors = getIndicatorColorSet(themeAppearance);
  return {
    MA: colors.MA,
    MACD: colors.MACD,
    RSI: colors.RSI,
    BOL: colors.BOL,
  };
};

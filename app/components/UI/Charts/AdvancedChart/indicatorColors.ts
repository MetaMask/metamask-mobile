import type {
  LegendIndicatorConfig,
  LegendOverlayConfig,
} from './AdvancedChart.types';

/* eslint-disable @metamask/design-tokens/color-no-hex */

// ── Moving Average colors ──────────────────────────────────────────────
export const MA_INDICATOR_COLORS = {
  MA5: '#8B8BF5',
  MA10: '#FF6B9D',
  MA20: '#F5A623',
  MA50: '#B8E62E',
  MA200: '#5CC9F5',
} as const;

export const MA_LENGTHS: Record<keyof typeof MA_INDICATOR_COLORS, number> = {
  MA5: 5,
  MA10: 10,
  MA20: 20,
  MA50: 50,
  MA200: 200,
};

// ── MACD colors ────────────────────────────────────────────────────────
export const MACD_COLORS = {
  macd: '#5C8FFF',
  signal: '#FF6D00',
  histogramPositive: '#26A69A',
  histogramNegative: '#EF5350',
} as const;

// ── RSI colors ─────────────────────────────────────────────────────────
export const RSI_COLORS = {
  plot: '#E91E90',
} as const;

// ── Bollinger Bands colors ─────────────────────────────────────────────
export const BOL_COLORS = {
  upper: '#E040FB',
  basis: '#E040FB',
  lower: '#E040FB',
} as const;

/* eslint-enable @metamask/design-tokens/color-no-hex */

// ── Derived: MA picker options (used by MAPickerSheet) ─────────────────
export const MA_OPTIONS = (
  Object.keys(MA_INDICATOR_COLORS) as (keyof typeof MA_INDICATOR_COLORS)[]
).map((key) => ({
  label: key,
  color: MA_INDICATOR_COLORS[key],
}));

// ── Derived: Legend overlay config (used by Price.advanced.tsx) ─────────
const MA_LEGEND_ENTRIES: Record<string, LegendIndicatorConfig> =
  Object.fromEntries(
    (
      Object.keys(MA_INDICATOR_COLORS) as (keyof typeof MA_INDICATOR_COLORS)[]
    ).map((key) => [
      key,
      {
        isMA: true,
        useIndex: true,
        plots: [
          {
            tvTitle: 'Plot',
            label: `MA(${MA_LENGTHS[key]})`,
            color: MA_INDICATOR_COLORS[key],
          },
        ],
      },
    ]),
  );

export const INDICATOR_LEGEND_CONFIG: Record<string, LegendIndicatorConfig> = {
  MACD: {
    plots: [
      { tvTitle: 'MACD', label: 'MACD(12,26)', color: MACD_COLORS.macd },
      { tvTitle: 'Signal', label: 'Signal', color: MACD_COLORS.signal },
      {
        tvTitle: 'Histogram',
        label: 'Hist',
        color: MACD_COLORS.histogramPositive,
      },
    ],
    useIndex: true,
  },
  RSI: {
    plots: [{ tvTitle: 'Plot', label: 'RSI(14)', color: RSI_COLORS.plot }],
    useIndex: true,
  },
  BOL: {
    plots: [
      { tvTitle: 'Upper', label: 'BB(20,2)', color: BOL_COLORS.upper },
      { tvTitle: 'Median', label: 'M', color: BOL_COLORS.basis },
      { tvTitle: 'Lower', label: 'L', color: BOL_COLORS.lower },
    ],
    useIndex: true,
  },
  Volume: {
    plots: [{ tvTitle: 'Vol', label: 'Vol', color: null }],
    useIndex: true,
  },
  ...MA_LEGEND_ENTRIES,
};

export const TOKEN_DETAILS_LEGEND_OVERLAY: LegendOverlayConfig = {
  enabled: true,
  config: INDICATOR_LEGEND_CONFIG,
};

// ── Serialisable payload injected into the WebView via CONFIG ──────────
export const INDICATOR_COLORS_FOR_WEBVIEW = {
  MA: MA_INDICATOR_COLORS,
  MACD: MACD_COLORS,
  RSI: RSI_COLORS,
  BOL: BOL_COLORS,
};

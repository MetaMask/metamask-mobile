import type { LineChromeOptions } from './AdvancedChart.types';

interface AdvancedChartConsumerPreset {
  lineChrome: LineChromeOptions;
  /** Omit on AdvancedChart for TradingView default sub-pane sizing. */
  subPaneHeightRatio?: number;
  /** TV built-in scale + last-value pill subscript notation (see `useSubscriptPriceFormat`). */
  useSubscriptPriceFormat?: boolean;
}

/**
 * Per-consumer {@link AdvancedChart} presets. `lineChrome` partials merge with
 * `DEFAULT_LINE_CHROME` via `resolveLineChromeOptions`.
 */
export const advancedChartLineChromePresets = {
  tokenOverview: {
    lineChrome: {
      useCustomLineEndMarker: false,
      useCustomDashedLastPriceLine: false,
      useCustomPriceLabels: false,
      hideTimeScale: false,
    },
    // Other consumers can omit this prop for TradingView default sub-pane sizing.
    subPaneHeightRatio: 0.2,
    useSubscriptPriceFormat: true,
  },
} as const satisfies Record<string, AdvancedChartConsumerPreset>;

interface AdvancedChartConsumerPreset {
  /** Omit on AdvancedChart for TradingView default sub-pane sizing. */
  subPaneHeightRatio?: number;
  /** TV built-in scale + last-value pill subscript notation (see `useSubscriptPriceFormat`). */
  useSubscriptPriceFormat?: boolean;
}

/**
 * Per-consumer {@link AdvancedChart} presets. `lineChrome` was removed in
 * Phase 4b now that the modular WebView bundle uses TradingView's built-in
 * chrome exclusively (no custom pill / dashed-line / end-dot options).
 */
export const advancedChartLineChromePresets = {
  tokenOverview: {
    subPaneHeightRatio: 0.2,
    useSubscriptPriceFormat: true,
  },
  /**
   * Perps: use TradingView-native price scale labels and keep current/entry/TP/SL/liquidation
   * guides in the explicit Perps position-line overlay payload.
   */
  perps: {},
} as const satisfies Record<string, AdvancedChartConsumerPreset>;

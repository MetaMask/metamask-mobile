import type { LineChromeOptions } from './AdvancedChart.types';

/**
 * Partial `lineChrome` maps for {@link AdvancedChart}. Unset keys use `DEFAULT_LINE_CHROME`
 * via `resolveLineChromeOptions` in the component and template.
 */
export const advancedChartLineChromePresets = {
  /**
   * Token overview (AssetOverview): TradingView built-ins for scale, price line, and crosshair
   * labels; no custom line-end icon.
   */
  tokenOverview: {
    useCustomLineEndMarker: true,
    useCustomDashedLastPriceLine: true,
    useCustomPriceLabels: true,
    hideTimeScale: false,
  },
} as const satisfies Record<string, LineChromeOptions>;

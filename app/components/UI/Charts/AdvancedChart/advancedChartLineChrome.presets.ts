import type { LineChromeOptions } from './AdvancedChart.types';

/**
 * Partial `lineChrome` maps for {@link AdvancedChart}. Unset keys use `DEFAULT_LINE_CHROME`
 * via `resolveLineChromeOptions` in the component and template.
 */
export const advancedChartLineChromePresets = {
  /**
   * Token overview (AssetOverview): TradingView built-ins for last-value and crosshair scale
   * labels; custom dashed last-price line and line-end marker only.
   */
  tokenOverview: {
    useCustomLineEndMarker: true,
    useCustomDashedLastPriceLine: true,
    hideTimeScale: false,
  },
} as const satisfies Record<string, LineChromeOptions>;

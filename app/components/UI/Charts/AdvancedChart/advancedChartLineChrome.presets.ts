import type { LineChromeOptions } from './AdvancedChart.types';

/**
 * Partial `lineChrome` maps for {@link AdvancedChart}. Unset keys use `DEFAULT_LINE_CHROME`
 * via `resolveLineChromeOptions` in the component and template.
 */
export const advancedChartLineChromePresets = {
  /**
   * Token overview (AssetOverview): TV built-ins for scale/crosshair/last-value labels and native
   * price line; custom line-end marker only. Ambient last-price color via chart color props.
   */
  tokenOverview: {
    useCustomLineEndMarker: true,
    useCustomDashedLastPriceLine: false,
    useCustomPriceLabels: false,
    hideTimeScale: false,
  },
} as const satisfies Record<string, LineChromeOptions>;

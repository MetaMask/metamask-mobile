import type { LineChromeOptions } from './AdvancedChart.types';

/**
 * Partial `lineChrome` maps for {@link AdvancedChart}. Unset keys use `DEFAULT_LINE_CHROME`
 * via `resolveLineChromeOptions` in the component and template.
 */
export const advancedChartLineChromePresets = {
  /**
   * Token overview (AssetOverview): TV built-ins. Ambient last-price color via chart color props.
   */
  tokenOverview: {
    useCustomLineEndMarker: false,
    useCustomDashedLastPriceLine: false,
    useCustomPriceLabels: false,
    hideTimeScale: false,
  },
} as const satisfies Record<string, LineChromeOptions>;

// Shared types for the AdvancedChart WebView modules.
//
// These types are local to the WebView bundle. Cross-bridge payload shapes that
// must match the RN side live in messages/contract.ts and mirror the unions in
// app/components/UI/Charts/AdvancedChart/AdvancedChart.types.ts.

/**
 * CONFIG.theme shape as injected by AdvancedChartTemplate.createConfigScript.
 * Every key may be reassigned by SET_THEME_COLORS at runtime.
 */
export interface ChartTheme {
  backgroundColor: string;
  borderColor: string;
  textColor: string;
  textDefaultColor: string;
  sectionBackgroundColor: string;
  crosshairBackgroundColor: string;
  crosshairTextColor: string;
  legendTextColor: string;
  textAlternativeColor: string;
  successColor: string;
  lineColor: string;
  errorColor: string;
  primaryColor: string;
  currentPriceColor: string;
}

/**
 * Indicator color palette for MA / MACD / RSI / BOL.
 * Sourced from app/components/UI/Charts/AdvancedChart/indicatorColors.ts on the
 * RN side and injected as CONFIG.indicatorColors.
 */
export interface IndicatorColors {
  MA?: Record<string, string>;
  MACD?: Record<string, string>;
  RSI?: Record<string, string>;
  BOL?: Record<string, string>;
}

export interface ChartFeaturesConfig {
  enableDrawingTools?: boolean;
  disabledFeatures?: string[];
}

/**
 * Shape of window.CONFIG as inlined by AdvancedChartTemplate before this IIFE
 * runs. Phase 1 reads `libraryUrl`, `theme`, `features`, `indicatorColors`.
 * Future phases add more keys as they port from the legacy chartLogic.js.
 */
export interface ChartConfig {
  libraryUrl: string;
  theme: ChartTheme;
  features?: ChartFeaturesConfig;
  indicatorColors?: IndicatorColors;
  useSubscriptPriceFormat?: boolean;
}

/**
 * Minimal TradingView types we touch in Phase 1. Full types ship with the
 * charting library at runtime; we stub the bits we call.
 */
export type TVResolution = string;

export interface TVTimeRange {
  type: 'time-range';
  from: number;
  to: number;
}

export interface TVChartingLibraryWidget {
  onChartReady(cb: () => void): void;
  activeChart(): TVActiveChart;
  applyOverrides(overrides: Record<string, unknown>): void;
  remove(): void;
}

export interface TVActiveChart {
  getTimeScale(): {
    setRightOffset(offset: number): void;
    barSpacingChanged(): { subscribe(scope: unknown, cb: () => void): void };
  };
  onVisibleRangeChanged(): {
    subscribe(scope: unknown, cb: () => void): void;
  };
  crossHairMoved(): {
    subscribe(scope: unknown, cb: (params: unknown) => void): void;
  };
  selection(): {
    onChanged(): { subscribe(scope: unknown, cb: () => void): void };
    clear(): void;
  };
}

export type TVWidgetConstructor = new (
  options: Record<string, unknown>,
) => TVChartingLibraryWidget;

declare global {
  interface Window {
    CONFIG?: ChartConfig;
    TradingView?: { widget: TVWidgetConstructor };
    ReactNativeWebView?: { postMessage(message: string): void };
  }
}

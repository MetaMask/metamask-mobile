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
 * Visual overrides applied via TradingView's `applyOverrides`. Set by the
 * consumer's `visualOverrides` prop on the RN side. Empty/undefined keys
 * fall through to TradingView defaults.
 */
export interface VisualOverridesConfigInline {
  gridLineColor?: string;
  hidePaneSeparator?: boolean;
  currentPriceLineColor?: string;
  volumeUpColor?: string;
  volumeDownColor?: string;
}

/**
 * Shape of window.CONFIG as inlined by AdvancedChartTemplate before this IIFE
 * runs. Phase 1 reads `libraryUrl`, `theme`, `features`, `indicatorColors`.
 * Phase 2 adds `visualOverrides`. Future phases add more keys as they port
 * from the legacy chartLogic.js.
 */
export interface ChartConfig {
  libraryUrl: string;
  theme: ChartTheme;
  features?: ChartFeaturesConfig;
  indicatorColors?: IndicatorColors;
  useSubscriptPriceFormat?: boolean;
  visualOverrides?: VisualOverridesConfigInline;
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

export interface TVSubscription<TArgs extends unknown[] = []> {
  subscribe(scope: unknown, cb: (...args: TArgs) => void): void;
  unsubscribe(scope: unknown, cb: (...args: TArgs) => void): void;
}

export interface TVTimeScale {
  setRightOffset(offset: number): void;
  barSpacingChanged(): TVSubscription;
}

export interface TVCrosshairParams {
  price?: number;
  time?: number;
  offsetX?: number;
  offsetY?: number;
}

export interface TVActiveChart {
  setChartType(type: ChartType): void;
  setResolution(resolution: TVResolution, callback: () => void): void;
  resetData(): void;
  setVisibleRange(
    range: { from: number; to: number },
    options?: { percentRightMargin?: number },
  ): void;
  getTimeScale(): TVTimeScale;
  onDataLoaded(): TVSubscription;
  onVisibleRangeChanged(): TVSubscription;
  crossHairMoved(): TVSubscription<[TVCrosshairParams]>;
  selection(): {
    onChanged(): TVSubscription;
    clear(): void;
  };
}

export type TVWidgetConstructor = new (
  options: Record<string, unknown>,
) => TVChartingLibraryWidget;

/** OHLCV bar in milliseconds (matches the SetOHLCVDataPayload in RN). */
export interface OHLCVBar {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

/** TradingView-shaped bar payload returned from datafeed.getBars / subscribeBars. */
export interface TVBar {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface OHLCVPaginationConfig {
  nextCursor: string | null;
  hasMore: boolean;
  assetId: string | null;
  vsCurrency: string | null;
}

/** Chart type integers used by TradingView's setChartType / currentChartType. */
export const enum ChartType {
  Candles = 1,
  Line = 2,
}

/** Subset of TV's `LibrarySymbolInfo` we actually return from resolveSymbol. */
export interface SymbolInfo {
  name: string;
  ticker: string;
  description: string;
  type: string;
  session: string;
  timezone: string;
  exchange: string;
  minmov: number;
  pricescale: number;
  variable_tick_size: string;
  has_intraday: boolean;
  has_daily: boolean;
  has_weekly_and_monthly: boolean;
  supported_resolutions: string[];
  volume_precision: number;
  data_status: 'streaming' | 'endofday' | 'pulsed' | 'delayed_streaming';
}

export interface PeriodParams {
  from: number;
  to: number;
  countBack: number;
  firstDataRequest: boolean;
}

export type GetBarsCallback = (
  bars: TVBar[],
  meta?: { noData?: boolean; nextTime?: number },
) => void;

export type GetBarsErrorCallback = (reason: string) => void;

export type RealtimeTickCallback = (tick: TVBar) => void;

export interface TVDatafeed {
  onReady(callback: (config: Record<string, unknown>) => void): void;
  searchSymbols(
    userInput: string,
    exchange: string,
    symbolType: string,
    onResult: (result: unknown[]) => void,
  ): void;
  resolveSymbol(
    symbolName: string,
    onResolve: (info: SymbolInfo) => void,
    onError: (reason: string) => void,
  ): void;
  getBars(
    symbolInfo: SymbolInfo,
    resolution: TVResolution,
    periodParams: PeriodParams,
    onResult: GetBarsCallback,
    onError: GetBarsErrorCallback,
  ): void;
  subscribeBars(
    symbolInfo: SymbolInfo,
    resolution: TVResolution,
    onTick: RealtimeTickCallback,
    listenerGuid: string,
  ): void;
  unsubscribeBars(listenerGuid: string): void;
}

declare global {
  interface Window {
    CONFIG?: ChartConfig;
    TradingView?: { widget: TVWidgetConstructor };
    ReactNativeWebView?: { postMessage(message: string): void };
  }
}

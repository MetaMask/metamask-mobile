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
  volumeSuccessColor?: string;
  volumeErrorColor?: string;
  gridLineColor?: string;
}

/**
 * Legend mode, mirrored from AdvancedChart.types.ts `LegendMode`.
 * - 'none': no TradingView legend, no custom overlay.
 * - 'builtIn': TradingView's native legend (legend_widget).
 * - 'overlay': custom DOM legend overlay rendered by legend.ts.
 */
export type LegendMode = 'overlay' | 'builtIn' | 'none';

export interface ChartFeaturesConfig {
  enableDrawingTools?: boolean;
  disabledFeatures?: string[];
  hidePaneSeparator?: boolean;
  legendMode?: LegendMode;
}

export interface LegendPlotCfg {
  tvTitle: string;
  label: string;
  color: string | null;
}

/**
 * Mirrors AdvancedChart.types.ts `IndicatorDefinition`. RN serializes the
 * full registry into window.CONFIG.indicatorDefinitions; the WebView never
 * hard-codes study names, inputs, colors or legend labels.
 */
export interface IndicatorLegendCfg {
  plots: LegendPlotCfg[];
  /** When set, all plots render in one pill led by this title. */
  title?: string;
  /**
   * 'tv' (default): show the value exactly as TradingView formats it
   * (displayedData / crosshair entityValues). 'compact': K/M/B abbreviation
   * computed from the raw number (used for Volume).
   */
  valueFormat?: 'tv' | 'compact';
  /** Color for `negativeColorPlot` when its value is negative. */
  negativeColor?: string | null;
  negativeColorPlot?: string;
}

export interface IndicatorStudyCfg {
  /** TradingView study name passed to createStudy. */
  name: string;
  inputs?: Record<string, unknown>;
  overrides?: Record<string, unknown>;
  /** 'sub' places the study (and its legend) in a dedicated pane. */
  pane?: 'main' | 'sub';
}

export interface IndicatorDefinitionCfg {
  study: IndicatorStudyCfg;
  legend?: IndicatorLegendCfg;
  /** Grouping key, e.g. 'MA' for moving averages. */
  group?: string;
}

export type IndicatorDefinitionsCfg = Record<string, IndicatorDefinitionCfg>;

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
 * runs. Phase 1 reads `libraryUrl`, `theme`, `features`, `indicatorDefinitions`.
 * Phase 2 adds `visualOverrides`. Future phases add more keys as they port
 * from the legacy chartLogic.js.
 */
export interface ChartConfig {
  libraryUrl: string;
  theme: ChartTheme;
  features?: ChartFeaturesConfig;
  /** Indicator registry (study + legend per indicator name) supplied by RN. */
  indicatorDefinitions?: IndicatorDefinitionsCfg;
  useSubscriptPriceFormat?: boolean;
  priceDecimals?: number | null;
  visualOverrides?: VisualOverridesConfigInline;
  /** Optional sub-pane height ratio in (0, 1] for RSI/MACD sub-panes. */
  subPaneHeightRatio?: number;
}

/**
 * Minimal TradingView types we touch in Phase 1. Full types ship with the
 * charting library at runtime; we stub the bits we call.
 */
export type TVResolution = string; // NOSONAR — intentional semantic alias for TradingView resolution strings

export interface TVTimeRange {
  type: 'time-range';
  from: number;
  to: number;
}

export type TVWidgetEvent = 'mouse_down' | 'mouse_up' | 'panes_height_changed';

export interface TVChartingLibraryWidget {
  onChartReady(cb: () => void): void;
  activeChart(): TVActiveChart;
  applyOverrides(overrides: Record<string, unknown>): void;
  subscribe(event: TVWidgetEvent, handler: () => void): void;
  resize(): void;
  remove(): void;
  resetCache?(): void;
}

export interface TVSubscription<TArgs extends unknown[] = []> {
  subscribe(scope: unknown, cb: (...args: TArgs) => void): void;
  unsubscribe(scope: unknown, cb: (...args: TArgs) => void): void;
}

export interface TVTimeScale {
  setRightOffset(offset: number): void;
  barSpacingChanged(): TVSubscription;
  width?(): number;
}

/** v30.1.0 `CrossHairMovedEventSourceValue` — value pre-formatted by TV. */
export interface TVCrosshairSourceValue {
  title: string;
  value: string;
}

/** v30.1.0 `CrossHairMovedEventSource` — one entry per series/study. */
export interface TVCrosshairSource {
  isHovered: boolean;
  title: string;
  values: TVCrosshairSourceValue[];
}

export interface TVCrosshairParams {
  price?: number;
  time?: number;
  offsetX?: number;
  offsetY?: number;
  /**
   * Data-window values at the crosshair, keyed by entity id (study id, or
   * `_seriesId` for the main series). Present in v30.1.0 even with
   * `legend_widget` disabled.
   */
  entityValues?: Record<string, TVCrosshairSource>;
}

export interface TVMainSeries {
  /** Re-attaches the main series to the right price scale. */
  detachToRight(): void;
  /** Directly update style properties for a specific chart type (2=line, 10=baseline, etc.). */
  setChartStyleProperties(
    chartStyle: number,
    properties: Record<string, unknown>,
  ): void;
}

/** Entity id returned by TradingView's `createShape`. */
export type TVShapeId = string; // NOSONAR — intentional semantic alias for TradingView shape entity IDs

/**
 * Runtime handle to a drawing shape (icon, horizontal_line, etc.).
 * Only the members we call are typed.
 */
export interface TVShape {
  setProperties(properties: Record<string, unknown>): void;
}

export interface TVShapePoint {
  time?: number;
  price?: number;
}

export interface TVShapeCreateOptions {
  shape: string;
  text?: string;
  icon?: number;
  lock?: boolean;
  overrides?: Record<string, unknown>;
  disableSelection?: boolean;
  disableSave?: boolean;
  disableUndo?: boolean;
  showInObjectsTree?: boolean;
  zOrder?: 'top' | 'bottom';
}

export interface TVPriceScale {
  getVisiblePriceRange(): { from: number; to: number } | null;
  width?(): number;
  isInverted?(): boolean;
  getMode?(): number;
  setAutoScale?(enabled: boolean): void;
}

export interface TVPane {
  getMainSourcePriceScale(): TVPriceScale | null;
  getRightPriceScales?(): TVPriceScale[];
  getHeight(): number;
}

export type StudyId = string; // NOSONAR — intentional semantic alias for TradingView study entity IDs

/** Subset of v30.1.0 `IStudyApi` that we call. */
export interface TVStudy {
  onDataLoaded(): TVSubscription;
  onStudyError?(): TVSubscription;
  applyOverrides?(overrides: Record<string, unknown>): void;
  paneIndex?(): number;
}

export interface TVExportSchemaField {
  type: string;
  sourceId?: StudyId;
  plotTitle?: string;
}

/** v30.1.0 `ExportedData`. Rows are Float64Array at runtime. */
export interface TVExportData {
  schema: TVExportSchemaField[];
  data: ArrayLike<number>[];
  /** Only populated when `includeDisplayedValues: true` is requested. */
  displayedData?: string[][];
}

/** Subset of v30.1.0 `ExportDataOptions` that we use. `from` is UNIX seconds. */
export interface TVExportDataOptions {
  from?: number;
  includeSeries?: boolean;
  includeDisplayedValues?: boolean;
  includedStudies?: StudyId[];
  includeOffsetStudyValues?: boolean;
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
  getSeries(): TVMainSeries;
  onDataLoaded(): TVSubscription;
  onVisibleRangeChanged(): TVSubscription;
  crossHairMoved(): TVSubscription<[TVCrosshairParams]>;
  selection(): {
    onChanged(): TVSubscription;
    clear(): void;
  };
  createStudy(
    name: string,
    forceOverlay: boolean,
    lock: boolean,
    inputs: Record<string, unknown>,
    overrides: Record<string, unknown>,
    options?: { priceScale?: string },
  ): Promise<StudyId | null>;
  createShape(
    point: TVShapePoint,
    options: TVShapeCreateOptions,
  ): Promise<TVShapeId>;
  removeEntity(id: StudyId | TVShapeId): void;
  /**
   * NOTE: in v30.1.0 this THROWS ("There is no such study") for unknown or
   * removed ids instead of returning null. Always call inside try/catch.
   */
  getStudyById(id: StudyId): TVStudy | null;
  getShapeById?(id: TVShapeId): TVShape | null;
  getAllPanesHeight(): number[];
  setAllPanesHeight(heights: number[]): void;
  exportData(options: TVExportDataOptions): Promise<TVExportData>;
  getVisibleRange?(): { from: number; to: number } | null;
  getVisibleBarsRange?(): { from: number; to: number } | null;
  getPanes?(): TVPane[];
  dataReady?(callback: () => void): void;
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

export interface RealtimeListener {
  resolution: TVResolution;
  onTick: RealtimeTickCallback;
}

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

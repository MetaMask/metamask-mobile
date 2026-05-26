/**
 * Shared types for the AdvancedChart WebView modules.
 *
 * These mirror the RN-side types in AdvancedChart.types.ts but are kept
 * separate so the WebView bundle never imports from the Metro/RN graph.
 */

export interface OHLCVBar {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface ChartTheme {
  backgroundColor: string;
  borderColor: string;
  textColor: string;
  successColor: string;
  errorColor: string;
  primaryColor: string;
}

export interface LineChromeOptions {
  hideTimeScale: boolean;
  useCustomLineEndMarker: boolean;
  useCustomDashedLastPriceLine: boolean;
  useCustomPriceLabels: boolean;
}

export interface OHLCVPagination {
  nextCursor: string | null;
  hasMore: boolean;
  assetId: string | null;
  vsCurrency: string | null;
}

export interface ChartConfig {
  libraryUrl: string;
  theme: ChartTheme;
  lineChrome?: Partial<LineChromeOptions>;
  enableDrawingTools?: boolean;
  disabledFeatures?: string[];
}

export type RNToWebViewMessageType =
  | 'SET_OHLCV_DATA'
  | 'ADD_INDICATOR'
  | 'REMOVE_INDICATOR'
  | 'SET_CHART_TYPE'
  | 'SET_LINE_CHROME'
  | 'SET_POSITION_LINES'
  | 'REALTIME_UPDATE'
  | 'TOGGLE_VOLUME';

export type WebViewToRNMessageType =
  | 'CHART_READY'
  | 'CHART_LAYOUT_SETTLED'
  | 'INDICATOR_ADDED'
  | 'INDICATOR_REMOVED'
  | 'CROSSHAIR_MOVE'
  | 'CHART_INTERACTED'
  | 'CHART_TRADINGVIEW_CLICKED'
  | 'ERROR'
  | 'DEBUG';

export interface SeriesColorOverrides {
  [key: string]: string | number;
}

// ---------------------------------------------------------------------------
// TradingView charting-library type stubs
//
// These are minimal type declarations covering only the API surface we use.
// They avoid `any` and keep the rest of the codebase fully typed.
// ---------------------------------------------------------------------------

export type TVEntityId = string;

export interface TVSubscription {
  subscribe(obj: null, fn: (...args: unknown[]) => void): void;
  unsubscribe(obj: null, fn: (...args: unknown[]) => void): void;
}

export interface TVTimeScale {
  barSpacingChanged(): TVSubscription;
  coordinateToTime(x: number): number | null;
  width(): number;
}

export interface TVPriceScale {
  getVisiblePriceRange(): { from: number; to: number } | null;
  isInverted?(): boolean;
  getMode?(): number;
}

export interface TVPane {
  getMainSourcePriceScale(): TVPriceScale | null;
  getHeight(): number;
}

export interface TVSeriesData {
  last(): TVDataItem | null;
}

export interface TVDataItem {
  time?: number;
  value?: number | number[];
  close?: number;
  [key: string]: unknown;
}

export interface TVSeries {
  setChartStyleProperties(style: number, props: Record<string, unknown>): void;
  detachToRight(): void;
  data?(): TVSeriesData | null;
  bars?(): TVDataItem[] | null;
}

export interface TVSelection {
  onChanged(): TVSubscription;
  clear(): void;
}

export interface TVShape {
  id: TVEntityId;
  name: string;
}

export interface TVActiveChart {
  setChartType(type: number): void;
  setResolution(resolution: string, callback: () => void): void;
  resetData(): void;
  getSeries(): TVSeries;
  getTimeScale(): TVTimeScale;
  getPanes(): TVPane[];
  getAllShapes(): TVShape[];
  getAllPanesHeight(): number[];
  setAllPanesHeight(heights: number[]): void;
  removeEntity(id: TVEntityId): void;
  createStudy(
    name: string,
    forceOverlay: boolean,
    lock: boolean,
    inputs: Record<string, unknown>,
    overrides?: Record<string, string | number>,
    options?: Record<string, unknown>,
  ): Promise<TVEntityId>;
  createShape(
    point: Record<string, unknown>,
    options: Record<string, unknown>,
  ): Promise<TVEntityId>;
  getVisibleBarsRange(): { from: number; to: number } | null;
  getVisibleRange?(): { from: number; to: number } | null;
  onVisibleRangeChanged(): TVSubscription;
  onDataLoaded(): TVSubscription;
  crossHairMoved(): TVSubscription;
  selection(): TVSelection;
  setVisibleRange(
    range: { from: number; to: number },
    options?: Record<string, unknown>,
  ): void;
  dataReady(callback: () => void): void;
}

export interface TVChartWidget {
  activeChart(): TVActiveChart;
  applyOverrides(overrides: Record<string, unknown>): void;
  onChartReady(callback: () => void): void;
  subscribe(event: string, callback: (...args: unknown[]) => void): void;
  resize(): void;
  remove(): void;
}

export interface TVCrosshairParams {
  price: number;
  time: number;
  offsetX?: number;
  offsetY?: number;
  userTime?: number;
}

export interface TVWidgetConstructor {
  widget: new (opts: Record<string, unknown>) => TVChartWidget;
}

export interface SetOHLCVDataPayload {
  data: OHLCVBar[];
  pagination?: {
    nextCursor?: string | null;
    hasMore?: boolean;
    assetId?: string | null;
    vsCurrency?: string | null;
  };
  visibleFromMs?: number | null;
  visibleToMs?: number | null;
}

export interface RealtimeUpdatePayload {
  bar: OHLCVBar;
}

export interface SetChartTypePayload {
  type: number;
}

export interface AddIndicatorPayload {
  name: string;
  inputs?: Record<string, unknown>;
}

export interface RemoveIndicatorPayload {
  name: string;
}

export interface ToggleVolumePayload {
  visible: boolean;
  volumeOverlay?: boolean;
}

export interface SetPositionLinesPayload {
  position: {
    entryPrice?: number;
    takeProfitPrice?: number;
    stopLossPrice?: number;
    liquidationPrice?: number;
  };
}

export interface RNMessage {
  type: RNToWebViewMessageType;
  payload: unknown;
}

export interface CrosshairInteractionState {
  ohlcvBarVisible: boolean;
  ohlcvBarShownAt: number;
  ohlcvDismissUntil: number;
}

export interface TvDomPatchedWindow extends Window {
  __mmLastTvExternalBridgeAt?: number;
  __mmTvOpenPatched?: boolean;
  ReactNativeWebView?: { postMessage: (msg: string) => void };
  open(url?: string | URL, target?: string, features?: string): Window | null;
}

export interface TvDomPatchedDocument extends Document {
  __mmTvLinkCaptureInstalled?: boolean;
  defaultView: TvDomPatchedWindow | null;
}

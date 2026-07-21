// Versioned message contract between React Native and the WebView IIFE.
//
// Strings MUST match RNToWebViewMessageType and WebViewToRNMessageType in
// app/components/UI/Charts/AdvancedChart/AdvancedChart.types.ts. These names
// are part of the public contract; renaming requires a triple-approved PR.
//
// Phase 1 ships the subset that bootstrap + theme + external-link bridge need.
// Subsequent phases extend the unions:
//   Phase 2 — SET_OHLCV_DATA, REALTIME_UPDATE, SET_CHART_TYPE, CROSSHAIR_MOVE,
//             CHART_INTERACTED
//   Phase 3 — ADD_INDICATOR, REMOVE_INDICATOR, SET_MA_VISIBILITY,
//             TOGGLE_VOLUME, SET_SUB_PANE_LAYOUT, INDICATOR_ADDED,
//             INDICATOR_REMOVED, LEGEND_RENDERED
//   Phase 5 — SET_TRADE_MARKERS, PULSE_TRADE_MARKER, FOCUS_TIME (inbound),
//             TRADE_MARKER_PRESSED (outbound)
//   Phase 6 — SET_POSITION_LINES, FETCH_OLDER_BARS_REQUEST,
//             FETCH_OLDER_BARS_RESPONSE
//
// Phase 4 deletes SET_LINE_CHROME alongside the custom-chrome implementation.

import type { ChartType, OHLCVBar, OHLCVPaginationConfig } from '../core/types';

/** Inbound — React Native → WebView IIFE. */
export type InboundMessage =
  | SetThemeColorsMessage
  | SetOHLCVDataMessage
  | RealtimeUpdateMessage
  | SetChartTypeMessage
  | AddIndicatorMessage
  | RemoveIndicatorMessage
  | SetMAVisibilityMessage
  | ToggleVolumeMessage
  | SetSubPaneLayoutMessage
  | SetPositionLinesMessage
  | SetTradeMarkersMessage
  | PulseTradeMarkerMessage
  | FocusTimeMessage
  | FetchOlderBarsResponseMessage;

export interface SetThemeColorsMessage {
  type: 'SET_THEME_COLORS';
  payload: SetThemeColorsPayload;
}

export interface SetThemeColorsPayload {
  lineColor?: string;
  successColor?: string;
  errorColor?: string;
  currentPriceColor?: string;
  volumeSuccessColor?: string;
  volumeErrorColor?: string;
}

export interface SetOHLCVDataMessage {
  type: 'SET_OHLCV_DATA';
  payload: SetOHLCVDataPayload;
}

export interface SetOHLCVDataPayload {
  data: OHLCVBar[];
  pagination?: OHLCVPaginationConfig;
  /** When enabled, getBars sends FETCH_OLDER_BARS_REQUEST to RN instead of fetching Price API. */
  rnBackedPagination?: { enabled: boolean };
  /** Visible-range start (ms) so the WebView can call setVisibleRange after reset. */
  visibleFromMs?: number;
  /** Visible-range end (ms) anchored to the last candle. */
  visibleToMs?: number;
  /** Optional symbol/vsCurrency for downstream pagination strategies. */
  symbol?: string;
  vsCurrency?: string;
  /**
   * SocialLeaderboard (SLB) scoping flag. Activates the third pagination
   * strategy ("Strategy C — SLB bulk back-fill"):
   *
   * **Strategy A** (Price API / WebView-driven) — Token Details default.
   * The WebView fetches older pages from the public Price API using
   * cursor-based pagination (assetId + nextCursor). RN is not involved
   * after the initial SET_OHLCV_DATA handoff.
   *
   * **Strategy B** (RN-backed) — Perps. The WebView sends
   * FETCH_OLDER_BARS_REQUEST to RN, which fetches from a private candle
   * source and sends bars back via FETCH_OLDER_BARS_RESPONSE.
   * Opt-in: `rnBackedPagination.enabled`.
   *
   * **Strategy C** (SLB bulk back-fill) — Social Leaderboard. RN
   * pre-loads the full OHLCV dataset covering the trade window
   * (visibleFromMs to visibleToMs) and sends it in a single
   * SET_OHLCV_DATA. The WebView does NOT paginate — getBars returns
   * noData for any request outside the pre-loaded range. After data
   * loads, the viewport is centered on the trade window so the user
   * sees all relevant trades immediately. When the user taps a
   * different trade row, RN re-sends the full dataset with updated
   * visibleFromMs/visibleToMs and the viewport re-centers.
   * Opt-in: `slbMode: true` on the payload.
   *
   * The branching is in datafeed.ts getBars:
   * 1. slbMode -> noData (all data pre-loaded by RN)
   * 2. pag.assetId -> Price API (Strategy A)
   * 3. rnBackedPagination.enabled -> RN callback (Strategy B)
   * 4. else -> noData: true
   */
  slbMode?: boolean;
}

export interface RealtimeUpdateMessage {
  type: 'REALTIME_UPDATE';
  payload: { bar: OHLCVBar };
}

export interface SetChartTypeMessage {
  type: 'SET_CHART_TYPE';
  payload: { type: ChartType };
}

export interface AddIndicatorMessage {
  type: 'ADD_INDICATOR';
  payload: { name: string; inputs?: Record<string, unknown> };
}

export interface RemoveIndicatorMessage {
  type: 'REMOVE_INDICATOR';
  payload: { name: string };
}

export interface SetMAVisibilityMessage {
  type: 'SET_MA_VISIBILITY';
  payload: { visible: string[] };
}

export interface ToggleVolumeMessage {
  type: 'TOGGLE_VOLUME';
  payload: { visible: boolean; volumeOverlay?: boolean };
}

export interface SetSubPaneLayoutMessage {
  type: 'SET_SUB_PANE_LAYOUT';
  payload: { heightRatio: number | null };
}

/**
 * A single trade marker anchored to a candle in `time` (unix ms). `intent`
 * selects the theme color (successColor for 'enter', errorColor for 'exit');
 * `price` is a fallback anchor when the candle is outside the loaded range.
 * Mirrors the shape RN sends in `TradeMarker` from AdvancedChart.types.ts.
 */
export interface TradeMarker {
  id: string | number;
  time: number;
  intent: 'enter' | 'exit';
  price?: number;
}

export interface SetTradeMarkersMessage {
  type: 'SET_TRADE_MARKERS';
  payload: SetTradeMarkersPayload;
}

export interface SetTradeMarkersPayload {
  /** Full marker set; RN sends every trade, not just the visible window. */
  markers: TradeMarker[] | null;
}

export interface PulseTradeMarkerMessage {
  type: 'PULSE_TRADE_MARKER';
  payload: { id: string | number };
}

export interface FocusTimeMessage {
  type: 'FOCUS_TIME';
  payload: FocusTimePayload;
}

export interface FocusTimePayload {
  timeMs: number;
  /** Optional explicit visible span (ms); omitted → preserve current zoom. */
  spanMs?: number;
  /** false disables the slide animation (jump instead). Default true. */
  animate?: boolean;
}

// ----- Position Lines (Perps) ------------------------------------------------

export type PositionSide = 'long' | 'short';

export interface PositionLines {
  side: PositionSide;
  entryPrice?: number;
  currentPrice?: number;
  takeProfitPrice?: number;
  stopLossPrice?: number;
  liquidationPrice?: number;
}

export interface PositionLineColors {
  currentPrice?: string;
  entry: string;
  takeProfit: string;
  stopLoss: string;
  liquidation: string;
}

export interface SetPositionLinesMessage {
  type: 'SET_POSITION_LINES';
  payload: SetPositionLinesPayload;
}

export interface SetPositionLinesPayload {
  position: PositionLines | null;
  positionLineColors?: PositionLineColors;
}

// ----- RN-Backed Pagination (Perps) ------------------------------------------

export interface FetchOlderBarsResponseMessage {
  type: 'FETCH_OLDER_BARS_RESPONSE';
  payload: FetchOlderBarsResponsePayload;
}

export interface FetchOlderBarsResponsePayload {
  requestId: string;
  seriesGeneration: number;
  bars: OHLCVBar[];
  noData?: boolean;
  error?: string;
}

export interface FetchOlderBarsRequestPayload {
  requestId: string;
  seriesGeneration: number;
  symbol: string;
  resolution: string;
  fromSec: number;
  toSec: number;
  countBack?: number;
  oldestLoadedTimeMs: number;
}

export type InboundMessageType = InboundMessage['type'];

/** Outbound — WebView IIFE → React Native. */
export type OutboundMessageType =
  | 'CHART_READY'
  | 'CHART_LAYOUT_SETTLED'
  | 'CHART_TRADINGVIEW_CLICKED'
  | 'CROSSHAIR_MOVE'
  | 'CHART_INTERACTED'
  | 'INDICATOR_ADDED'
  | 'INDICATOR_REMOVED'
  | 'LEGEND_RENDERED'
  | 'TRADE_MARKER_PRESSED'
  | 'FETCH_OLDER_BARS_REQUEST'
  | 'ERROR'
  | 'DEBUG';

export interface ChartReadyPayload {
  // Reserved — RN reads no fields today but the slot stays open for
  // metadata (e.g. library version) without breaking the contract.
}

export interface ChartLayoutSettledPayload {
  // Same as ChartReadyPayload.
}

export interface ChartTradingViewClickedPayload {
  url?: string;
}

export interface ErrorPayload {
  message: string;
}

export interface DebugPayload {
  message: string;
  [extra: string]: unknown;
}

/**
 * Crosshair OHLC data forwarded from the WebView when the user scrubs over
 * the chart. Shape matches `CrosshairData` in AdvancedChart.types.ts so the
 * RN-side parseWebViewMessage decodes our messages without translation.
 */
export interface CrosshairData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface CrosshairMovePayload {
  /** OHLC of the bar nearest the crosshair; null when the crosshair dismisses. */
  data: CrosshairData | null;
}

export type ChartInteractionType = 'zoom' | 'pan' | 'tooltip';

export interface ChartInteractedPayload {
  interaction_type: ChartInteractionType;
}

export interface IndicatorAddedPayload {
  name: string;
  id: string;
}

export interface IndicatorRemovedPayload {
  name: string;
}

export type LegendRenderedPayload = Record<string, never>;

export interface TradeMarkerPressedPayload {
  id: string;
}

export interface OutboundPayloads {
  CHART_READY: ChartReadyPayload;
  CHART_LAYOUT_SETTLED: ChartLayoutSettledPayload;
  CHART_TRADINGVIEW_CLICKED: ChartTradingViewClickedPayload;
  CROSSHAIR_MOVE: CrosshairMovePayload;
  CHART_INTERACTED: ChartInteractedPayload;
  INDICATOR_ADDED: IndicatorAddedPayload;
  INDICATOR_REMOVED: IndicatorRemovedPayload;
  LEGEND_RENDERED: LegendRenderedPayload;
  TRADE_MARKER_PRESSED: TradeMarkerPressedPayload;
  FETCH_OLDER_BARS_REQUEST: FetchOlderBarsRequestPayload;
  ERROR: ErrorPayload;
  DEBUG: DebugPayload;
}

/** Re-export for callers writing Phase 3 handlers. */
export type { IndicatorName } from '../core/types';

/** Helper for messages/handler.ts — narrows InboundMessage by type tag. */
export type InboundMessageOf<T extends InboundMessageType> = Extract<
  InboundMessage,
  { type: T }
>;

/** Re-exports for consumers that want to import shapes alongside types. */
export type { ChartTheme } from '../core/types';

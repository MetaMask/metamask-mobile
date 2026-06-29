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
//   Phase 5 — SET_TRADE_MARKERS, PULSE_TRADE_MARKER, FOCUS_TIME,
//             TRADE_MARKER_PRESSED
//   Phase 6 — SET_POSITION_LINES, FETCH_OLDER_BARS_REQUEST,
//             FETCH_OLDER_BARS_RESPONSE
//
// Phase 4 deletes SET_LINE_CHROME alongside the custom-chrome implementation.

import type {
  ChartTheme,
  ChartType,
  OHLCVBar,
  OHLCVPaginationConfig,
} from '../core/types';

/** Inbound — React Native → WebView IIFE. */
export type InboundMessage =
  | SetThemeColorsMessage
  | SetOHLCVDataMessage
  | RealtimeUpdateMessage
  | SetChartTypeMessage;

export interface SetThemeColorsMessage {
  type: 'SET_THEME_COLORS';
  payload: SetThemeColorsPayload;
}

export interface SetThemeColorsPayload {
  lineColor?: string;
  successColor?: string;
  errorColor?: string;
  currentPriceColor?: string;
}

export interface SetOHLCVDataMessage {
  type: 'SET_OHLCV_DATA';
  payload: SetOHLCVDataPayload;
}

export interface SetOHLCVDataPayload {
  data: OHLCVBar[];
  pagination?: OHLCVPaginationConfig;
  /** Visible-range start (ms) so the WebView can call setVisibleRange after reset. */
  visibleFromMs?: number;
  /** Visible-range end (ms) anchored to the last candle. */
  visibleToMs?: number;
  /** Optional symbol/vsCurrency for downstream pagination strategies. */
  symbol?: string;
  vsCurrency?: string;
}

export interface RealtimeUpdateMessage {
  type: 'REALTIME_UPDATE';
  payload: { bar: OHLCVBar };
}

export interface SetChartTypeMessage {
  type: 'SET_CHART_TYPE';
  payload: { type: ChartType };
}

export type InboundMessageType = InboundMessage['type'];

/** Outbound — WebView IIFE → React Native. */
export type OutboundMessageType =
  | 'CHART_READY'
  | 'CHART_LAYOUT_SETTLED'
  | 'CHART_TRADINGVIEW_CLICKED'
  | 'CROSSHAIR_MOVE'
  | 'CHART_INTERACTED'
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

export interface CrosshairMovePayload {
  /** OHLC of the bar nearest the crosshair; null when the crosshair dismisses. */
  bar: OHLCVBar | null;
}

export type ChartInteractionType = 'zoom' | 'pan' | 'tooltip';

export interface ChartInteractedPayload {
  interaction_type: ChartInteractionType;
}

export interface OutboundPayloads {
  CHART_READY: ChartReadyPayload;
  CHART_LAYOUT_SETTLED: ChartLayoutSettledPayload;
  CHART_TRADINGVIEW_CLICKED: ChartTradingViewClickedPayload;
  CROSSHAIR_MOVE: CrosshairMovePayload;
  CHART_INTERACTED: ChartInteractedPayload;
  ERROR: ErrorPayload;
  DEBUG: DebugPayload;
}

/** Helper for messages/handler.ts — narrows InboundMessage by type tag. */
export type InboundMessageOf<T extends InboundMessageType> = Extract<
  InboundMessage,
  { type: T }
>;

/** Re-exports for consumers that want to import shapes alongside types. */
export type { ChartTheme };

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

import type { ChartTheme } from '../core/types';

/** Inbound — React Native → WebView IIFE. */
export type InboundMessage = SetThemeColorsMessage;

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

export type InboundMessageType = InboundMessage['type'];

/** Outbound — WebView IIFE → React Native. */
export type OutboundMessageType =
  | 'CHART_READY'
  | 'CHART_LAYOUT_SETTLED'
  | 'CHART_TRADINGVIEW_CLICKED'
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

export interface OutboundPayloads {
  CHART_READY: ChartReadyPayload;
  CHART_LAYOUT_SETTLED: ChartLayoutSettledPayload;
  CHART_TRADINGVIEW_CLICKED: ChartTradingViewClickedPayload;
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

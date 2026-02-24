// ============================================
// OHLCV data types
// ============================================

/**
 * OHLCV bar data structure for TradingView Advanced Charts
 */
export interface OHLCVBar {
  /** Unix timestamp in milliseconds */
  time: number;
  /** Opening price */
  open: number;
  /** Highest price */
  high: number;
  /** Lowest price */
  low: number;
  /** Closing price */
  close: number;
  /** Trading volume */
  volume: number;
}

/**
 * Supported technical indicators
 */
export type IndicatorType = 'MACD' | 'RSI' | 'MA200';

/**
 * Indicator configuration for TradingView studies
 */
export interface IndicatorConfig {
  /** TradingView study name */
  studyName: string;
  /** Default input parameters */
  inputs: Record<string, number | string>;
  /** Visual overrides */
  overrides?: Record<string, string | number>;
}

/**
 * Indicator configurations map
 */
export const INDICATOR_CONFIGS: Record<IndicatorType, IndicatorConfig> = {
  MACD: {
    studyName: 'MACD',
    inputs: {
      in_0: 12, // Fast length
      in_1: 26, // Slow length
      in_2: 9, // Signal smoothing
    },
  },
  RSI: {
    studyName: 'Relative Strength Index',
    inputs: {
      in_0: 14, // Period
    },
  },
  MA200: {
    studyName: 'Moving Average',
    inputs: {
      in_0: 200, // Period
    },
  },
};

/**
 * Position side for long/short position shapes
 */
export type PositionSide = 'long' | 'short';

/**
 * Position lines to render on the chart (Perps-style dashed horizontal lines).
 * Only lines with defined values are rendered.
 */
export interface PositionLines {
  side: PositionSide;
  entryPrice: number;
  takeProfitPrice?: number;
  stopLossPrice?: number;
  liquidationPrice?: number;
}

/**
 * Crosshair OHLC data forwarded from the WebView when the user
 * scrubs over the chart. Mirrors the Perps OhlcData contract.
 */
export interface CrosshairData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

/**
 * Chart type enum matching TradingView SeriesType
 */
export enum ChartType {
  Candles = 1,
  Line = 2,
}

// ============================================
// Message protocol: React Native <-> WebView
// ============================================

export type RNToWebViewMessageType =
  | 'SET_OHLCV_DATA'
  | 'ADD_INDICATOR'
  | 'REMOVE_INDICATOR'
  | 'SET_CHART_TYPE'
  | 'SET_POSITION_LINES'
  | 'REALTIME_UPDATE'
  | 'TOGGLE_VOLUME';

export type WebViewToRNMessageType =
  | 'CHART_READY'
  | 'INDICATOR_ADDED'
  | 'INDICATOR_REMOVED'
  | 'CROSSHAIR_MOVE'
  | 'NEED_MORE_HISTORY'
  | 'ERROR'
  | 'DEBUG';

export interface SetOHLCVDataPayload {
  data: OHLCVBar[];
}

export interface AddIndicatorPayload {
  name: IndicatorType;
}

export interface RemoveIndicatorPayload {
  name: IndicatorType;
}

export interface SetChartTypePayload {
  type: ChartType;
}

export interface SetPositionLinesPayload {
  position: PositionLines | null;
}

export interface RealtimeUpdatePayload {
  bar: OHLCVBar;
}

export interface ToggleVolumePayload {
  visible: boolean;
}

export interface RNToWebViewMessage {
  type: RNToWebViewMessageType;
  payload:
    | SetOHLCVDataPayload
    | AddIndicatorPayload
    | RemoveIndicatorPayload
    | SetChartTypePayload
    | SetPositionLinesPayload
    | RealtimeUpdatePayload
    | ToggleVolumePayload
    | Record<string, never>;
}

export interface IndicatorAddedPayload {
  name: IndicatorType;
  id: string;
}

export interface IndicatorRemovedPayload {
  name: IndicatorType;
}

export interface CrosshairMovePayload {
  data: CrosshairData | null;
}

export interface NeedMoreHistoryPayload {
  oldestTimestamp: number;
}

export interface ErrorPayload {
  message: string;
  code?: string;
}

export interface WebViewToRNMessage {
  type: WebViewToRNMessageType;
  payload:
    | IndicatorAddedPayload
    | IndicatorRemovedPayload
    | CrosshairMovePayload
    | NeedMoreHistoryPayload
    | ErrorPayload
    | Record<string, never>;
}

// ============================================
// Component props and ref
// ============================================

/**
 * Generic AdvancedChart component props.
 *
 * Composable API: each consumer uses only the props it needs.
 * - Token Details: ohlcvData, indicators, chartType
 * - Perps: ohlcvData, positionLines, onRequestMoreHistory, onRealtimeUpdate, onCrosshairMove
 */
export interface AdvancedChartProps {
  /** OHLCV data to display (required) */
  ohlcvData: OHLCVBar[];
  /** Chart height in pixels */
  height?: number;

  /** Latest bar for real-time streaming (Perps). When this changes the WebView receives a tick. */
  realtimeBar?: OHLCVBar;
  /** Called when the user scrolls to the left edge and more history is needed (Perps). */
  onRequestMoreHistory?: () => void;

  /** Active indicators to display (Token Details). Synced declaratively via useEffect. */
  indicators?: IndicatorType[];
  /** Position lines to overlay (Perps). Set to undefined to clear. */
  positionLines?: PositionLines;

  /** Initial chart type */
  chartType?: ChartType;
  /** Show volume bars below the chart */
  showVolume?: boolean;
  /** Enable left-side drawing toolbar */
  enableDrawingTools?: boolean;

  /** Callback when chart is ready */
  onChartReady?: () => void;
  /** Callback when an error occurs */
  onError?: (error: string) => void;
  /** Crosshair OHLC data callback (for overlay legend) */
  onCrosshairMove?: (data: CrosshairData | null) => void;

  /** External loading state */
  isLoading?: boolean;
}

/**
 * Imperative ref handle for AdvancedChart.
 * Use props for declarative control; ref for one-off imperative actions.
 */
export interface AdvancedChartRef {
  addIndicator: (indicator: IndicatorType) => void;
  removeIndicator: (indicator: IndicatorType) => void;
  setChartType: (chartType: ChartType) => void;
  reset: () => void;
}

/**
 * Props for the IndicatorToggle component
 */
export interface IndicatorToggleProps {
  activeIndicators: IndicatorType[];
  onToggle: (indicator: IndicatorType) => void;
  disabled?: boolean;
}

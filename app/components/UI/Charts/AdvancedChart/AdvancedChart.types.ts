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
 * Supported technical indicators.
 *
 * This is a curated subset for the Token Details mobile UX. Consumers that
 * need TradingView's full native study picker can re-enable `header_widget`
 * via the `disabledFeatures` prop override on AdvancedChart.
 */
export type IndicatorType = 'MACD' | 'RSI' | 'MA200';

/**
 * TradingView widget features disabled by default.
 *
 * These defaults are optimized for the Token Details mobile UX: a clean,
 * minimal chart with no header chrome, search, or toolbars. Consumers
 * needing TradingView's native UI (e.g. Perps with full indicator picker,
 * timeframes toolbar, or symbol search) can pass a custom list via the
 * `disabledFeatures` prop to opt back in selectively.
 */
export const DEFAULT_DISABLED_FEATURES: string[] = [
  'use_localstorage_for_settings',
  'header_widget',
  'timeframes_toolbar',
  'edit_buttons_in_legend',
  'control_bar',
  'border_around_the_chart',
  'header_symbol_search',
  'header_settings',
  'header_compare',
  'header_undo_redo',
  'header_screenshot',
  'header_fullscreen_button',
  'legend_context_menu',
  'symbol_search_hot_key',
  'symbol_info',
  'legend_widget',
  'display_market_status',
  'scales_context_menu',
  'pane_context_menu',
  'create_volume_indicator_by_default',
  'main_series_scale_menu',
  'go_to_date',
];

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
  currentPrice?: number;
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
 * Chart type constants matching TradingView SeriesType.
 * Uses as-const object instead of enum to avoid numeric enum pitfalls
 * (reverse lookups, runtime code, opaque values in bridge messages).
 */
export const ChartType = {
  Candles: 1,
  Line: 2,
} as const;

export type ChartType = (typeof ChartType)[keyof typeof ChartType];

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

export type RNToWebViewMessage =
  | { type: 'SET_OHLCV_DATA'; payload: SetOHLCVDataPayload }
  | { type: 'ADD_INDICATOR'; payload: AddIndicatorPayload }
  | { type: 'REMOVE_INDICATOR'; payload: RemoveIndicatorPayload }
  | { type: 'SET_CHART_TYPE'; payload: SetChartTypePayload }
  | { type: 'SET_POSITION_LINES'; payload: SetPositionLinesPayload }
  | { type: 'REALTIME_UPDATE'; payload: RealtimeUpdatePayload }
  | { type: 'TOGGLE_VOLUME'; payload: ToggleVolumePayload };

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

export type WebViewToRNMessage =
  | { type: 'CHART_READY' }
  | { type: 'INDICATOR_ADDED'; payload: IndicatorAddedPayload }
  | { type: 'INDICATOR_REMOVED'; payload: IndicatorRemovedPayload }
  | { type: 'CROSSHAIR_MOVE'; payload: CrosshairMovePayload }
  | { type: 'NEED_MORE_HISTORY'; payload: NeedMoreHistoryPayload }
  | { type: 'ERROR'; payload: ErrorPayload }
  | { type: 'DEBUG' };

// ============================================
// Message parsing / runtime narrowing
// ============================================

const VALID_INDICATOR_NAMES = new Set<string>(['MACD', 'RSI', 'MA200']);

function isIndicatorType(value: unknown): value is IndicatorType {
  return typeof value === 'string' && VALID_INDICATOR_NAMES.has(value);
}

/**
 * Runtime narrower for messages arriving from the WebView over postMessage.
 * Returns a typed WebViewToRNMessage if valid, or null for malformed data.
 */
export function parseWebViewMessage(raw: unknown): WebViewToRNMessage | null {
  if (typeof raw !== 'object' || raw === null) return null;

  const { type, payload } = raw as { type: unknown; payload: unknown };
  if (typeof type !== 'string') return null;

  const obj = (
    typeof payload === 'object' && payload !== null ? payload : {}
  ) as Record<string, unknown>;

  switch (type) {
    case 'CHART_READY':
    case 'DEBUG':
      return { type };

    case 'NEED_MORE_HISTORY':
      return {
        type,
        payload: {
          oldestTimestamp:
            typeof obj.oldestTimestamp === 'number' ? obj.oldestTimestamp : 0,
        },
      };

    case 'INDICATOR_ADDED':
      if (isIndicatorType(obj.name) && typeof obj.id === 'string') {
        return { type, payload: { name: obj.name, id: obj.id } };
      }
      return null;

    case 'INDICATOR_REMOVED':
      if (isIndicatorType(obj.name)) {
        return { type, payload: { name: obj.name } };
      }
      return null;

    case 'CROSSHAIR_MOVE':
      return {
        type,
        payload: {
          data:
            typeof obj.data === 'object' && obj.data !== null
              ? (obj.data as CrosshairData)
              : null,
        },
      };

    case 'ERROR':
      if (typeof obj.message === 'string') {
        return {
          type,
          payload: {
            message: obj.message,
            ...(typeof obj.code === 'string' ? { code: obj.code } : {}),
          },
        };
      }
      return null;

    default:
      return null;
  }
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
  /**
   * TradingView widget features to disable. Defaults to DEFAULT_DISABLED_FEATURES
   * (a curated mobile-friendly set). Pass a custom array to re-enable native
   * TradingView capabilities like header_widget, timeframes_toolbar, etc.
   */
  disabledFeatures?: string[];

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

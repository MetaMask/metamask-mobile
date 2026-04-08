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
 * Any TradingView study name is accepted. The three presets ('MACD', 'RSI',
 * 'MA200') get built-in parameter defaults in chartLogic.js; all other strings
 * are forwarded to `createStudy` as-is with optional `inputs` from the payload.
 */
export type IndicatorType = string;

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
  'property_pages',
  'show_chart_property_page',
  'chart_property_page_background',
  'main_series_scale_menu',
  'popup_hints',
  'pane_context_menu',
  'create_volume_indicator_by_default',
  'go_to_date',
  'show_zoom_and_move_buttons_on_touch',
  'shift_visible_range_on_new_bar',
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

/**
 * Line / chart chrome for the TradingView WebView.
 *
 * When a `useCustom*` flag is **false**, TradingView built-ins apply where relevant
 * (`showSeriesLastValue`, `showPriceLine`, scale crosshair labels). When **true**, MetaMask uses
 * custom drawings/DOM instead and disables the TV equivalent to avoid duplicates.
 */
export interface LineChromeOptions {
  /** When true, hide the time-axis row (line chart only). */
  hideTimeScale?: boolean;
  /** When true, draw the line-end marker via the Drawing API (line chart only). */
  useCustomLineEndMarker?: boolean;
  /** When true, draw the dashed last-price guide with `horizontal_line` shapes (candles + line). */
  useCustomDashedLastPriceLine?: boolean;
  /**
   * When true, custom DOM for last-close pill, visible-edge outline pill, and crosshair price/time
   * labels. When false, TV scale last value and crosshair labels are enabled.
   */
  useCustomPriceLabels?: boolean;
}

/** Default `lineChrome` when props omit fields; merged by `resolveLineChromeOptions`. */
export const DEFAULT_LINE_CHROME = {
  hideTimeScale: false,
  useCustomLineEndMarker: true,
  useCustomDashedLastPriceLine: true,
  useCustomPriceLabels: true,
} as const;

export type ResolvedLineChromeOptions = {
  [K in keyof typeof DEFAULT_LINE_CHROME]: boolean;
};

/**
 * Fills omitted `lineChrome` fields with `DEFAULT_LINE_CHROME`. Used for inline CONFIG and for
 * `SET_LINE_CHROME` payloads (always the full resolved object).
 */
export function resolveLineChromeOptions(
  partial?: LineChromeOptions | null,
): ResolvedLineChromeOptions {
  return {
    hideTimeScale: partial?.hideTimeScale ?? DEFAULT_LINE_CHROME.hideTimeScale,
    useCustomLineEndMarker:
      partial?.useCustomLineEndMarker ??
      DEFAULT_LINE_CHROME.useCustomLineEndMarker,
    useCustomDashedLastPriceLine:
      partial?.useCustomDashedLastPriceLine ??
      DEFAULT_LINE_CHROME.useCustomDashedLastPriceLine,
    useCustomPriceLabels:
      partial?.useCustomPriceLabels ?? DEFAULT_LINE_CHROME.useCustomPriceLabels,
  };
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
  | 'ERROR'
  | 'DEBUG';

export interface OHLCVPaginationConfig {
  nextCursor: string | null;
  hasMore: boolean;
  assetId: string;
  vsCurrency: string;
}

export interface SetOHLCVDataPayload {
  data: OHLCVBar[];
  /** When provided, the WebView fetches older pages directly instead of round-tripping via RN. */
  pagination?: OHLCVPaginationConfig;
}

export interface AddIndicatorPayload {
  name: IndicatorType;
  /** Custom TradingView study inputs (e.g. { in_0: 14 }). Used for non-preset studies. */
  inputs?: Record<string, unknown>;
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
  /** When true, volume on main pane + `no-scale`. Omitted/false = classic second pane (default). */
  volumeOverlay?: boolean;
}

export type SetLineChromePayload = ResolvedLineChromeOptions;

export type RNToWebViewMessage =
  | { type: 'SET_OHLCV_DATA'; payload: SetOHLCVDataPayload }
  | { type: 'ADD_INDICATOR'; payload: AddIndicatorPayload }
  | { type: 'REMOVE_INDICATOR'; payload: RemoveIndicatorPayload }
  | { type: 'SET_CHART_TYPE'; payload: SetChartTypePayload }
  | { type: 'SET_LINE_CHROME'; payload: SetLineChromePayload }
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

export type ChartInteractionType = 'zoom' | 'pan' | 'tooltip';

export interface ChartInteractedPayload {
  interaction_type: ChartInteractionType;
}

export interface ErrorPayload {
  message: string;
  code?: string;
}

export type WebViewToRNMessage =
  | { type: 'CHART_READY' }
  | { type: 'CHART_LAYOUT_SETTLED' }
  | { type: 'INDICATOR_ADDED'; payload: IndicatorAddedPayload }
  | { type: 'INDICATOR_REMOVED'; payload: IndicatorRemovedPayload }
  | { type: 'CROSSHAIR_MOVE'; payload: CrosshairMovePayload }
  | { type: 'CHART_INTERACTED'; payload: ChartInteractedPayload }
  | { type: 'CHART_TRADINGVIEW_CLICKED'; payload?: { url?: string } }
  | { type: 'ERROR'; payload: ErrorPayload }
  | { type: 'DEBUG'; payload: { message: string } };

// ============================================
// Message parsing / runtime narrowing
// ============================================

function isIndicatorType(value: unknown): value is IndicatorType {
  return typeof value === 'string' && value.length > 0;
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
      return { type };

    case 'CHART_LAYOUT_SETTLED':
      return { type };

    case 'DEBUG':
      return {
        type,
        payload: {
          message: typeof obj.message === 'string' ? obj.message : String(obj),
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

    case 'CHART_INTERACTED':
      if (
        obj.interaction_type === 'zoom' ||
        obj.interaction_type === 'pan' ||
        obj.interaction_type === 'tooltip'
      ) {
        return {
          type,
          payload: {
            interaction_type: obj.interaction_type,
          },
        };
      }
      return null;

    case 'CHART_TRADINGVIEW_CLICKED':
      return {
        type,
        payload: {
          ...(typeof obj.url === 'string' ? { url: obj.url } : {}),
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
 * - Token Details: ohlcvData, ohlcvPagination, indicators, chartType
 */
export interface AdvancedChartProps {
  /** OHLCV data to display (required) */
  ohlcvData: OHLCVBar[];
  /**
   * When set, any change forces a full `SET_OHLCV_DATA` sync instead of the length/last-bar
   * heuristic (which can mis-classify a new range as `REALTIME_UPDATE` when bar counts match).
   * Example: `${assetId}|${timePeriod}|${interval}|${currency}`.
   */
  ohlcvSeriesKey?: string;
  /** Chart height in pixels */
  height?: number;

  /** Latest bar for real-time streaming. When this changes the WebView receives a tick. */
  realtimeBar?: OHLCVBar;
  /**
   * Pagination config for WebView-side direct fetching. The WebView's datafeed
   * fetches older pages from the Price API directly in `getBars` using the cursor,
   * without round-tripping through RN.
   */
  ohlcvPagination?: OHLCVPaginationConfig;

  /** Active indicators to display (Token Details). Synced declaratively via useEffect. */
  indicators?: IndicatorType[];
  /** Position lines to overlay (Perps). Set to undefined to clear. */
  positionLines?: PositionLines;

  /** Initial chart type */
  chartType?: ChartType;
  /** Show volume bars below the chart */
  showVolume?: boolean;
  /**
   * Put volume on the main pane (single crosshair). Default is two panes (price + volume).
   * Ignored when `showVolume` is false.
   */
  volumeOverlay?: boolean;
  /** Enable left-side drawing toolbar */
  enableDrawingTools?: boolean;
  /**
   * TradingView widget features to disable. Defaults to DEFAULT_DISABLED_FEATURES
   * (a curated mobile-friendly set). Pass a custom array to re-enable native
   * TradingView capabilities like header_widget, timeframes_toolbar, etc.
   */
  disabledFeatures?: string[];

  /**
   * Line / chart chrome: time axis, custom line-end marker, dashed last-price drawing, custom
   * price/crosshair labels vs TV built-ins. Omitted fields use `DEFAULT_LINE_CHROME`. After
   * `CHART_READY`, RN sends `SET_LINE_CHROME` with `resolveLineChromeOptions(lineChrome)`.
   */
  lineChrome?: LineChromeOptions;

  /** Callback when chart is ready */
  onChartReady?: () => void;
  /** Callback when an error occurs */
  onError?: (error: string) => void;
  /** Crosshair OHLC data callback (for overlay legend) */
  onCrosshairMove?: (data: CrosshairData | null) => void;
  /**
   * User-driven chart interaction from the WebView: zoom (bar spacing), pan (visible range), or
   * crosshair tooltip (first OHLC payload per crosshair session). Suppressed during data reloads.
   */
  onChartInteracted?: (payload: ChartInteractedPayload) => void;
  /**
   * WebView is about to navigate to tradingview.com (e.g. user tapped attribution logo).
   * Native layer opens the URL in the system browser and cancels in-WebView navigation.
   */
  onChartTradingViewClicked?: () => void;

  /**
   * When true, keeps the native skeleton overlay on top of the WebView (in addition to
   * while the chart is not yet `CHART_READY`). Cleared when set false and the chart is ready.
   */
  isLoading?: boolean;
}

/**
 * Imperative ref handle for AdvancedChart.
 * Use props for declarative control; ref for one-off imperative actions.
 */
export interface AdvancedChartRef {
  addIndicator: (
    indicator: IndicatorType,
    inputs?: Record<string, unknown>,
  ) => void;
  removeIndicator: (indicator: IndicatorType) => void;
  setChartType: (chartType: ChartType) => void;
  reset: () => void;
}

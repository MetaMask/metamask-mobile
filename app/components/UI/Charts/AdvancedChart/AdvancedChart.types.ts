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
  'display_market_status',
  'scales_context_menu',
  'property_pages',
  'show_chart_property_page',
  'chart_property_page_background',
  'main_series_scale_menu',
  'popup_hints',
  'pane_context_menu',
  'create_volume_indicator_by_default',
  'show_hide_button_in_legend',
  'go_to_date',
  'show_zoom_and_move_buttons_on_touch',
  'shift_visible_range_on_new_bar',
  // Disable vertical touch drag in chart so webpage can scroll vertically
  'vert_touch_drag_scroll',
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
  entryPrice?: number;
  currentPrice?: number;
  takeProfitPrice?: number;
  stopLossPrice?: number;
  liquidationPrice?: number;
}

/**
 * A point marker rendered on the chart at an exact `(time, price)` using the
 * Drawing API circle icon. Used to surface trade entries/exits (e.g. Social
 * Trading open/close circles). `intent` selects the color: `'enter'` → success
 * (green), `'exit'` → error (red).
 *
 * `price` is optional. When omitted, the WebView snaps the marker's Y to the
 * interpolated close of the rendered line at `time`. When provided it is used
 * only as a fallback for trades whose candle is outside the currently-loaded
 * data window (the WebView's `interpolateCloseAlongLineAtTimeMs` always takes
 * precedence when it yields a finite value).
 */
export interface TradeMarker {
  /** Unix timestamp in **milliseconds** (matches OHLCVBar.time). */
  time: number;
  /**
   * Optional Y anchor. Omit to let the WebView snap to the line automatically.
   * Only used as a fallback when the trade's candle is outside loaded data.
   */
  price?: number;
  /** `'enter'` = buy/open (green); `'exit'` = sell/close (red). */
  intent: 'enter' | 'exit';
  /** Stable id used as the React key and to track the created shape entity. */
  id: string;
}

/**
 * Colors for the position overlay lines, supplied by the consumer from its own
 * theme. Position lines are consumer-specific (currently Perps only), so the
 * colors are passed in rather than read from the shared chart `CONFIG.theme`.
 */
export interface PositionLineColors {
  currentPrice?: string;
  entry: string;
  takeProfit: string;
  stopLoss: string;
  liquidation: string;
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

export type ChartRangeSettlePayload = undefined;

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
 * Omitted props resolve via {@link DEFAULT_LINE_CHROME} (built-in-first). When a `useCustom*`
 * flag is **false**, TradingView built-ins apply where relevant (`showSeriesLastValue`,
 * `showPriceLine`, scale crosshair labels). When **true**, MetaMask uses custom drawings/DOM
 * instead and disables the TV equivalent to avoid duplicates.
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
  useCustomLineEndMarker: false,
  useCustomDashedLastPriceLine: false,
  useCustomPriceLabels: false,
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

/** Matches template + `SET_THEME_COLORS` resolution for `theme.currentPriceColor`. */
export function resolveCurrentPriceColor(options: {
  lastValuePillColor?: string;
  currentPriceLineColorOverride?: string;
  lineColorOverride?: string;
  successColorOverride?: string;
  themeSuccessDefault: string;
}): string {
  const effectiveSuccessColor =
    options.successColorOverride ?? options.themeSuccessDefault;
  const effectiveLineColor = options.lineColorOverride ?? effectiveSuccessColor;
  return (
    options.lastValuePillColor ??
    options.currentPriceLineColorOverride ??
    effectiveLineColor
  );
}

export type RNToWebViewMessageType =
  | 'SET_OHLCV_DATA'
  | 'ADD_INDICATOR'
  | 'REMOVE_INDICATOR'
  | 'SET_CHART_TYPE'
  | 'SET_LINE_CHROME'
  | 'SET_SUB_PANE_LAYOUT'
  | 'SET_POSITION_LINES'
  | 'SET_TRADE_MARKERS'
  | 'REALTIME_UPDATE'
  | 'TOGGLE_VOLUME'
  | 'SET_MA_VISIBILITY'
  | 'SET_THEME_COLORS'
  | 'FOCUS_TIME'
  | 'PULSE_TRADE_MARKER'
  | 'FETCH_OLDER_BARS_RESPONSE';

export type WebViewToRNMessageType =
  | 'CHART_READY'
  | 'CHART_LAYOUT_SETTLED'
  | 'INDICATOR_ADDED'
  | 'INDICATOR_REMOVED'
  | 'LEGEND_RENDERED'
  | 'CROSSHAIR_MOVE'
  | 'TRADE_MARKER_PRESSED'
  | 'ERROR'
  | 'DEBUG'
  | 'FETCH_OLDER_BARS_REQUEST';

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
  /**
   * When enabled, the WebView sends FETCH_OLDER_BARS_REQUEST to RN for older history instead
   * of fetching the Price API directly. Used by Perps whose candle data comes from PerpsController.
   */
  rnBackedPagination?: { enabled: boolean };
  /**
   * Expected visible-range start as a Unix timestamp in **milliseconds**.
   * When set, the WebView calls `chart.setVisibleRange()` after `resetData()`
   * so only the requested period (1H, 1D, 1W, 1M, 1Y) is shown initially —
   * the user can still scroll left to reveal older data fetched via pagination.
   */
  visibleFromMs?: number;
  /**
   * Expected visible-range end as a Unix timestamp in **milliseconds** (typically `lastBar.time`).
   * Used with `visibleFromMs` so the TradingView `timeframe` constructor option spans exactly
   * the intended window instead of defaulting to `Date.now()`.
   */
  visibleToMs?: number;
  /**
   * SocialLeaderboard (Social Trading) scoping flag. When true, the WebView runs
   * the SLB-only viewport behavior; omitted/false for other consumers. See
   * {@link AdvancedChartProps.slbMode}.
   */
  slbMode?: boolean;
}

/**
 * Payload sent from the WebView to RN when TradingView's getBars needs bars
 * older than the current window. RN fetches from the appropriate data source
 * (e.g. Perps candle channel) and responds with FETCH_OLDER_BARS_RESPONSE.
 */
export interface FetchOlderBarsRequest {
  requestId: string;
  seriesGeneration: number;
  symbol: string;
  resolution: string;
  fromSec: number;
  toSec: number;
  countBack?: number;
  oldestLoadedTimeMs: number;
}

/**
 * RN response to a FETCH_OLDER_BARS_REQUEST. The WebView merges returned bars
 * into window.ohlcvData and resolves the pending getBars callback.
 */
export interface FetchOlderBarsResponse {
  requestId: string;
  seriesGeneration: number;
  bars: OHLCVBar[];
  noData?: boolean;
  error?: string;
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
  /** Consumer-supplied colors for the overlay lines. Falls back to defaults if absent. */
  positionLineColors?: PositionLineColors;
}

export interface SetTradeMarkersPayload {
  /** Markers to render. Empty array (or null) clears all existing markers. */
  markers: TradeMarker[] | null;
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

/**
 * When `heightRatio` is a number in (0, 1], RSI/MACD sub-panes use that fraction of total
 * chart height each (via `setAllPanesHeight`). When `null` or omitted, TradingView default
 * pane sizing applies.
 */
export interface SetSubPaneLayoutPayload {
  heightRatio: number | null;
}

export interface SetMAVisibilityPayload {
  visible: string[];
}

export interface SetThemeColorsPayload {
  lineColor: string;
  successColor: string;
  errorColor: string;
  /** Last-value scale pill and native price line (ambient on token details). */
  currentPriceColor?: string;
  volumeSuccessColor: string;
  volumeErrorColor: string;
}

/**
 * Optional overrides for TV built-in scale / crosshair / last-value label colors.
 * Omitted fields use design tokens baked into the WebView CONFIG at template time.
 */
export interface ChartLabelStyleOverrides {
  /** Crosshair price/time pill background (default: `background.section`). */
  crosshairBackgroundColor?: string;
  /** Crosshair pill text for custom DOM labels only. TV built-ins share `axisTextColor`. */
  crosshairTextColor?: string;
  /** Last-value scale pill + native price line (default: `currentPriceLineColorOverride` → line color). */
  lastValuePillColor?: string;
  /** Price/time scale tick labels (`scalesProperties.textColor`; default: `text.muted`). */
  axisTextColor?: string;
  /** Custom study legend value text (default: `text.alternative`). */
  legendTextColor?: string;
}

export interface FocusTimePayload {
  /** Center the viewport on this point in time (Unix timestamp in **milliseconds**). */
  timeMs: number;
  /**
   * Visible span (ms) to apply while centering. Omitted → keep the current zoom
   * so the chart simply slides to the point at the same scale.
   */
  spanMs?: number;
  /** Smoothly animate the scroll (default `true`); `false` jumps instantly. */
  animate?: boolean;
}

export interface PulseTradeMarkerPayload {
  /** `id` of the trade marker to pulse (matches {@link TradeMarker.id}). No-op if not found. */
  id: string;
}

export type RNToWebViewMessage =
  | { type: 'SET_OHLCV_DATA'; payload: SetOHLCVDataPayload }
  | { type: 'ADD_INDICATOR'; payload: AddIndicatorPayload }
  | { type: 'REMOVE_INDICATOR'; payload: RemoveIndicatorPayload }
  | { type: 'SET_CHART_TYPE'; payload: SetChartTypePayload }
  | { type: 'SET_LINE_CHROME'; payload: SetLineChromePayload }
  | { type: 'SET_SUB_PANE_LAYOUT'; payload: SetSubPaneLayoutPayload }
  | { type: 'SET_POSITION_LINES'; payload: SetPositionLinesPayload }
  | { type: 'SET_TRADE_MARKERS'; payload: SetTradeMarkersPayload }
  | { type: 'REALTIME_UPDATE'; payload: RealtimeUpdatePayload }
  | { type: 'TOGGLE_VOLUME'; payload: ToggleVolumePayload }
  | { type: 'SET_MA_VISIBILITY'; payload: SetMAVisibilityPayload }
  | { type: 'SET_THEME_COLORS'; payload: SetThemeColorsPayload }
  | { type: 'FOCUS_TIME'; payload: FocusTimePayload }
  | { type: 'PULSE_TRADE_MARKER'; payload: PulseTradeMarkerPayload }
  | { type: 'FETCH_OLDER_BARS_RESPONSE'; payload: FetchOlderBarsResponse };

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

export interface TradeMarkerPressedPayload {
  /** `id` of the tapped trade marker (matches {@link TradeMarker.id}). */
  id: string;
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
  | { type: 'LEGEND_RENDERED' }
  | { type: 'CROSSHAIR_MOVE'; payload: CrosshairMovePayload }
  | { type: 'TRADE_MARKER_PRESSED'; payload: TradeMarkerPressedPayload }
  | { type: 'CHART_INTERACTED'; payload: ChartInteractedPayload }
  | { type: 'CHART_TRADINGVIEW_CLICKED'; payload?: { url?: string } }
  | { type: 'ERROR'; payload: ErrorPayload }
  | { type: 'DEBUG'; payload: { message: string } }
  | { type: 'FETCH_OLDER_BARS_REQUEST'; payload: FetchOlderBarsRequest };

// ============================================
// Message parsing / runtime narrowing
// ============================================

function isIndicatorType(value: unknown): value is IndicatorType {
  return typeof value === 'string' && value.length > 0;
}

/**
 * Reads a finite numeric field from a parsed postMessage payload.
 * Returns the number, or `undefined` if the field is missing or not a finite number.
 */
function getOptionalNumber(
  obj: Record<string, unknown>,
  key: string,
): number | undefined {
  const value = obj[key];
  return typeof value === 'number' && Number.isFinite(value)
    ? value
    : undefined;
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

    case 'LEGEND_RENDERED':
      return { type };

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

    case 'TRADE_MARKER_PRESSED':
      if (typeof obj.id === 'string' && obj.id.length > 0) {
        return { type, payload: { id: obj.id } };
      }
      return null;

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

    case 'FETCH_OLDER_BARS_REQUEST': {
      const requestId =
        typeof obj.requestId === 'string' ? obj.requestId : null;
      const seriesGeneration = getOptionalNumber(obj, 'seriesGeneration');
      const symbol = typeof obj.symbol === 'string' ? obj.symbol : '';
      const resolution =
        typeof obj.resolution === 'string' ? obj.resolution : '';
      const fromSec = getOptionalNumber(obj, 'fromSec');
      const toSec = getOptionalNumber(obj, 'toSec');
      const oldestLoadedTimeMs = getOptionalNumber(obj, 'oldestLoadedTimeMs');
      if (
        requestId === null ||
        seriesGeneration === undefined ||
        fromSec === undefined ||
        toSec === undefined ||
        oldestLoadedTimeMs === undefined
      ) {
        return null;
      }
      return {
        type,
        payload: {
          requestId,
          seriesGeneration,
          symbol,
          resolution,
          fromSec,
          toSec,
          ...(getOptionalNumber(obj, 'countBack') !== undefined
            ? { countBack: getOptionalNumber(obj, 'countBack') }
            : {}),
          oldestLoadedTimeMs,
        },
      };
    }

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
  /**
   * Stable React `key` for the WebView document (technical-indicators path only). Remount only
   * when this changes (e.g. asset or currency). Omit for legacy behavior: remount on
   * `ohlcvSeriesKey` change. Interval/time-range hot reload requires this prop.
   */
  webViewInstanceKey?: string;
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
  /**
   * When enabled, the WebView sends FETCH_OLDER_BARS_REQUEST to RN for older bars
   * instead of fetching the Price API directly. Use for data sources (e.g. Perps)
   * that are only accessible from RN, not from the WebView.
   */
  rnBackedPagination?: { enabled: boolean };
  /**
   * Handler for FETCH_OLDER_BARS_REQUEST messages from the WebView.
   * RN should fetch older bars from the appropriate source and resolve with OHLCVBars.
   * Only called when rnBackedPagination.enabled is true.
   */
  onFetchOlderBarsRequest?: (
    req: FetchOlderBarsRequest,
  ) => Promise<FetchOlderBarsResponse>;

  /** Active indicators to display (Token Details). Synced declaratively via useEffect. */
  indicators?: IndicatorType[];
  /** Selected MA names (e.g. ['MA5', 'MA10']). Sent as a single SET_MA_VISIBILITY batch message. */
  selectedMAs?: string[];
  /** Position lines to overlay (Perps). Set to undefined to clear. */
  positionLines?: PositionLines;
  /**
   * Trade markers (open/close circles) to overlay at exact `(time, price)`
   * points — e.g. Social Trading entries/exits. Set to undefined or an empty
   * array to clear. Synced declaratively via useEffect.
   */
  tradeMarkers?: TradeMarker[];
  /** Colors for the position overlay lines, supplied by the consumer's theme. */
  positionLineColors?: PositionLineColors;

  /** Initial chart type */
  chartType?: ChartType;
  /** Show volume bars below the chart */
  showVolume?: boolean;
  /**
   * Put volume on the main pane (single crosshair). Default is two panes (price + volume).
   * Ignored when `showVolume` is false.
   */
  volumeOverlay?: boolean;
  /**
   * Hide TradingView's pane separator. Intended for Perps' two-pane price/volume layout;
   * leave unset for Token Details so indicator panes keep their native drawer chrome.
   */
  hidePaneSeparator?: boolean;
  /**
   * Override TradingView grid line color. Defaults to transparent to preserve Token Details.
   */
  gridLineColorOverride?: string;
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

  /**
   * Fraction of total chart height for each RSI/MACD sub-pane (0–1). Omit or pass `null` for
   * TradingView default pane sizing. With two sub-panes active, bottom area ≈ 2× this value.
   */
  subPaneHeightRatio?: number | null;

  /**
   * When true, TV built-in price scale + last-value pill use MetaMask subscript notation for tiny
   * prices (`custom_formatters.priceFormatterFactory`). Default false (TV decimals). Does not
   * affect custom DOM pills when `lineChrome.useCustomPriceLabels` is true.
   */
  useSubscriptPriceFormat?: boolean;

  /** Callback when chart is ready */
  onChartReady?: () => void;
  /**
   * Fires once when the native skeleton overlay is removed (chart ready, layout settled,
   * and parent `isLoading` false). Resets when `webViewInstanceKey` or chart HTML reloads.
   */
  onSkeletonHidden?: () => void;
  /**
   * Fires when the WebView posts `CHART_LAYOUT_SETTLED` after OHLCV scale/layout apply.
   * Used by Token Details (technical-indicators path) to complete interval visibility traces
   * after first reveal — `onSkeletonHidden` only runs once per WebView session.
   */
  onChartLayoutSettled?: () => void;
  /** Callback when an error occurs */
  onError?: (error: string) => void;
  /**
   * Pre-`CHART_READY` failure (CDN, library boot, widget init). When set, AdvancedChart
   * skips its error UI and delegates to the parent (e.g. legacy chart fallback).
   */
  onInitFailed?: (error: string) => void;
  /** Crosshair OHLC data callback (for overlay legend) */
  onCrosshairMove?: (data: CrosshairData | null) => void;
  /**
   * Fired when the user taps a trade marker (open/close circle) on the chart.
   * Receives the marker's `id` (matches {@link TradeMarker.id}). Powers the
   * reverse interaction: tapping a circle scrolls the trades list to that trade.
   */
  onTradeMarkerPress?: (id: string) => void;
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

  /**
   * Expected visible-range start (Unix ms). After data loads the WebView constrains
   * the viewport to `[visibleFromMs, lastBarTime]` via `chart.setVisibleRange()`.
   * The user can still scroll left to reveal older/paginated data.
   */
  visibleFromMs?: number;

  /**
   * Expected visible-range end (Unix ms), typically `lastBar.time`.
   * Used with `visibleFromMs` so the TradingView `timeframe` constructor option
   * spans exactly the intended window (e.g. 24 h) rather than `Date.now()`,
   * which can be ahead of the last candle and push the left edge off-screen.
   */
  visibleToMs?: number;

  /** Override the chart line color baked into the HTML template (A/B test). */
  lineColorOverride?: string;
  /** Override the candlestick up/success color baked into the HTML template (A/B test). */
  successColorOverride?: string;
  /** Override the candlestick down/error color baked into the HTML template (A/B test). */
  errorColorOverride?: string;
  /**
   * Override last-value scale pill + native price line color independently of `lineColorOverride`.
   * Omitted → follows `lineColorOverride` (or success green). Hot-swapped via `SET_THEME_COLORS`.
   */
  currentPriceLineColorOverride?: string;
  /** Override the volume up color. Does not affect candle colors. */
  volumeSuccessColorOverride?: string;
  /** Override the volume down color. Does not affect candle colors. */
  volumeErrorColorOverride?: string;

  /**
   * Optional TV built-in label colors. Omitted fields use theme tokens from the active
   * appearance (`background.section`, `text.default`, `text.muted`).
   */
  labelStyleOverrides?: ChartLabelStyleOverrides;

  /**
   * Opt-in custom DOM legend overlay. When provided with `enabled: true`,
   * the native TradingView legend is hidden and a custom overlay renders
   * indicator labels/values with the specified colors and abbreviations.
   * When omitted or `enabled: false`, the native TV legend is used as-is.
   */
  legendOverlay?: LegendOverlayConfig;

  /**
   * When true, the chart surface stops capturing touches (`pointerEvents="none"`)
   * so gestures fall through to whatever scrolls behind it. Used when the chart is
   * pinned as a scroll-linked overlay (e.g. Trader Position): once pinned, drags on
   * the chart must scroll the list underneath rather than pan the WebView.
   */
  scrollPassthrough?: boolean;

  /**
   * SocialLeaderboard (Social Trading) scoping flag. When true, the WebView runs
   * the SLB-only viewport behavior (frame-the-trades centering, back-fill
   * pagination, full-window focus guard); when false/omitted, the chart uses the
   * default code paths. This is a temporary team name-scope so SLB behavior can't
   * affect other consumers (Token Details, Perps) while the chart logic is shared
   * in one file. Only `TraderAdvancedChart` sets it.
   */
  slbMode?: boolean;
}

export interface LegendPlotConfig {
  tvTitle: string;
  label: string;
  color: string | null;
}

export interface LegendIndicatorConfig {
  plots: LegendPlotConfig[];
  isMA?: boolean;
  useIndex?: boolean;
  /** Render all plots in a single pill (e.g. BB(20,2) U:… M:… L:…). */
  combineInOnePill?: boolean;
  /** Leading title when combineInOnePill is true (e.g. BB(20,2)). */
  title?: string;
}

export interface LegendOverlayConfig {
  enabled: boolean;
  config: Record<string, LegendIndicatorConfig>;
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
  /**
   * Slide the viewport so `timeMs` (Unix ms) is centered. By default keeps the
   * current zoom and animates; pass `spanMs` to set the zoom and `animate: false`
   * to jump. No-op until the chart is ready.
   */
  focusTime: (
    timeMs: number,
    options?: { spanMs?: number; animate?: boolean },
  ) => void;
  /**
   * Briefly pulse the trade marker with this `id` (matches {@link TradeMarker.id})
   * to draw attention to it. No-op if no such marker exists or the chart isn't ready.
   */
  pulseTradeMarker: (id: string) => void;
}

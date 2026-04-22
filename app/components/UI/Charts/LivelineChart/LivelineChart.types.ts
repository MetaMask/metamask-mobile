/**
 * Types for the LivelineChart React Native wrapper.
 *
 * These mirror the public API of the upstream `liveline@0.0.7` package.
 * liveline is installed as a devDependency (build-time only); at runtime the
 * pre-built IIFE bundle embedded in LivelineChartAssets.ts is used.
 *
 * When upgrading liveline:
 * 1. Bump the version in package.json devDependencies
 * 2. Run `yarn build:liveline-webview` to rebuild LivelineChartAssets.ts
 * 3. Cross-check types against the new dist/index.d.ts
 */

// ---- Upstream data types (mirror liveline@0.0.7) ----

export interface LivelinePoint {
  /** Unix timestamp in seconds */
  time: number;
  value: number;
}

export interface CandlePoint {
  /** Unix timestamp in seconds — candle open time */
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface LivelineSeries {
  id: string;
  data: LivelinePoint[];
  value: number;
  color: string;
  label?: string;
}

export interface ReferenceLine {
  value: number;
  label?: string;
}

export interface HoverPoint {
  time: number;
  value: number;
  x: number;
  y: number;
}

export interface Padding {
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
}

export interface WindowOption {
  label: string;
  secs: number;
}

export interface OrderbookData {
  bids: [number, number][];
  asks: [number, number][];
}

export interface DegenOptions {
  /** Multiplier for particle count and size (default 1) */
  scale?: number;
  /** Show particles on down-momentum swings (default false) */
  downMomentum?: boolean;
}

export type Momentum = 'up' | 'down' | 'flat';
export type BadgeVariant = 'default' | 'minimal';
export type ThemeMode = 'light' | 'dark';
export type WindowStyle = 'default' | 'rounded' | 'text';

// ---- Component props ----

/**
 * Props for the React Native LivelineChart wrapper.
 *
 * Mirrors the upstream `LivelineProps` API from `liveline@0.0.7`, with the
 * following differences:
 *
 * - `height` — container height in logical pixels (RN-only, default 250)
 * - `onChartReady` — fires once the WebView has mounted and rendered (RN-only)
 * - `onError` — fires on WebView or chart errors (RN-only)
 * - `formatValue` / `formatTime` — accept serialised JS function body strings
 * instead of real functions, because functions cannot cross the RN ↔ WebView
 * JSON bridge. Reconstructed in the WebView via `new Function(...)`.
 * @example formatValue="return v.toFixed(2) + '%'"
 *
 * All other upstream props are forwarded as-is. Callback props (`onHover`,
 * `onWindowChange`, `onModeChange`, `onSeriesToggle`) are bridged back to RN
 * via the WebView message protocol.
 */
export interface LivelineChartProps {
  // -- Data --
  data: LivelinePoint[];
  value: number;

  // -- Multi-series --
  series?: LivelineSeries[];

  // -- Appearance --
  color?: string;
  lineWidth?: number;
  // theme?: ThemeMode; -- not used

  // -- Feature flags --
  grid?: boolean;
  badge?: boolean;
  badgeTail?: boolean;
  badgeVariant?: BadgeVariant;
  momentum?: boolean | Momentum;
  fill?: boolean;
  loading?: boolean;
  paused?: boolean;
  emptyText?: string;
  scrub?: boolean;
  exaggerate?: boolean;
  showValue?: boolean;
  valueMomentumColor?: boolean;
  degen?: boolean | DegenOptions;
  pulse?: boolean;

  // -- Time window --
  window?: number;
  windows?: WindowOption[];
  onWindowChange?: (secs: number) => void;
  windowStyle?: WindowStyle;

  // -- Crosshair --
  tooltipY?: number;
  tooltipOutline?: boolean;
  cursor?: string;

  // -- Reference line --
  referenceLine?: ReferenceLine;

  // -- Orderbook --
  orderbook?: OrderbookData;

  // -- Hover callback --
  onHover?: (point: HoverPoint | null) => void;

  // -- Layout / animation --
  padding?: Padding;
  lerpSpeed?: number;

  // -- Multi-series visibility --
  hiddenSeriesIds?: string[];
  onSeriesToggle?: (id: string, visible: boolean) => void;
  seriesToggleCompact?: boolean;

  // -- Candlestick mode --
  mode?: 'line' | 'candle';
  candles?: CandlePoint[];
  candleWidth?: number;
  liveCandle?: CandlePoint;
  lineMode?: boolean;
  lineData?: LivelinePoint[];
  lineValue?: number;
  onModeChange?: (mode: 'line' | 'candle') => void;

  // -- Formatting (serialised function bodies, not real functions) --
  formatValue?: string;
  formatTime?: string;

  // -- RN-only --
  /** Container height in logical pixels. @default 250 */
  height?: number;
  /** Fired once the WebView has initialised and the chart is ready. */
  onChartReady?: () => void;
  /** Fired on WebView load errors or chart runtime errors. */
  onError?: (message: string) => void;
}

// ---- WebView ↔ RN message protocol ----

/**
 * Single message type sent from React Native → WebView.
 * The full props snapshot is sent on every change; the WebView calls
 * `root.render(createElement(Liveline, props))` on receipt.
 *
 * Callback props (onHover, onWindowChange, onModeChange, onSeriesToggle) are
 * omitted — they cannot cross the JSON bridge and are wired inside the WebView,
 * posting messages back to RN instead.
 */
export interface RNToWebViewMessage {
  type: 'SET_PROPS';
  payload: Omit<
    LivelineChartProps,
    | 'height'
    | 'onChartReady'
    | 'onError'
    | 'onHover'
    | 'onWindowChange'
    | 'onModeChange'
    | 'onSeriesToggle'
  >;
}

/** Messages sent from WebView → React Native. */
export type WebViewToRNMessage =
  | { type: 'CHART_READY' }
  | { type: 'ERROR'; payload: { message: string } }
  | { type: 'HOVER'; payload: HoverPoint | null }
  | { type: 'WINDOW_CHANGE'; payload: { secs: number } }
  | { type: 'MODE_CHANGE'; payload: { mode: 'line' | 'candle' } }
  | { type: 'SERIES_TOGGLE'; payload: { id: string; visible: boolean } };

/**
 * Type-safe parser for incoming WebView → RN messages.
 */
export const parseWebViewMessage = (
  raw: unknown,
): WebViewToRNMessage | null => {
  if (typeof raw !== 'object' || raw === null) return null;
  const obj = raw as Record<string, unknown>;
  if (typeof obj.type !== 'string') return null;

  switch (obj.type) {
    case 'CHART_READY':
      return { type: 'CHART_READY' };
    case 'ERROR': {
      const payload = obj.payload as { message?: string } | undefined;
      return {
        type: 'ERROR',
        payload: { message: payload?.message ?? 'Unknown error' },
      };
    }
    case 'HOVER': {
      const payload = obj.payload as HoverPoint | null | undefined;
      return { type: 'HOVER', payload: payload ?? null };
    }
    case 'WINDOW_CHANGE': {
      const payload = obj.payload as { secs?: number } | undefined;
      return {
        type: 'WINDOW_CHANGE',
        payload: { secs: payload?.secs ?? 0 },
      };
    }
    case 'MODE_CHANGE': {
      const payload = obj.payload as { mode?: 'line' | 'candle' } | undefined;
      return {
        type: 'MODE_CHANGE',
        payload: { mode: payload?.mode ?? 'line' },
      };
    }
    case 'SERIES_TOGGLE': {
      const payload = obj.payload as
        | { id?: string; visible?: boolean }
        | undefined;
      return {
        type: 'SERIES_TOGGLE',
        payload: { id: payload?.id ?? '', visible: payload?.visible ?? true },
      };
    }
    default:
      return null;
  }
};

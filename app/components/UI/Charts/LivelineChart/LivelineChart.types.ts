/**
 * Types for the LivelineChart React Native wrapper.
 *
 * These mirror the full LivelineOptions API from @metamask/liveline, exposed
 * as a React Native-friendly interface. The wrapper serialises them into the
 * WebView via postMessage.
 */

// ---- Data types (match the web library) ----

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

export interface OrderbookData {
  bids: [number, number][]; // [price, size][]
  asks: [number, number][]; // [price, size][]
}

export interface DegenOptions {
  /** Multiplier for particle count and size (default 1) */
  scale?: number;
  /** Show particles on down-momentum swings (default false) */
  downMomentum?: boolean;
}

export type Momentum = 'up' | 'down' | 'flat';
export type BadgeVariant = 'default' | 'minimal';

// ---- Component props ----

export interface LivelineChartProps {
  // -- Data --
  /** Time-series data points. Required when not using series mode. */
  data: LivelinePoint[];
  /** Current / latest value. Required when not using series mode. */
  value: number;

  // -- Multi-series (optional) --
  /** When provided, overrides data / value / color. */
  series?: LivelineSeries[];

  // -- Appearance --
  theme?: 'light' | 'dark';
  color?: string;
  lineWidth?: number;
  /** Chart container height in px. @default 250 */
  height?: number;

  // -- Feature flags --
  grid?: boolean;
  badge?: boolean;
  badgeTail?: boolean;
  badgeVariant?: BadgeVariant;
  /** true = auto-detect, false = hide, 'up'|'down'|'flat' = override */
  momentum?: boolean | Momentum;
  fill?: boolean;
  loading?: boolean;
  paused?: boolean;
  emptyText?: string;
  scrub?: boolean;
  exaggerate?: boolean;
  showValue?: boolean;
  valueMomentumColor?: boolean;
  /** true = enable with defaults, object = enable with custom options */
  degen?: boolean | DegenOptions;
  pulse?: boolean;

  // -- Time window --
  /** Visible time window in seconds. @default 30 */
  window?: number;

  // -- Crosshair --
  tooltipY?: number;
  tooltipOutline?: boolean;

  // -- Reference line --
  referenceLine?: ReferenceLine;

  // -- Orderbook --
  orderbook?: OrderbookData;

  // -- Value / time formatting --
  formatValue?: string; // serialised as JS function body: "return v.toFixed(2)"
  formatTime?: string; // serialised as JS function body: "return new Date(t*1000).toISOString()"

  // -- Layout --
  padding?: Padding;

  // -- Animation --
  lerpSpeed?: number;

  // -- Multi-series visibility --
  hiddenSeriesIds?: string[];

  // -- Candlestick mode --
  mode?: 'line' | 'candle';
  candles?: CandlePoint[];
  candleWidth?: number;
  liveCandle?: CandlePoint;
  lineMode?: boolean;
  lineData?: LivelinePoint[];
  lineValue?: number;

  // -- Callbacks (RN-side, not forwarded into WebView) --
  onChartReady?: () => void;
  onError?: (message: string) => void;
  onHover?: (point: HoverPoint | null) => void;
}

// ---- WebView ↔ RN message protocol ----

/** Messages sent from React Native → WebView. */
export type RNToWebViewMessage =
  | {
      type: 'SET_DATA';
      payload: { data: LivelinePoint[]; value: number };
    }
  | {
      type: 'UPDATE_VALUE';
      payload: { time: number; value: number };
    }
  | {
      type: 'SET_SERIES';
      payload: { series: LivelineSeries[] | null };
    }
  | {
      type: 'SET_PROPS';
      payload: {
        loading?: boolean;
        paused?: boolean;
        emptyText?: string;
        candles?: CandlePoint[] | null;
        liveCandle?: CandlePoint | null;
        lineData?: LivelinePoint[] | null;
        lineValue?: number | null;
        hiddenSeriesIds?: string[] | null;
      };
    };

/** Messages sent from WebView → React Native. */
export type WebViewToRNMessage =
  | { type: 'CHART_READY'; payload: Record<string, never> }
  | { type: 'ERROR'; payload: { message: string } }
  | { type: 'HOVER'; payload: HoverPoint | null };

/**
 * Type-safe parser for incoming WebView messages.
 */
export const parseWebViewMessage = (
  raw: unknown,
): WebViewToRNMessage | null => {
  if (typeof raw !== 'object' || raw === null) return null;
  const obj = raw as Record<string, unknown>;
  if (typeof obj.type !== 'string') return null;

  switch (obj.type) {
    case 'CHART_READY':
      return { type: 'CHART_READY', payload: {} };
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
    default:
      return null;
  }
};

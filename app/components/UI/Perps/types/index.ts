/**
 * Perps view component props
 */
export interface PerpsViewProps {}

/**
 * Test result states for SDK validation
 */
export type TestResultStatus =
  | 'idle'
  | 'loading'
  | 'success'
  | 'warning'
  | 'error';

/**
 * Test result data structure
 */
export interface TestResult {
  status: TestResultStatus;
  message: string;
  data?: Record<string, unknown>;
}

/**
 * SDK test types
 */
export type SDKTestType = 'connection' | 'asset-listing' | 'websocket';

/**
 * Hyperliquid asset interface (basic structure)
 */
export interface HyperliquidAsset {
  name: string;
  [key: string]: unknown;
}

/**
 * Represents a single candlestick data point
 */
export interface CandleStick {
  time: number;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
}

/**
 * Represents historical candlestick data for a specific coin and interval
 */
export interface CandleData {
  coin: string;
  interval: string;
  candles: CandleStick[];
}

// Export all configuration types directly
export * from './config';

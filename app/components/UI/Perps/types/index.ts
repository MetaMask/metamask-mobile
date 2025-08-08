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

import { CandlePeriod } from '../constants/chartConfig';
import { OrderType } from '../controllers/types';

/**
 * Represents historical candlestick data for a specific coin and interval
 */
export interface CandleData {
  coin: string;
  interval: CandlePeriod;
  candles: CandleStick[];
}

// Export all configuration types directly
export * from './config';

/**
 * Standard Structure for Perps LaunchDarkly Feature Flags
 */
export interface PerpsLaunchDarklyFlag {
  enabled: boolean;
  minimumVersion: string;
}

/**
 * Order form state for the Perps order view
 */
export interface OrderFormState {
  asset: string;
  direction: 'long' | 'short';
  amount: string;
  leverage: number;
  balancePercent: number;
  takeProfitPrice?: string;
  stopLossPrice?: string;
  limitPrice?: string;
  type: OrderType;
}

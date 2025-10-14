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
 * HIP-3 (Builder-deployed perpetual) DEX metadata
 * Represents a permissionless perpetual market deployed by a builder
 */
export interface PerpDex {
  /** Short name of the perpetual dex */
  name: string;
  /** Complete name of the perpetual dex */
  full_name: string;
  /** Hex address of the dex deployer */
  deployer: string;
  /** Hex address of the oracle updater, or null if not available */
  oracle_updater: string | null;
}

/**
 * Response type for perpDexs API call
 * Returns a mapping of dex names to their metadata
 */
export type PerpDexs = Record<string, PerpDex>;

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
export * from './token';

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

export type OrderDirection = 'long' | 'short';

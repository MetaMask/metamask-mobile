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

/**
 * Options for reconnecting the Perps connection
 */
export interface ReconnectOptions {
  /**
   * If true, forces immediate disconnect and cancels all pending operations.
   * Use for user-initiated retry actions.
   * If false (default), waits for pending operations to complete.
   * Use for automatic reconnections like account switches.
   */
  force?: boolean;
}

/**
 * Extended asset metadata including Growth Mode fields not in SDK types.
 * The HyperLiquid API returns these fields but the SDK doesn't type them.
 * @see https://hyperliquid.gitbook.io/hyperliquid-docs/trading/fees#fee-formula-for-developers
 */
export interface ExtendedAssetMeta {
  name: string;
  szDecimals: number;
  maxLeverage: number;
  /** Per-asset Growth Mode status - "enabled" means 90% fee reduction */
  growthMode?: 'enabled' | null;
  /** ISO timestamp of last Growth Mode change */
  lastGrowthModeChangeTime?: string;
}

/**
 * Extended perp DEX info including fee scale fields not in SDK types.
 * The HyperLiquid API returns these fields but the SDK doesn't type them.
 * @see https://hyperliquid.gitbook.io/hyperliquid-docs/trading/fees#fee-formula-for-developers
 */
export interface ExtendedPerpDex {
  name: string;
  fullName?: string;
  deployer?: string;
  /** DEX-level fee scale (e.g., "1.0" for xyz DEX) - determines HIP-3 multiplier */
  deployerFeeScale?: string;
  /** ISO timestamp of last fee scale change */
  lastDeployerFeeScaleChangeTime?: string;
}

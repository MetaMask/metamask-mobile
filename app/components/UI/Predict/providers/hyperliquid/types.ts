/**
 * Hyperliquid HIP-4 Predict provider types.
 *
 * These are provider-specific types used internally by the
 * HyperliquidPredictProvider. The provider maps these to the
 * generic PredictMarket/PredictPosition types defined in the Predict module.
 */

/**
 * Configuration for the Hyperliquid Predict provider.
 */
export interface HyperliquidPredictProviderConfig {
  /** Whether to use testnet endpoints */
  isTestnet: boolean;
}

/**
 * Spot clearinghouse position (subset of full API response).
 * Used to derive user's YES/NO token holdings.
 */
export interface SpotPosition {
  /** Spot pair identifier (e.g., "@107") */
  coin: string;
  /** Token amount held */
  total: string;
  /** Available (non-locked) amount */
  hold: string;
  /** Token index */
  token: number;
  /** Entry notional value */
  entryNtl: string;
}

/**
 * Simplified spot order for HIP-4 outcome tokens.
 */
export interface HIP4SpotOrder {
  /** Spot pair to trade (e.g., "@{tokenIndex}") */
  coin: string;
  /** true = buy, false = sell */
  isBuy: boolean;
  /** Limit price */
  limitPx: string;
  /** Order size */
  sz: string;
  /** Order type */
  orderType: { limit: { tif: 'Ioc' } } | { limit: { tif: 'Gtc' } };
}

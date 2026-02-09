/**
 * Constants for the Hyperliquid HIP-4 Predict provider.
 */

export const HYPERLIQUID_PROVIDER_ID = 'hyperliquid';

export const HYPERLIQUID_PROVIDER_NAME = 'Hyperliquid';

/**
 * Arbitrum chain ID (mainnet) -- Hyperliquid deposits are via Arbitrum bridge
 */
export const ARBITRUM_MAINNET_CHAIN_ID = 42161;

/**
 * Arbitrum Sepolia chain ID (testnet)
 */
export const ARBITRUM_TESTNET_CHAIN_ID = 421614;

/**
 * Slippage defaults for HIP-4 market orders.
 * More conservative than typical perps due to binary market dynamics.
 */
export const SLIPPAGE_BUY = 0.02; // 2%
export const SLIPPAGE_SELL = 0.03; // 3%

/**
 * Minimum order size for outcome tokens (in USDC notional)
 */
export const MIN_ORDER_SIZE_USDC = 1;

/**
 * Tick size for HIP-4 outcome token prices
 */
export const TICK_SIZE = '0.001';

/**
 * Rate limit between consecutive orders (ms)
 */
export const ORDER_RATE_LIMIT_MS = 3000;

/**
 * API endpoints for Hyperliquid
 */
export const HYPERLIQUID_API = {
  mainnet: 'https://api.hyperliquid.xyz',
  testnet: 'https://api.hyperliquid-testnet.xyz',
} as const;

/**
 * WebSocket endpoints for Hyperliquid
 */
export const HYPERLIQUID_WS = {
  mainnet: 'wss://api.hyperliquid.xyz/ws',
  testnet: 'wss://api.hyperliquid-testnet.xyz/ws',
} as const;

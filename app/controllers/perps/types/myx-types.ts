/**
 * MYX Protocol Type Definitions
 *
 * Minimal types needed for Stage 1 (market display and price fetching).
 * Only defines what's needed - SDK types are re-exported with MYX prefix.
 */

import type { CaipChainId } from '@metamask/utils';

// ============================================================================
// Re-export SDK Types with MYX prefix for consistency
// ============================================================================

export type { PoolSymbolAllResponse as MYXPoolSymbol } from '@myx-trade/sdk';
export type { TickerDataItem as MYXTicker } from '@myx-trade/sdk';

// ============================================================================
// Network Configuration Types
// ============================================================================

/**
 * MYX Network type - mainnet or testnet
 */
export type MYXNetwork = 'mainnet' | 'testnet';

/**
 * MYX Endpoint configuration for a single network
 */
export type MYXEndpointConfig = {
  http: string;
  ws: string;
};

/**
 * MYX Endpoints for all networks
 */
export type MYXEndpoints = {
  mainnet: MYXEndpointConfig;
  testnet: MYXEndpointConfig;
};

/**
 * MYX Asset network configuration (token addresses per network)
 */
export type MYXAssetNetworkConfig = {
  chainId: CaipChainId;
  tokenAddress: string;
};

/**
 * MYX Asset configurations by network
 */
export type MYXAssetConfigs = {
  // USDT is the token symbol used as API key - not a variable name
  // eslint-disable-next-line @typescript-eslint/naming-convention
  USDT: {
    mainnet: MYXAssetNetworkConfig;
    testnet: MYXAssetNetworkConfig;
  };
};

// ============================================================================
// Market Overlap Configuration
// ============================================================================

/**
 * Markets that overlap with HyperLiquid
 * These are excluded from MYX display in v1.0 to avoid confusion
 * In Stage 7, we'll implement market collision handling
 */
export const MYX_HL_OVERLAPPING_MARKETS = [
  'BTC',
  'ETH',
  'BNB',
  'PUMP',
  'WLFI',
] as const;

export type MYXOverlappingMarket = (typeof MYX_HL_OVERLAPPING_MARKETS)[number];

// ============================================================================
// Client Service Types
// ============================================================================

/**
 * Price callback for REST polling
 */
export type MYXPriceCallback = (
  tickers: { symbol: string; price: string; change24h: number }[],
) => void;

/**
 * Error callback for client operations
 */
export type MYXErrorCallback = (error: Error) => void;

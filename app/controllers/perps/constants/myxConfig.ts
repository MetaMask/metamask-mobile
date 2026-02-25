/**
 * MYX Protocol Configuration Constants
 *
 * Configuration for market display, price fetching, and trading.
 * Based on MYX SDK patterns.
 */

import type { CaipChainId } from '@metamask/utils';
import { BigNumber } from 'bignumber.js';

import type {
  MYXNetwork,
  MYXEndpoints,
  MYXAssetConfigs,
} from '../types/myx-types';

// ============================================================================
// Network Constants
// ============================================================================

/**
 * MYX Chain IDs
 * Mainnet: BNB Chain (56)
 * Testnet: Arbitrum Sepolia (421614) per SDK guide & API data.
 * SDK also lists BSC testnet 97 but the API has no pools on that chain.
 */
export const MYX_MAINNET_CHAIN_ID = '56' as const;
export const MYX_TESTNET_CHAIN_ID = '421614' as const;
export const MYX_MAINNET_CAIP_CHAIN_ID =
  `eip155:${MYX_MAINNET_CHAIN_ID}` as CaipChainId;
export const MYX_TESTNET_CAIP_CHAIN_ID =
  `eip155:${MYX_TESTNET_CHAIN_ID}` as CaipChainId;

/** @deprecated Use MYX_MAINNET_CHAIN_ID */
export const BNB_MAINNET_CHAIN_ID = MYX_MAINNET_CHAIN_ID;
/** @deprecated Use MYX_TESTNET_CHAIN_ID */
export const BNB_TESTNET_CHAIN_ID = MYX_TESTNET_CHAIN_ID;
/** @deprecated Use MYX_MAINNET_CAIP_CHAIN_ID */
export const BNB_MAINNET_CAIP_CHAIN_ID = MYX_MAINNET_CAIP_CHAIN_ID;
/** @deprecated Use MYX_TESTNET_CAIP_CHAIN_ID */
export const BNB_TESTNET_CAIP_CHAIN_ID = MYX_TESTNET_CAIP_CHAIN_ID;

/**
 * Get numeric chain ID for MYX network
 *
 * @param network - The MYX network environment (mainnet or testnet).
 * @returns The numeric chain ID for the specified network.
 */
export function getMYXChainId(network: MYXNetwork): number {
  return network === 'testnet'
    ? parseInt(MYX_TESTNET_CHAIN_ID, 10)
    : parseInt(MYX_MAINNET_CHAIN_ID, 10);
}

// ============================================================================
// API Endpoints
// ============================================================================

/**
 * MYX REST and WebSocket endpoints
 */
export const MYX_ENDPOINTS: MYXEndpoints = {
  mainnet: {
    http: 'https://api.myx.finance',
    ws: 'wss://oapi.myx.finance/ws',
  },
  testnet: {
    http: 'https://api-test.myx.cash',
    ws: 'wss://oapi-test.myx.cash/ws',
  },
};

/**
 * Get HTTP endpoint for network
 *
 * @param network - The MYX network environment (mainnet or testnet).
 * @returns The HTTP API endpoint URL for the specified network.
 */
export function getMYXHttpEndpoint(network: MYXNetwork): string {
  return MYX_ENDPOINTS[network].http;
}

// ============================================================================
// Decimal Constants
// ============================================================================

/**
 * MYX API returns prices as normal floating-point strings (e.g. "64854.76").
 * No decimal scaling is needed for prices from the REST/WS API.
 *
 * Note: The SDK's internal contract layer uses 30 decimals, but the API
 * endpoints (tickers, candles, order history) return human-readable values.
 */
export const MYX_PRICE_DECIMALS = 0;

/**
 * MYX uses 18 decimals for position sizes
 */
export const MYX_SIZE_DECIMALS = 18;

/**
 * MYX uses 18 decimals for collateral amounts (USDT on BNB)
 */
export const MYX_COLLATERAL_DECIMALS = 18;

// ============================================================================
// Token Addresses
// ============================================================================

/**
 * Collateral token address — testnet (USDC on Arbitrum Sepolia)
 * From SDK: ARB_TEST_SEPOLIA.USDC
 */
export const MYX_COLLATERAL_TOKEN_TESTNET =
  '0x7E248Ec1721639413A280d9E82e2862Cae2E6E28' as const;

/**
 * Collateral token address — mainnet (BUSD on BNB, per pool quoteToken)
 * Note: individual pools may use different quote tokens
 */
export const MYX_COLLATERAL_TOKEN_MAINNET =
  '0x8bfc51e1928e91e47c6734983ac018b2fc0adf4e' as const;

/** @deprecated Use MYX_COLLATERAL_TOKEN_TESTNET */
export const USDT_BNB_TESTNET = MYX_COLLATERAL_TOKEN_TESTNET;
/** @deprecated Use MYX_COLLATERAL_TOKEN_MAINNET */
export const USDT_BNB_MAINNET = MYX_COLLATERAL_TOKEN_MAINNET;

/**
 * Collateral token configuration by network
 */
export const MYX_ASSET_CONFIGS: MYXAssetConfigs = {
  USDT: {
    mainnet: {
      chainId: MYX_MAINNET_CAIP_CHAIN_ID,
      tokenAddress: MYX_COLLATERAL_TOKEN_MAINNET,
    },
    testnet: {
      chainId: MYX_TESTNET_CAIP_CHAIN_ID,
      tokenAddress: MYX_COLLATERAL_TOKEN_TESTNET,
    },
  },
};

// ============================================================================
// Decimal Conversion Helpers
// ============================================================================

/**
 * Convert MYX API price string to standard number.
 *
 * MYX API returns normal floating-point price strings (e.g. "64854.76"),
 * NOT 30-decimal scaled integers. This is a simple parseFloat.
 *
 * @param myxPrice - Price string from MYX API (e.g. "64854.760266796727")
 * @returns Standard decimal number
 */
export function fromMYXPrice(myxPrice: string): number {
  if (!myxPrice || myxPrice === '0') {
    return 0;
  }

  const parsed = parseFloat(myxPrice);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Convert standard number to MYX API price string.
 *
 * MYX API uses normal floating-point strings, so this is a simple toString.
 *
 * @param price - Standard decimal number
 * @returns Price string for MYX API
 */
export function toMYXPrice(price: number | string): string {
  const parsed = typeof price === 'string' ? parseFloat(price) : price;
  return isNaN(parsed) ? '0' : parsed.toString();
}

/**
 * Convert MYX SDK size (18 decimals) to standard number
 *
 * @param myxSize - Size string in 18-decimal format from SDK
 * @returns Standard decimal number
 */
export function fromMYXSize(myxSize: string): number {
  if (!myxSize || myxSize === '0') {
    return 0;
  }

  try {
    const bn = new BigNumber(myxSize);
    if (bn.isNaN()) {
      return 0;
    }
    const divisor = new BigNumber(10).pow(MYX_SIZE_DECIMALS);
    return bn.dividedBy(divisor).toNumber();
  } catch {
    return 0;
  }
}

/**
 * Convert standard number to MYX SDK size format (18 decimals)
 *
 * @param size - Standard decimal number
 * @returns Size string in 18-decimal format for SDK
 */
export function toMYXSize(size: number | string): string {
  try {
    const bn = new BigNumber(size);
    if (bn.isNaN()) {
      return '0';
    }
    const multiplier = new BigNumber(10).pow(MYX_SIZE_DECIMALS);
    return bn.multipliedBy(multiplier).toFixed(0);
  } catch {
    return '0';
  }
}

/**
 * Convert MYX SDK collateral (18 decimals) to standard number
 *
 * @param myxCollateral - Collateral string in 18-decimal format from SDK
 * @returns Standard decimal number
 */
export function fromMYXCollateral(myxCollateral: string): number {
  if (!myxCollateral || myxCollateral === '0') {
    return 0;
  }

  try {
    const bn = new BigNumber(myxCollateral);
    if (bn.isNaN()) {
      return 0;
    }
    const divisor = new BigNumber(10).pow(MYX_COLLATERAL_DECIMALS);
    return bn.dividedBy(divisor).toNumber();
  } catch {
    return 0;
  }
}

// ============================================================================
// REST API Configuration
// ============================================================================

/**
 * Price polling interval in milliseconds
 * Using 5 seconds as a fallback for unreliable WebSocket
 */
export const MYX_PRICE_POLLING_INTERVAL_MS = 5000;

/**
 * HTTP request timeout in milliseconds
 */
export const MYX_HTTP_TIMEOUT_MS = 10000;

/**
 * Maximum retries for failed API requests
 */
export const MYX_MAX_RETRIES = 3;

/**
 * Default slippage in basis points for MYX orders
 */
export const MYX_DEFAULT_SLIPPAGE_BPS = 500;

/**
 * USDT execution fee token address per network (used for order execution fees)
 */
export const MYX_EXECUTION_FEE_TOKEN: Record<MYXNetwork, string> = {
  testnet: MYX_COLLATERAL_TOKEN_TESTNET,
  mainnet: MYX_COLLATERAL_TOKEN_MAINNET,
};

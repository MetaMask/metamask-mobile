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
 * Testnet: Linea Sepolia (59141) — primary testnet chain with most active pools.
 * The testnet API also has one pool on Arbitrum Sepolia (421614) but it has no
 * ticker data, so Linea Sepolia is the effective testnet chain.
 */
export const MYX_MAINNET_CHAIN_ID = '56' as const;
export const MYX_TESTNET_CHAIN_ID = '59141' as const;
export const MYX_MAINNET_CAIP_CHAIN_ID =
  `eip155:${MYX_MAINNET_CHAIN_ID}` as CaipChainId;
export const MYX_TESTNET_CAIP_CHAIN_ID =
  `eip155:${MYX_TESTNET_CHAIN_ID}` as CaipChainId;

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
 * Collateral token decimals per network.
 * Mainnet: USDT on BNB Chain = 18 decimals (verified on-chain)
 * Testnet: USDC on Linea Sepolia = 6 decimals (verified on-chain)
 */
export const MYX_COLLATERAL_DECIMALS: Record<MYXNetwork, number> = {
  mainnet: 18,
  testnet: 6,
};

// ============================================================================
// Token Addresses
// ============================================================================

/**
 * Collateral token address — testnet (USDC on Linea Sepolia)
 * From SDK: LINEA_SEPOLIA.USDC
 */
export const MYX_COLLATERAL_TOKEN_TESTNET =
  '0xD984fd34f91F92DA0586e1bE82E262fF27DC431b' as const;

/**
 * Collateral token address — mainnet (USDT on BNB Chain)
 * Canonical BSC USDT from Ryan's prod_bsc_mainnet config.
 * Note: individual pools may use different quote tokens
 */
export const MYX_COLLATERAL_TOKEN_MAINNET =
  '0x55d398326f99059fF775485246999027B3197955' as const;

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
 * Convert MYX SDK size (18 decimals) to standard number.
 *
 * Use this ONLY for raw on-chain / contract-layer values (e.g. from
 * createIncreaseOrder responses). For REST API responses, use
 * {@link fromMYXApiSize} — the API already returns human-readable strings.
 *
 * @param myxSize - Size string in 18-decimal format from SDK contract layer
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
 * Parse MYX REST API size string to number.
 *
 * The MYX REST API (getOrderHistory, listPositions, getPositionHistory, etc.)
 * returns sizes as human-readable strings (e.g. "0.00136159"), NOT 18-decimal
 * scaled integers. This is a simple parseFloat.
 *
 * @param apiSize - Size string from MYX REST API
 * @returns Standard decimal number
 */
export function fromMYXApiSize(apiSize: string): number {
  if (!apiSize || apiSize === '0') {
    return 0;
  }
  const parsed = parseFloat(apiSize);
  return isNaN(parsed) ? 0 : parsed;
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
 * Convert a USD amount to the collateral token's native decimal format.
 *
 * Mainnet USDT on BNB = 18 decimals, testnet USDC on Linea Sepolia = 6 decimals.
 *
 * @param amount - USD amount as a human-readable number (e.g. 10 for $10)
 * @param network - 'mainnet' or 'testnet'
 * @returns Collateral string in the token's native decimal format
 */
export function toMYXCollateral(
  amount: number | string,
  network: MYXNetwork,
): string {
  try {
    const bn = new BigNumber(amount);
    if (bn.isNaN()) {
      return '0';
    }
    const decimals = MYX_COLLATERAL_DECIMALS[network];
    const multiplier = new BigNumber(10).pow(decimals);
    return bn.multipliedBy(multiplier).toFixed(0);
  } catch {
    return '0';
  }
}

/**
 * Convert on-chain collateral value to standard number.
 *
 * Use this ONLY for raw on-chain / contract-layer values. For REST API
 * responses, use {@link fromMYXApiCollateral}.
 *
 * @param myxCollateral - Collateral string in token-native decimals from contract
 * @param network - 'mainnet' or 'testnet'
 * @returns Standard decimal number
 */
export function fromMYXCollateral(
  myxCollateral: string,
  network: MYXNetwork = 'mainnet',
): number {
  if (!myxCollateral || myxCollateral === '0') {
    return 0;
  }

  try {
    const bn = new BigNumber(myxCollateral);
    if (bn.isNaN()) {
      return 0;
    }
    const divisor = new BigNumber(10).pow(MYX_COLLATERAL_DECIMALS[network]);
    return bn.dividedBy(divisor).toNumber();
  } catch {
    return 0;
  }
}

/**
 * Parse MYX REST API collateral/amount string to number.
 *
 * The MYX REST API returns collateral, fees, PnL, and balance values as
 * human-readable strings (e.g. "5.895534", "-0.029124"), NOT 18-decimal
 * scaled integers. This is a simple parseFloat.
 *
 * @param apiCollateral - Collateral/amount string from MYX REST API
 * @returns Standard decimal number
 */
export function fromMYXApiCollateral(apiCollateral: string): number {
  if (!apiCollateral || apiCollateral === '0') {
    return 0;
  }
  const parsed = parseFloat(apiCollateral);
  return isNaN(parsed) ? 0 : parsed;
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
 * Default slippage in basis points for MYX orders (1% — matches SDK default)
 */
export const MYX_DEFAULT_SLIPPAGE_BPS = 100;

/**
 * Maximum leverage supported by MYX (most markets)
 */
export const MYX_MAX_LEVERAGE = 100;

/**
 * Minimum order size in USD
 */
export const MYX_MINIMUM_ORDER_SIZE_USD = 10;

/**
 * MYX fee rates (placeholder — will be replaced with per-market rates)
 */
export const MYX_FEE_RATE = 0.0005; // 0.05% total fee rate
export const MYX_PROTOCOL_FEE_RATE = 0.0005; // Protocol taker fee

/**
 * USDT execution fee token address per network (used for order execution fees)
 */
export const MYX_EXECUTION_FEE_TOKEN: Record<MYXNetwork, string> = {
  testnet: MYX_COLLATERAL_TOKEN_TESTNET,
  mainnet: MYX_COLLATERAL_TOKEN_MAINNET,
};

/**
 * MYX contract price decimals — SDK's createIncreaseOrder uses 30-decimal
 * contract-layer prices (not human-readable REST API prices).
 */
export const MYX_CONTRACT_PRICE_DECIMALS = 30;

/**
 * Convert a human-readable price to MYX 30-decimal contract format.
 *
 * SDK's createIncreaseOrder expects price as a string scaled by 10^30.
 * Example: $65,629.50 → "65629500000000000000000000000000000"
 *
 * @param price - Human-readable price (number or string)
 * @returns 30-decimal price string for SDK contract calls
 */
export function toMYXContractPrice(price: number | string): string {
  try {
    const bn = new BigNumber(price);
    if (bn.isNaN() || bn.isZero()) {
      return '0';
    }
    const multiplier = new BigNumber(10).pow(MYX_CONTRACT_PRICE_DECIMALS);
    return bn.multipliedBy(multiplier).toFixed(0);
  } catch {
    return '0';
  }
}

/**
 * MYX Protocol Configuration Constants
 *
 * Stage 1 configuration for market display and price fetching.
 * Based on MYX SDK patterns but simplified for read-only operations.
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
 * BNB Chain IDs - MYX's primary network
 */
export const BNB_MAINNET_CHAIN_ID = '56' as const;
export const BNB_TESTNET_CHAIN_ID = '97' as const;
export const BNB_MAINNET_CAIP_CHAIN_ID =
  `eip155:${BNB_MAINNET_CHAIN_ID}` as CaipChainId;
export const BNB_TESTNET_CAIP_CHAIN_ID =
  `eip155:${BNB_TESTNET_CHAIN_ID}` as CaipChainId;

/**
 * Get numeric chain ID for MYX network
 *
 * @param network - The MYX network environment (mainnet or testnet).
 * @returns The numeric chain ID for the specified network.
 */
export function getMYXChainId(network: MYXNetwork): number {
  return network === 'testnet'
    ? parseInt(BNB_TESTNET_CHAIN_ID, 10)
    : parseInt(BNB_MAINNET_CHAIN_ID, 10);
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
    ws: 'wss://ws.myx.finance',
  },
  testnet: {
    http: 'https://api-beta.myx.finance',
    ws: 'wss://ws-beta.myx.finance',
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
 * MYX uses 30 decimals for price representation
 * This is consistent with the SDK's internal format
 */
export const MYX_PRICE_DECIMALS = 30;

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
 * USDT token address on BNB testnet
 */
export const USDT_BNB_TESTNET =
  '0x337610d27c682e347c9cd60bd4b3b107c9d34ddd' as const;

/**
 * USDT token address on BNB mainnet
 */
export const USDT_BNB_MAINNET =
  '0x55d398326f99059ff775485246999027b3197955' as const;

/**
 * USDT configuration by network
 */
export const MYX_ASSET_CONFIGS: MYXAssetConfigs = {
  USDT: {
    mainnet: {
      chainId: BNB_MAINNET_CAIP_CHAIN_ID,
      tokenAddress: USDT_BNB_MAINNET,
    },
    testnet: {
      chainId: BNB_TESTNET_CAIP_CHAIN_ID,
      tokenAddress: USDT_BNB_TESTNET,
    },
  },
};

// ============================================================================
// Decimal Conversion Helpers
// ============================================================================

/**
 * Convert MYX SDK price (30 decimals) to standard number
 *
 * @param myxPrice - Price string in 30-decimal format from SDK
 * @returns Standard decimal number
 */
export function fromMYXPrice(myxPrice: string): number {
  if (!myxPrice || myxPrice === '0') {
    return 0;
  }

  try {
    const bn = new BigNumber(myxPrice);
    if (bn.isNaN()) {
      return 0;
    }
    const divisor = new BigNumber(10).pow(MYX_PRICE_DECIMALS);
    return bn.dividedBy(divisor).toNumber();
  } catch {
    return 0;
  }
}

/**
 * Convert standard number to MYX SDK price format (30 decimals)
 *
 * @param price - Standard decimal number
 * @returns Price string in 30-decimal format for SDK
 */
export function toMYXPrice(price: number | string): string {
  try {
    const bn = new BigNumber(price);
    if (bn.isNaN()) {
      return '0';
    }
    const multiplier = new BigNumber(10).pow(MYX_PRICE_DECIMALS);
    return bn.multipliedBy(multiplier).toFixed(0);
  } catch {
    return '0';
  }
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

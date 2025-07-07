import type { CaipAssetId, CaipChainId, Hex } from '@metamask/utils';

// Network constants
export const ARBITRUM_MAINNET_CHAIN_ID = '42161';
export const ARBITRUM_TESTNET_CHAIN_ID = '421614';
export const ARBITRUM_MAINNET_CAIP_CHAIN_ID = `eip155:${ARBITRUM_MAINNET_CHAIN_ID}`;
export const ARBITRUM_TESTNET_CAIP_CHAIN_ID = `eip155:${ARBITRUM_TESTNET_CHAIN_ID}`;

// WebSocket endpoints
export const HYPERLIQUID_ENDPOINTS = {
  mainnet: 'wss://api.hyperliquid.xyz/ws',
  testnet: 'wss://api.hyperliquid-testnet.xyz/ws',
} as const;

// Asset configurations for multichain abstraction
export const HYPERLIQUID_ASSET_CONFIGS = {
  'USDC': {
    mainnet: `${ARBITRUM_MAINNET_CAIP_CHAIN_ID}/erc20:0xaf88d065e77c8cC2239327C5EDb3A432268e5831/default`,
    testnet: `${ARBITRUM_TESTNET_CAIP_CHAIN_ID}/erc20:0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d/default`
  }
} as const;

// HyperLiquid bridge contract addresses for direct USDC deposits
// These are the official bridge contracts where USDC must be sent to credit user's HyperLiquid account
export const HYPERLIQUID_BRIDGE_CONTRACTS = {
  mainnet: {
    chainId: ARBITRUM_MAINNET_CAIP_CHAIN_ID as CaipChainId,
    contractAddress: '0x2df1c51e09aecf9cacb7bc98cb1742757f163df7' as Hex
  },
  testnet: {
    chainId: ARBITRUM_TESTNET_CAIP_CHAIN_ID as CaipChainId,
    contractAddress: '0x08cfc1B6b2dCF36A1480b99353A354AA8AC56f89' as Hex
  }
} as const;

// SDK transport configuration
export const HYPERLIQUID_TRANSPORT_CONFIG = {
  timeout: 10_000,
  keepAlive: { interval: 30_000 },
  reconnect: {
    maxRetries: 5,
    connectionTimeout: 10_000
  }
} as const;

// Type helpers
export type HyperLiquidNetwork = 'mainnet' | 'testnet';
export type SupportedAsset = keyof typeof HYPERLIQUID_ASSET_CONFIGS;

// Configuration helpers
export function getWebSocketEndpoint(isTestnet: boolean): string {
  return isTestnet ? HYPERLIQUID_ENDPOINTS.testnet : HYPERLIQUID_ENDPOINTS.mainnet;
}

export function getChainId(isTestnet: boolean): string {
  return isTestnet ? ARBITRUM_TESTNET_CHAIN_ID : ARBITRUM_MAINNET_CHAIN_ID;
}

export function getCaipChainId(isTestnet: boolean): CaipChainId {
  return isTestnet ? ARBITRUM_TESTNET_CAIP_CHAIN_ID as CaipChainId : ARBITRUM_MAINNET_CAIP_CHAIN_ID as CaipChainId;
}

export function getBridgeInfo(isTestnet: boolean): { chainId: CaipChainId; contractAddress: Hex } {
  return isTestnet ? HYPERLIQUID_BRIDGE_CONTRACTS.testnet : HYPERLIQUID_BRIDGE_CONTRACTS.mainnet;
}

export function getSupportedAssets(isTestnet?: boolean): CaipAssetId[] {
  const network = isTestnet ? 'testnet' : 'mainnet';
  return Object.values(HYPERLIQUID_ASSET_CONFIGS).map(config => config[network]);
}

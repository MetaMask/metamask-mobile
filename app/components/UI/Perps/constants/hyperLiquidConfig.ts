import type { CaipAssetId, CaipChainId } from '@metamask/utils';
import type {
  HyperLiquidNetwork,
  HyperLiquidEndpoints,
  HyperLiquidAssetConfigs,
  BridgeContractConfig,
  HyperLiquidBridgeContracts,
  HyperLiquidTransportConfig,
  TradingDefaultsConfig,
  FeeRatesConfig,
  RiskManagementConfig,
} from '../types';

// Network constants
export const ARBITRUM_MAINNET_CHAIN_ID = '42161';
export const ARBITRUM_TESTNET_CHAIN_ID = '421614';
export const ARBITRUM_MAINNET_CAIP_CHAIN_ID = `eip155:${ARBITRUM_MAINNET_CHAIN_ID}`;
export const ARBITRUM_TESTNET_CAIP_CHAIN_ID = `eip155:${ARBITRUM_TESTNET_CHAIN_ID}`;

// WebSocket endpoints
export const HYPERLIQUID_ENDPOINTS: HyperLiquidEndpoints = {
  mainnet: 'wss://api.hyperliquid.xyz/ws',
  testnet: 'wss://api.hyperliquid-testnet.xyz/ws',
};

// Asset icons base URL
export const HYPERLIQUID_ASSET_ICONS_BASE_URL =
  'https://app.hyperliquid.xyz/coins/';

// Asset configurations for multichain abstraction
export const HYPERLIQUID_ASSET_CONFIGS: HyperLiquidAssetConfigs = {
  USDC: {
    mainnet: `${ARBITRUM_MAINNET_CAIP_CHAIN_ID}/erc20:0xaf88d065e77c8cC2239327C5EDb3A432268e5831/default`,
    testnet: `${ARBITRUM_TESTNET_CAIP_CHAIN_ID}/erc20:0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d/default`,
  },
};

// HyperLiquid bridge contract addresses for direct USDC deposits
// These are the official bridge contracts where USDC must be sent to credit user's HyperLiquid account
export const HYPERLIQUID_BRIDGE_CONTRACTS: HyperLiquidBridgeContracts = {
  mainnet: {
    chainId: ARBITRUM_MAINNET_CAIP_CHAIN_ID,
    contractAddress: '0x2df1c51e09aecf9cacb7bc98cb1742757f163df7',
  },
  testnet: {
    chainId: ARBITRUM_TESTNET_CAIP_CHAIN_ID,
    contractAddress: '0x08cfc1B6b2dCF36A1480b99353A354AA8AC56f89',
  },
};

// SDK transport configuration
export const HYPERLIQUID_TRANSPORT_CONFIG: HyperLiquidTransportConfig = {
  timeout: 10_000,
  keepAlive: { interval: 30_000 },
  reconnect: {
    maxRetries: 5,
    connectionTimeout: 10_000,
  },
};

// Trading configuration constants
export const TRADING_DEFAULTS: TradingDefaultsConfig = {
  leverage: 3, // 3x default leverage
  marginPercent: 10, // 10% fixed margin default
  takeProfitPercent: 0.3, // 30% take profit
  stopLossPercent: 0.1, // 10% stop loss
  slippage: 0.05, // 5% max slippage protection
  amount: {
    mainnet: 5, // $5 minimum order size
    testnet: 11, // Default USD amount for testnet
  },
};

// Fee configuration
export const FEE_RATES: FeeRatesConfig = {
  market: 0.0002, // 0.02% market order fee
  limit: 0.0001, // 0.01% limit order fee
};

// Risk management constants
export const RISK_MANAGEMENT: RiskManagementConfig = {
  maintenanceMargin: 0.05, // 5% maintenance margin for liquidation
  fallbackMaxLeverage: 20, // Fallback when market data unavailable
  fallbackBalancePercent: 0.1, // Default balance percentage if no balance
};

// Type helpers
export type SupportedAsset = keyof typeof HYPERLIQUID_ASSET_CONFIGS;

// Configuration helpers
export function getWebSocketEndpoint(isTestnet: boolean): string {
  return isTestnet
    ? HYPERLIQUID_ENDPOINTS.testnet
    : HYPERLIQUID_ENDPOINTS.mainnet;
}

export function getChainId(isTestnet: boolean): string {
  return isTestnet ? ARBITRUM_TESTNET_CHAIN_ID : ARBITRUM_MAINNET_CHAIN_ID;
}

export function getCaipChainId(isTestnet: boolean): CaipChainId {
  const network: HyperLiquidNetwork = isTestnet ? 'testnet' : 'mainnet';
  return HYPERLIQUID_BRIDGE_CONTRACTS[network].chainId;
}

export function getBridgeInfo(isTestnet: boolean): BridgeContractConfig {
  const network: HyperLiquidNetwork = isTestnet ? 'testnet' : 'mainnet';
  return HYPERLIQUID_BRIDGE_CONTRACTS[network];
}

export function getSupportedAssets(isTestnet?: boolean): CaipAssetId[] {
  const network = isTestnet ? 'testnet' : 'mainnet';
  return Object.values(HYPERLIQUID_ASSET_CONFIGS).map(
    (config) => config[network],
  );
}

import type { CaipAssetId, CaipChainId, Hex } from '@metamask/utils';

// WebSocket endpoints interface
export interface HyperLiquidEndpoints {
  mainnet: string;
  testnet: string;
}

// Asset configuration interface
export interface AssetNetworkConfig {
  mainnet: CaipAssetId;
  testnet: CaipAssetId;
}

export interface HyperLiquidAssetConfigs {
  usdc: AssetNetworkConfig;
}

// Bridge contract configuration interface
export interface BridgeContractConfig {
  chainId: CaipChainId;
  contractAddress: Hex;
}

export interface HyperLiquidBridgeContracts {
  mainnet: BridgeContractConfig;
  testnet: BridgeContractConfig;
}

// SDK transport configuration interface
export interface TransportReconnectConfig {
  maxRetries: number;
  connectionTimeout: number;
}

export interface TransportKeepAliveConfig {
  interval: number;
}

export interface HyperLiquidTransportConfig {
  timeout: number;
  keepAlive: TransportKeepAliveConfig;
  reconnect: TransportReconnectConfig;
}

// Trading configuration interface
export interface TradingAmountConfig {
  mainnet: number;
  testnet: number;
}

export interface TradingDefaultsConfig {
  leverage: number;
  marginPercent: number;
  takeProfitPercent: number;
  stopLossPercent: number;
  amount: TradingAmountConfig;
}

// Fee configuration interface
export interface FeeRatesConfig {
  taker: number;
  maker: number;
}

// Network type helper
export type HyperLiquidNetwork = 'mainnet' | 'testnet';

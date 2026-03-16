import type { CaipAssetId, CaipChainId, Hex } from '@metamask/utils';

// WebSocket endpoints interface
export type HyperLiquidEndpoints = {
  mainnet: string;
  testnet: string;
};

// Asset configuration interface
export type AssetNetworkConfig = {
  mainnet: CaipAssetId;
  testnet: CaipAssetId;
};

export type HyperLiquidAssetConfigs = {
  usdc: AssetNetworkConfig;
};

// Bridge contract configuration interface
export type BridgeContractConfig = {
  chainId: CaipChainId;
  contractAddress: Hex;
};

export type HyperLiquidBridgeContracts = {
  mainnet: BridgeContractConfig;
  testnet: BridgeContractConfig;
};

// SDK transport configuration interface
export type TransportReconnectConfig = {
  maxRetries: number;
  connectionTimeout: number;
};

export type TransportKeepAliveConfig = {
  interval: number;
};

export type HyperLiquidTransportConfig = {
  timeout: number;
  keepAlive: TransportKeepAliveConfig;
  reconnect: TransportReconnectConfig;
};

// Trading configuration interface
export type TradingAmountConfig = {
  mainnet: number;
  testnet: number;
};

export type TradingDefaultsConfig = {
  leverage: number;
  marginPercent: number;
  takeProfitPercent: number;
  stopLossPercent: number;
  amount: TradingAmountConfig;
};

// Fee configuration interface
export type FeeRatesConfig = {
  taker: number;
  maker: number;
};

// Network type helper
export type HyperLiquidNetwork = 'mainnet' | 'testnet';

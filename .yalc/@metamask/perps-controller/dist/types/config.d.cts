import type { CaipAssetId, CaipChainId, Hex } from "@metamask/utils";
export type HyperLiquidEndpoints = {
    mainnet: string;
    testnet: string;
};
export type AssetNetworkConfig = {
    mainnet: CaipAssetId;
    testnet: CaipAssetId;
};
export type HyperLiquidAssetConfigs = {
    usdc: AssetNetworkConfig;
};
export type BridgeContractConfig = {
    chainId: CaipChainId;
    contractAddress: Hex;
};
export type HyperLiquidBridgeContracts = {
    mainnet: BridgeContractConfig;
    testnet: BridgeContractConfig;
};
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
export type FeeRatesConfig = {
    taker: number;
    maker: number;
};
export type HyperLiquidNetwork = 'mainnet' | 'testnet';
//# sourceMappingURL=config.d.cts.map
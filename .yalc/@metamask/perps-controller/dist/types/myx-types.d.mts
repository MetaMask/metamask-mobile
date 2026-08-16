/**
 * MYX Protocol Type Definitions
 *
 * SDK types re-exported with MYX prefix for consistency.
 * Includes types for market display, positions, orders, and trading.
 */
import type { CaipChainId } from "@metamask/utils";
export type { PoolSymbolAllResponse as MYXPoolSymbol } from "@myx-trade/sdk";
export type { TickerDataItem as MYXTicker } from "@myx-trade/sdk";
export type { PositionType as MYXPositionType } from "@myx-trade/sdk";
export type { HistoryOrderItem as MYXHistoryOrderItem } from "@myx-trade/sdk";
export type { PositionHistoryItem as MYXPositionHistoryItem } from "@myx-trade/sdk";
export type { TradeFlowItem as MYXTradeFlowItem } from "@myx-trade/sdk";
export type { KlineDataItemType as MYXKlineData } from "@myx-trade/sdk";
export type MYXKlineWsData = {
    E: number;
    T: string;
    c: string;
    h: string;
    l: string;
    o: string;
    t: number;
    v: string;
};
export type { KlineDataResponse as MYXKlineDataResponse } from "@myx-trade/sdk";
export { Direction as MYXDirection, OrderType as MYXOrderType, OperationType as MYXOperationType, TriggerType as MYXTriggerType, OrderStatus as MYXOrderStatus, TimeInForce as MYXTimeInForce, } from "@myx-trade/sdk";
export { DirectionEnum as MYXDirectionEnum, OrderTypeEnum as MYXOrderTypeEnum, OperationEnum as MYXOperationEnum, OrderStatusEnum as MYXOrderStatusEnum, ExecTypeEnum as MYXExecTypeEnum, TradeFlowTypeEnum as MYXTradeFlowTypeEnum, } from "@myx-trade/sdk";
export type { PlaceOrderParams as MYXPlaceOrderParams } from "@myx-trade/sdk";
export type { PositionTpSlOrderParams as MYXPositionTpSlOrderParams } from "@myx-trade/sdk";
export type { GetHistoryOrdersParams as MYXGetHistoryOrdersParams } from "@myx-trade/sdk";
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
    USDT: {
        mainnet: MYXAssetNetworkConfig;
        testnet: MYXAssetNetworkConfig;
    };
};
/**
 * Markets that overlap with HyperLiquid
 * These are excluded from MYX display in v1.0 to avoid confusion
 * In Stage 7, we'll implement market collision handling
 */
export declare const MYX_HL_OVERLAPPING_MARKETS: readonly ["BTC", "ETH", "BNB", "PUMP", "WLFI"];
export type MYXOverlappingMarket = (typeof MYX_HL_OVERLAPPING_MARKETS)[number];
/**
 * MYX auth credentials passed at construction time.
 * Eliminates runtime `process.env` lookups — values come from the init file
 * where `process.env.X` is babel-transformed at build time.
 */
export type MYXAuthConfig = {
    appId: string;
    apiSecret: string;
    brokerAddress: string;
};
/**
 * Price callback for REST polling
 */
export type MYXPriceCallback = (tickers: {
    symbol: string;
    price: string;
    change24h: number;
}[]) => void;
/**
 * Error callback for client operations
 */
export type MYXErrorCallback = (error: Error) => void;
//# sourceMappingURL=myx-types.d.mts.map
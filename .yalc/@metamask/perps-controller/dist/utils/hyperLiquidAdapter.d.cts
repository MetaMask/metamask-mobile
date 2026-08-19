import type { AssetPosition, FrontendOrder, ClearinghouseStateResponse, MetaResponse, SDKOrderParams } from "../types/hyperliquid-types.cjs";
import type { AccountState, MarketInfo, Order, OrderParams as PerpsOrderParams, Position, PositionTriggerOrder, RawLedgerUpdate, UserHistoryItem } from "../types/index.cjs";
import type { TpslLinkage, TriggerOrderType } from "../types/perps-types.cjs";
/**
 * HyperLiquid SDK Adapter Utilities
 *
 * These functions transform between MetaMask Perps API types and HyperLiquid SDK types.
 * The SDK uses cryptic property names for efficiency, but our API uses descriptive names
 * to provide a consistent interface across different perps protocols.
 */
export declare function adaptOrderToSDK(order: PerpsOrderParams, symbolToAssetId: Map<string, number>): SDKOrderParams;
/**
 * Map the provider-agnostic TP/SL linkage onto HyperLiquid's grouping vocabulary.
 *
 * @param linkage - How the attached TP/SL is linked.
 * @returns The HyperLiquid grouping value.
 */
export declare function adaptTpslLinkageToGrouping(linkage: TpslLinkage): 'na' | 'normalTpsl' | 'positionTpsl';
export declare function adaptPositionFromSDK(assetPosition: AssetPosition): Position;
export declare function adaptOrderFromSDK(rawOrder: FrontendOrder, position?: Position): Order;
/**
 * Map HyperLiquid's human-readable order type string onto the provider-agnostic
 * trigger placement type.
 *
 * @param detailedOrderType - HyperLiquid `orderType` string (e.g. `'Stop Limit'`)
 * @returns The normalized trigger placement type, or undefined for non-trigger orders
 */
export declare function adaptTriggerOrderTypeFromSDK(detailedOrderType: string | undefined): TriggerOrderType | undefined;
/**
 * Build the position-state view of a trigger order attached to a position.
 *
 * HyperLiquid encodes "the whole position" as size `0` for position-bound TP/SL,
 * which is resolved here against the position size so consumers always see a
 * concrete quantity and can tell partial triggers apart.
 *
 * @param params - Mapping parameters
 * @param params.rawOrder - Raw HyperLiquid frontend order
 * @param params.positionSize - Signed or unsigned position size
 * @param params.entryPrice - Entry price, used to classify a trigger the exchange left unnamed
 * @returns The normalized trigger order, or undefined when the order is not a trigger
 */
export declare function adaptPositionTriggerOrderFromSDK(params: {
    rawOrder: Pick<FrontendOrder, 'oid' | 'orderType' | 'triggerPx' | 'limitPx' | 'sz' | 'reduceOnly'>;
    positionSize: string;
    entryPrice?: string;
}): PositionTriggerOrder | undefined;
export declare function adaptMarketFromSDK(sdkMarket: MetaResponse['universe'][number]): MarketInfo;
export declare function adaptAccountStateFromSDK(perpsState: ClearinghouseStateResponse): AccountState;
export declare function buildAssetMapping(params: {
    metaUniverse: MetaResponse['universe'];
    dex?: string | null;
    perpDexIndex: number;
}): {
    symbolToAssetId: Map<string, number>;
    assetIdToSymbol: Map<number, string>;
};
export declare function formatHyperLiquidPrice(params: {
    price: string | number;
    szDecimals: number;
}): string;
export declare function formatHyperLiquidSize(params: {
    size: string | number;
    szDecimals: number;
}): string;
export declare function calculatePositionSize(params: {
    usdValue: number;
    leverage: number;
    assetPrice: number;
}): number;
export declare function calculateHip3AssetId(perpDexIndex: number, indexInMeta: number): number;
export declare function parseAssetName(assetName: string): {
    dex: string | null;
    symbol: string;
};
export declare function adaptHyperLiquidLedgerUpdateToUserHistoryItem(rawLedgerUpdates: RawLedgerUpdate[]): UserHistoryItem[];
//# sourceMappingURL=hyperLiquidAdapter.d.cts.map
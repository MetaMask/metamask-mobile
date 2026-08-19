/**
 * MYX SDK Adapter Utilities
 *
 * Adapters for transforming between MetaMask Perps API types and MYX SDK types.
 * Includes adapters for market display, positions, orders, account state, and fills.
 *
 * Portable: no mobile-specific imports.
 * Formatters are injected via MarketDataFormatters interface (same pattern as marketDataTransform.ts).
 *
 * Key differences from HyperLiquid:
 * - API prices are normal floats (SDK contract layer uses 30 decimals internally)
 * - Sizes use 18 decimals (vs HyperLiquid's szDecimals per asset)
 * - Multiple pools can exist per symbol (MPM model)
 * - USDT collateral (vs USDC)
 */
import type { AccountState, CandleStick, Funding, MarketInfo, Order, OrderFill, PerpsMarketData, Position, MarketDataFormatters, UserHistoryItem } from "../types/index.mjs";
import type { MYXPoolSymbol, MYXTicker, MYXPositionType, MYXHistoryOrderItem, MYXTradeFlowItem, MYXKlineData, MYXKlineWsData } from "../types/myx-types.mjs";
/**
 * Transform MYX Pool/Market info to MetaMask Perps API MarketInfo format
 *
 * @param pool - Pool symbol data from MYX SDK (PoolSymbolAllResponse)
 * @returns MetaMask Perps API market info object
 */
export declare function adaptMarketFromMYX(pool: MYXPoolSymbol): MarketInfo;
/**
 * Convert MYX ticker data to price and change values
 *
 * @param ticker - Ticker data from MYX SDK
 * @returns Object with price string and 24h change percentage
 */
export declare function adaptPriceFromMYX(ticker: MYXTicker): {
    price: string;
    change24h: number;
};
/**
 * Transform MYX pool and ticker to PerpsMarketData for UI display
 *
 * @param pool - Pool symbol data from MYX SDK
 * @param ticker - Optional ticker data for price info
 * @param formatters - Injectable formatters for platform-agnostic formatting
 * @returns Formatted market data for UI display
 */
export declare function adaptMarketDataFromMYX(pool: MYXPoolSymbol, ticker: MYXTicker | undefined, formatters: MarketDataFormatters): PerpsMarketData;
/**
 * Filter MYX markets to only include MYX-exclusive markets
 * Removes markets that overlap with HyperLiquid
 *
 * @param pools - Array of MYX pool symbols
 * @returns Filtered array with only MYX-exclusive markets
 */
export declare function filterMYXExclusiveMarkets(pools: MYXPoolSymbol[]): MYXPoolSymbol[];
/**
 * Check if a symbol overlaps with HyperLiquid markets
 *
 * @param symbol - Market symbol to check
 * @returns true if the symbol is available on both MYX and HyperLiquid
 */
export declare function isOverlappingMarket(symbol: string): boolean;
/**
 * Build a map of poolId to symbol for quick lookup
 *
 * @param pools - Array of MYX pool symbols
 * @returns Map of poolId to symbol
 */
export declare function buildPoolSymbolMap(pools: MYXPoolSymbol[]): Map<string, string>;
/**
 * Build a map of symbol to poolIds (for multi-pool support)
 *
 * @param pools - Array of MYX pool symbols
 * @returns Map of symbol to array of poolIds
 */
export declare function buildSymbolPoolsMap(pools: MYXPoolSymbol[]): Map<string, string[]>;
/**
 * Extract symbol from pool ID
 * Pool IDs typically contain the symbol as a suffix or can be parsed.
 * When baseSymbol is unavailable, returns a truncated address for UI display.
 *
 * @param poolId - MYX pool ID string
 * @returns Extracted symbol or truncated poolId as fallback
 */
export declare function extractSymbolFromPoolId(poolId: string): string;
/**
 * Adapt MYX SDK PositionType to MetaMask Position
 *
 * @param pos - MYX position from SDK
 * @param poolSymbolMap - Map of poolId to symbol
 * @returns MetaMask Position object
 */
export declare function adaptPositionFromMYX(pos: MYXPositionType, poolSymbolMap: Map<string, string>): Position;
/**
 * Adapt MYX SDK open order (PositionType-shaped from getOrders) to MetaMask Order.
 * Note: getOrders returns PositionType[] per the SDK types.
 * For richer order data, use getOrderHistory.
 *
 * @param historyOrder - MYX history order item
 * @param poolSymbolMap - Map of poolId to symbol
 * @returns MetaMask Order object
 */
export declare function adaptOrderFromMYX(historyOrder: MYXHistoryOrderItem, poolSymbolMap: Map<string, string>): Order;
/**
 * Adapt MYX account info response to MetaMask AccountState.
 *
 * @param accountInfo - Raw account info from MYX SDK
 * @param walletBalance - Wallet USDT balance (from getWalletQuoteTokenBalance)
 * @returns MetaMask AccountState
 */
export declare function adaptAccountStateFromMYX(accountInfo: Record<string, unknown> | undefined, walletBalance?: string): AccountState;
/**
 * Adapt MYX history order item (filled) to MetaMask OrderFill
 *
 * @param order - MYX history order item
 * @param poolSymbolMap - Map of poolId to symbol
 * @returns MetaMask OrderFill
 */
export declare function adaptOrderFillFromMYX(order: MYXHistoryOrderItem, poolSymbolMap: Map<string, string>): OrderFill;
/**
 * Adapt MYX trade flow items (funding type) to MetaMask Funding
 *
 * @param flows - MYX trade flow items filtered to funding type
 * @param poolSymbolMap - Map of poolId to symbol
 * @returns Array of MetaMask Funding objects
 */
export declare function adaptFundingFromMYX(flows: MYXTradeFlowItem[], poolSymbolMap: Map<string, string>): Funding[];
/**
 * Adapt MYX trade flow items to MetaMask UserHistoryItem
 *
 * @param flows - MYX trade flow items
 * @returns Array of UserHistoryItem
 */
export declare function adaptUserHistoryFromMYX(flows: MYXTradeFlowItem[]): UserHistoryItem[];
/**
 * Adapt MYX KlineDataItemType to MetaMask CandleStick.
 * KlineDataItemType fields (time, open, close, high, low) are already
 * human-readable strings — no 30-decimal conversion needed.
 *
 * @param item - MYX kline data item from SDK
 * @returns MetaMask CandleStick object
 */
export declare function adaptCandleFromMYX(item: MYXKlineData): CandleStick;
/**
 * Adapt MYX WebSocket KlineData to MetaMask CandleStick.
 * WS KlineData uses single-letter fields: {t, o, h, l, c, v}.
 *
 * @param data - MYX WebSocket kline data
 * @returns MetaMask CandleStick object
 */
export declare function adaptCandleFromMYXWebSocket(data: MYXKlineWsData): CandleStick;
/**
 * Convert a CandlePeriod string to MYX KlineResolution.
 *
 * @param period - CandlePeriod value (e.g., '1m', '3m', '1h')
 * @returns MYX KlineResolution string
 */
export declare function toMYXKlineResolution(period: string): string;
/**
 * Assert MYX API response is successful.
 * MYX uses code 9200 or 0 for success.
 *
 * @param response - MYX API response with code field
 * @param response.code - Response code (9200 or 0 = success)
 * @param response.message - Optional error message
 * @param context - Context string for error messages
 */
export declare function assertMYXSuccess(response: {
    code: number;
    message?: string | null;
}, context: string): void;
//# sourceMappingURL=myxAdapter.d.mts.map